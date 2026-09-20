-- =============================================================================
-- VMS — Verified Material Standard
-- Migrasi 0001: skema inti
--
-- Kontrak kolom mengikuti SRD Bab 5.1. Kolom teknis tambahan boleh, tapi kolom
-- di SRD tidak boleh dihapus/diganti nama.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enum
-- -----------------------------------------------------------------------------
create type user_role as enum ('factory', 'grader', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type category_status as enum ('live', 'coming_soon');
create type criterion_type as enum ('purity', 'cleanliness', 'quantity_accuracy');
create type sample_point_name as enum ('top', 'middle', 'bottom');
create type batch_status as enum (
  'draft',
  'submitted',
  'assigned',
  'gate_check',
  'grading',
  'computed',
  'certified',
  'rejected_gate',
  'not_certified'
);
create type assignment_status as enum ('open', 'in_progress', 'submitted');
create type document_kind as enum ('origin_doc', 'lab_test', 'other');
create type grade_letter as enum ('A', 'B', 'C', 'D');
create type certificate_status as enum ('issued', 'revoked', 'superseded');

-- -----------------------------------------------------------------------------
-- profiles — profil pengguna + peran.
-- Peran disimpan di tabel ini (bukan hanya di auth metadata) supaya bisa dipakai
-- langsung oleh policy RLS.
-- -----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'factory',
  phone text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- factories — satu pengguna factory punya satu pabrik (cukup untuk demo).
-- -----------------------------------------------------------------------------
create table factories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles (id) on delete cascade,
  legal_name text not null,
  address text not null,
  city text not null,
  contact_person text not null,
  contact_phone text not null,
  verification_status verification_status not null default 'pending',
  verified_by uuid references profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- material_categories + category_criteria — konfigurasi kategori sebagai DATA.
-- Menambah kategori = menambah baris, bukan mengubah kode (SRD Bab 4.3).
-- -----------------------------------------------------------------------------
create table material_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  status category_status not null default 'live',
  notes text,
  created_at timestamptz not null default now()
);

create table category_criteria (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references material_categories (id) on delete cascade,
  criterion criterion_type not null,
  sub_key text not null,
  label text not null,
  weight_pct numeric(6, 2) not null check (weight_pct >= 0 and weight_pct <= 100),
  is_odor boolean not null default false,
  odor_override_cap integer check (odor_override_cap between 0 and 100),
  sort_order integer not null default 0,
  unique (category_id, criterion, sub_key)
);

create index category_criteria_category_idx on category_criteria (category_id);

-- Menjaga aturan integritas SRD Bab 5.3: jumlah bobot per kriteria wajib 100.
-- Dipasang sebagai constraint trigger deferrable supaya satu transaksi boleh
-- mengubah beberapa baris sekaligus (mis. tukar bobot 70/30 → 60/40).
create or replace function assert_criteria_weight_sum()
returns trigger
language plpgsql
as $$
declare
  target_category uuid;
  target_criterion criterion_type;
  total numeric;
begin
  target_category := coalesce(new.category_id, old.category_id);
  target_criterion := coalesce(new.criterion, old.criterion);

  select coalesce(sum(weight_pct), 0)
    into total
    from category_criteria
   where category_id = target_category
     and criterion = target_criterion;

  -- 0 berarti seluruh baris kriteria itu dihapus; itu sah saat menghapus kategori.
  if total <> 0 and total <> 100 then
    raise exception 'Jumlah bobot % untuk kategori % = %, wajib 100',
      target_criterion, target_category, total;
  end if;

  return null;
end;
$$;

create constraint trigger category_criteria_weight_sum
after insert or update or delete on category_criteria
deferrable initially deferred
for each row execute function assert_criteria_weight_sum();

-- -----------------------------------------------------------------------------
-- batches — pengajuan batch oleh pabrik.
-- -----------------------------------------------------------------------------
create table batches (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references factories (id) on delete cascade,
  category_id uuid not null references material_categories (id),
  batch_code text not null unique,
  claimed_weight_kg numeric(10, 2) not null check (claimed_weight_kg > 0),
  claimed_spec text,
  production_date date,
  lot_number text,
  description text,
  status batch_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index batches_factory_idx on batches (factory_id);
create index batches_status_idx on batches (status);

create table batch_documents (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  kind document_kind not null default 'origin_doc',
  file_path text not null,
  uploaded_at timestamptz not null default now()
);

create index batch_documents_batch_idx on batch_documents (batch_id);

create table batch_photos (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  -- null = foto batch umum; terisi = foto titik sampel tertentu
  sample_point sample_point_name,
  file_path text not null,
  angle_label text,
  uploaded_at timestamptz not null default now()
);

create index batch_photos_batch_idx on batch_photos (batch_id);

-- -----------------------------------------------------------------------------
-- assignments — penugasan grader oleh admin.
-- -----------------------------------------------------------------------------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  grader_id uuid not null references profiles (id),
  assigned_by uuid not null references profiles (id),
  assigned_at timestamptz not null default now(),
  status assignment_status not null default 'open',
  unique (batch_id, grader_id)
);

