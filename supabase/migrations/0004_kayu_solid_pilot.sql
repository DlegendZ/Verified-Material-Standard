-- VMS v1.3 — profil sampling Kayu Solid et metadata kategori (GS §3–4, §7, §11–14).
-- Tidak menghapus/mengganti kolom lama: sertifikat dan breakdown v1 tetap terbaca.
-- Gate Non-B3 tetap di alur aplikasi; P12/A35 tidak mengubah rumus atau skema gate.
do $$ begin create type scoring_method as enum ('scale', 'unit_count');
exception when duplicate_object then null; end $$;
do $$ begin create type measurement_method as enum ('moisture_meter', 'touch_estimate');
exception when duplicate_object then null; end $$;
do $$ begin create type claim_mode as enum ('bundle', 'weight');
exception when duplicate_object then null; end $$;

alter table material_categories
  add column if not exists sort_order integer not null default 0,
  add column if not exists short_description text,
  add column if not exists certificate_validity_days integer check (certificate_validity_days is null or certificate_validity_days > 0),
  add column if not exists grade_meanings jsonb,
  add column if not exists odor_level3_hint text,
  add column if not exists non_b3_extra text,
  add column if not exists claim_boundary text,
  add column if not exists threshold_disclaimer text;
alter table category_criteria
  add column if not exists scoring_method scoring_method not null default 'scale',
  add column if not exists requires_measurement_method boolean not null default false,
  add column if not exists help_text text;
create table if not exists material_form_profiles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references material_categories (id) on delete cascade,
  code text not null, name text not null, description text,
  point_definition text not null, unit_label text not null,
  units_per_point integer not null check (units_per_point > 0),
  sampling_notes text, claim_mode claim_mode not null default 'weight',
  sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), unique (category_id, code)
);
create index if not exists material_form_profiles_category_idx on material_form_profiles (category_id);
alter table batches
  add column if not exists form_profile_id uuid references material_form_profiles (id),
  add column if not exists declared_material_type text,
  add column if not exists claimed_spec_detail jsonb,
  add column if not exists intake_declarations jsonb;
alter table sample_scores
  add column if not exists units_checked integer,
  add column if not exists units_passed integer,
  add column if not exists measurement_method measurement_method;
alter table sample_scores drop constraint if exists sample_scores_units_valid;
alter table sample_scores add constraint sample_scores_units_valid check (
  (units_checked is null and units_passed is null) or
  (units_checked is not null and units_passed is not null and units_checked > 0 and units_passed >= 0 and units_passed <= units_checked)
);
alter table quantity_checks
  add column if not exists count_checks jsonb not null default '[]'::jsonb,
  add column if not exists spec_units_checked integer,
  add column if not exists spec_units_passed integer,
  add column if not exists weighing_moisture_note text;
alter table quantity_checks drop constraint if exists quantity_checks_spec_units_valid;
alter table quantity_checks add constraint quantity_checks_spec_units_valid check (
  (spec_units_checked is null and spec_units_passed is null) or
  (spec_units_checked is not null and spec_units_passed is not null and spec_units_checked > 0 and spec_units_passed >= 0 and spec_units_passed <= spec_units_checked)
);

-- FK kategori–profil, tanpa merusak batch lama yang profilnya NULL.
create or replace function assert_batch_profile_category()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.form_profile_id is not null and not exists (
    select 1 from material_form_profiles p where p.id = new.form_profile_id and p.category_id = new.category_id
  ) then raise exception 'Profil bentuk tidak sesuai dengan kategori batch'; end if;
  return new;
end;
$$;
drop trigger if exists batches_profile_category on batches;
create trigger batches_profile_category before insert or update of form_profile_id, category_id on batches
for each row execute function assert_batch_profile_category();
alter table material_form_profiles enable row level security;
drop policy if exists form_profiles_read on material_form_profiles;
create policy form_profiles_read on material_form_profiles for select to authenticated using (true);
drop policy if exists form_profiles_admin_write on material_form_profiles;
create policy form_profiles_admin_write on material_form_profiles for all to authenticated using (is_admin()) with check (is_admin());

-- Payload publik dibatasi lewat fungsi SECURITY DEFINER, tanpa policy SELECT anon.
create or replace function public_certificate(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'certificate_code', c.certificate_code, 'status', c.status,
    'issued_at', c.issued_at, 'valid_until', c.valid_until,
    'revoke_reason', c.revoke_reason, 'qr_path', c.qr_path, 'pdf_path', c.pdf_path,
    'grade', g.grade, 'final_score', g.final_score,
    'purity_score', g.purity_score, 'cleanliness_score', g.cleanliness_score,
    'consistency_score', g.consistency_score, 'quantity_score', g.quantity_score,
    'documentation_score', g.documentation_score, 'breakdown', g.breakdown_json,
    'scoring_version', g.scoring_version, 'sampled_at', g.computed_at,
    'batch', jsonb_build_object(
      'batch_code', b.batch_code, 'claimed_weight_kg', b.claimed_weight_kg,
      'claimed_spec', b.claimed_spec, 'lot_number', b.lot_number, 'production_date', b.production_date,
      'declared_material_type', b.declared_material_type,
      'form_profile', case when p.id is null then null else jsonb_build_object('code', p.code, 'name', p.name, 'unit_label', p.unit_label) end
    ),
    'factory', jsonb_build_object('legal_name', f.legal_name, 'city', f.city),
    'category', jsonb_build_object('code', m.code, 'name', m.name,
      'grade_meanings', m.grade_meanings, 'claim_boundary', m.claim_boundary,
      'threshold_disclaimer', m.threshold_disclaimer, 'certificate_validity_days', m.certificate_validity_days),
    'photos', coalesce((select jsonb_agg(jsonb_build_object('file_path', bp.file_path, 'sample_point', bp.sample_point, 'angle_label', bp.angle_label) order by bp.sample_point nulls first, bp.uploaded_at) from batch_photos bp where bp.batch_id = b.id), '[]'::jsonb)
  ) into result
  from certificates c
  join grading_results g on g.id = c.grading_result_id
  join batches b on b.id = c.batch_id
  join factories f on f.id = b.factory_id
  join material_categories m on m.id = b.category_id
  left join material_form_profiles p on p.id = b.form_profile_id
  where upper(c.certificate_code) = upper(p_code);
  return result;
end;
$$;
revoke all on function public_certificate(text) from public;
grant execute on function public_certificate(text) to anon, authenticated;

create or replace function public_categories()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', m.code, 'name', m.name, 'status', m.status,
    'short_description', m.short_description,
    'certificate_validity_days', m.certificate_validity_days, 'grade_meanings', m.grade_meanings,
    'profiles', coalesce((select jsonb_agg(jsonb_build_object('code', p.code, 'name', p.name, 'description', p.description) order by p.sort_order) from material_form_profiles p where p.category_id = m.id and p.is_active), '[]'::jsonb)
  ) order by m.sort_order, m.name), '[]'::jsonb)
  from material_categories m where m.is_active;
$$;
revoke all on function public_categories() from public;
grant execute on function public_categories() to anon, authenticated;