create index assignments_grader_idx on assignments (grader_id);

-- -----------------------------------------------------------------------------
-- gate_checks — 3 gerbang wajib. Gagal salah satu = proses berhenti total.
-- -----------------------------------------------------------------------------
create table gate_checks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references batches (id) on delete cascade,
  non_b3_pass boolean not null,
  origin_exists_pass boolean not null,
  origin_authentic_pass boolean not null,
  notes text,
  checked_by uuid not null references profiles (id),
  checked_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- sample_points + sample_scores — input grader per titik.
-- Satu batch = tepat 3 baris sample_points (divalidasi di Server Action &
-- scoring engine; constraint DB hanya menjamin keunikan titik).
-- -----------------------------------------------------------------------------
create table sample_points (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  point sample_point_name not null,
  odor_level smallint not null check (odor_level between 1 and 3),
  notes text,
  unique (batch_id, point)
);

create table sample_scores (
  id uuid primary key default gen_random_uuid(),
  sample_point_id uuid not null references sample_points (id) on delete cascade,
  criterion criterion_type not null,
  sub_key text not null,
  raw_score numeric(6, 2) not null check (raw_score >= 0 and raw_score <= 100),
  unique (sample_point_id, criterion, sub_key)
);

-- -----------------------------------------------------------------------------
-- quantity_checks & documentation_checks — Langkah 6 & 7.
-- -----------------------------------------------------------------------------
create table quantity_checks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references batches (id) on delete cascade,
  actual_weight_kg numeric(10, 2) not null check (actual_weight_kg >= 0),
  spec_match_pct numeric(5, 2) not null check (spec_match_pct between 0 and 100),
  notes text
);

create table documentation_checks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references batches (id) on delete cascade,
  has_production_date boolean not null default false,
  has_multi_angle_photos boolean not null default false,
  has_lot_number boolean not null default false,
  has_lab_test boolean not null default false
);

-- -----------------------------------------------------------------------------
-- grading_results — snapshot hasil hitung. APPEND-ONLY per batch: regrading
-- membuat baris baru, tidak menimpa (SRD Bab 5.3).
-- -----------------------------------------------------------------------------
create table grading_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  purity_score numeric(6, 3) not null,
  cleanliness_score numeric(6, 3) not null,
  consistency_score numeric(6, 3) not null,
  quantity_score numeric(6, 3) not null,
  documentation_score numeric(6, 3) not null,
  final_score integer not null check (final_score between 0 and 100),
  grade grade_letter not null,
  breakdown_json jsonb not null,
  scoring_version text not null,
  computed_at timestamptz not null default now(),
  submitted_by uuid not null references profiles (id)
);

create index grading_results_batch_idx on grading_results (batch_id, computed_at desc);

-- Blokir UPDATE/DELETE: hasil grading immutable setelah ditulis.
create or replace function block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Tabel % bersifat append-only; buat baris baru, jangan ubah/hapus baris lama', tg_table_name;
end;
$$;

create trigger grading_results_immutable
before update or delete on grading_results
for each row execute function block_mutation();

-- -----------------------------------------------------------------------------
-- certificates — certificate_code adalah yang muncul di URL publik.
-- Format: VMS-<YY><MM>-<8 karakter base32 acak>, contoh VMS-2609-K7M2QX4A.
-- -----------------------------------------------------------------------------
create table certificates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  grading_result_id uuid not null references grading_results (id),
  certificate_code text not null unique
    check (certificate_code ~ '^VMS-[0-9]{4}-[A-Z2-7]{8}$'),
  issued_by uuid not null references profiles (id),
  issued_at timestamptz not null default now(),
  valid_until timestamptz not null,
  status certificate_status not null default 'issued',
  revoke_reason text,
  qr_path text,
  pdf_path text
);

create index certificates_batch_idx on certificates (batch_id);

-- -----------------------------------------------------------------------------
-- audit_logs — jejak audit semua aksi penting.
-- -----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Slot data modul sengketa & reverifikasi (SRD Bab 2.2 / keputusan D3):
-- struktur disiapkan, UI-nya TIDAK dibangun di demo ini.
-- -----------------------------------------------------------------------------
create table dispute_requests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches (id) on delete cascade,
  requested_by uuid not null references profiles (id),
  reason text not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

-- -----------------------------------------------------------------------------
-- updated_at otomatis untuk batches
-- -----------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger batches_touch_updated_at
before update on batches
for each row execute function touch_updated_at();

-- -----------------------------------------------------------------------------
-- Profil otomatis saat user baru mendaftar. Peran default 'factory';
-- grader/admin dibuat lewat seed atau oleh Admin (keputusan D4).
-- -----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'factory',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
