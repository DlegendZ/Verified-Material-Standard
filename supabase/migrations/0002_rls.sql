-- =============================================================================
-- Migrasi 0002: Row Level Security + akses publik terkontrol
--
-- Prinsip (SRD Bab 4.3 & 11):
--  - RLS adalah LAPISAN KEDUA; validasi peran tetap wajib di setiap Server Action
--  - publik (anon) TIDAK diberi policy SELECT ke tabel mana pun. Halaman
--    verifikasi publik membaca lewat fungsi security definer di bawah yang
--    mengembalikan persis field yang boleh tampil — data kontak pemilik pabrik,
--    email pengguna, dan dokumen asal-usul tidak pernah ikut.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper
-- -----------------------------------------------------------------------------
create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role() = 'admin', false);
$$;

create or replace function my_factory_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.factories where owner_id = auth.uid();
$$;

-- true bila batch ini sedang ditugaskan ke grader yang sedang login
create or replace function is_assigned_grader(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments
     where batch_id = target_batch
       and grader_id = auth.uid()
  );
$$;

-- true bila batch ini milik pabrik yang dimiliki user yang sedang login
create or replace function owns_batch(target_batch uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.batches b
      join public.factories f on f.id = b.factory_id
     where b.id = target_batch
       and f.owner_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Aktifkan RLS di semua tabel
-- -----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table factories enable row level security;
alter table material_categories enable row level security;
alter table category_criteria enable row level security;
alter table batches enable row level security;
alter table batch_documents enable row level security;
alter table batch_photos enable row level security;
alter table assignments enable row level security;
alter table gate_checks enable row level security;
alter table sample_points enable row level security;
alter table sample_scores enable row level security;
alter table quantity_checks enable row level security;
alter table documentation_checks enable row level security;
alter table grading_results enable row level security;
alter table certificates enable row level security;
alter table audit_logs enable row level security;
alter table dispute_requests enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select_self on profiles
  for select to authenticated
  using (id = auth.uid() or is_admin());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = auth_role());

create policy profiles_admin_all on profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- factories
-- -----------------------------------------------------------------------------
create policy factories_owner_read on factories
  for select to authenticated
  using (owner_id = auth.uid() or is_admin() or auth_role() = 'grader');

create policy factories_owner_insert on factories
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Pabrik boleh mengubah datanya sendiri. Kunci kolom status verifikasi dijaga
-- trigger di bawah, bukan di WITH CHECK, supaya policy tidak perlu membaca
-- ulang tabel yang sedang di-RLS.
create policy factories_owner_update on factories
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Hanya Admin yang boleh menggeser status verifikasi pabrik.
create or replace function guard_factory_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status and not is_admin() then
    raise exception 'Hanya Admin yang boleh mengubah status verifikasi pabrik';
  end if;
  return new;
end;
$$;

create trigger factories_guard_verification
before update on factories
for each row execute function guard_factory_verification();

create policy factories_admin_all on factories
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- -----------------------------------------------------------------------------
-- Konfigurasi kategori: semua pengguna login boleh baca, hanya admin boleh tulis
-- -----------------------------------------------------------------------------
create policy categories_read on material_categories
  for select to authenticated using (true);

create policy categories_admin_write on material_categories
  for all to authenticated using (is_admin()) with check (is_admin());

create policy criteria_read on category_criteria
  for select to authenticated using (true);

create policy criteria_admin_write on category_criteria
  for all to authenticated using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- batches — pabrik hanya miliknya, grader hanya yang ditugaskan, admin semua
-- -----------------------------------------------------------------------------
create policy batches_read on batches
  for select to authenticated
  using (factory_id = my_factory_id() or is_assigned_grader(id) or is_admin());

create policy batches_factory_insert on batches
  for insert to authenticated
  with check (factory_id = my_factory_id());

create policy batches_factory_update on batches
  for update to authenticated
  using (factory_id = my_factory_id() and status in ('draft', 'submitted'))
  with check (factory_id = my_factory_id());

create policy batches_staff_update on batches
  for update to authenticated
  using (is_admin() or is_assigned_grader(id))
  with check (is_admin() or is_assigned_grader(id));

create policy batches_admin_all on batches
  for all to authenticated using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- Lampiran batch
-- -----------------------------------------------------------------------------
create policy batch_documents_read on batch_documents
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy batch_documents_write on batch_documents
  for all to authenticated
  using (owns_batch(batch_id) or is_admin())
  with check (owns_batch(batch_id) or is_admin());

create policy batch_photos_read on batch_photos
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy batch_photos_write on batch_photos
  for all to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin())
  with check (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

-- -----------------------------------------------------------------------------
-- assignments
-- -----------------------------------------------------------------------------
create policy assignments_read on assignments
  for select to authenticated
  using (grader_id = auth.uid() or owns_batch(batch_id) or is_admin());

create policy assignments_grader_update on assignments
  for update to authenticated
  using (grader_id = auth.uid())
  with check (grader_id = auth.uid());

create policy assignments_admin_all on assignments
  for all to authenticated using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- Input grading: ditulis grader yang ditugaskan, dibaca pemilik batch & admin
-- -----------------------------------------------------------------------------
create policy gate_checks_read on gate_checks
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy gate_checks_write on gate_checks
  for all to authenticated
  using (is_assigned_grader(batch_id) or is_admin())
  with check (is_assigned_grader(batch_id) or is_admin());

create policy sample_points_read on sample_points
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy sample_points_write on sample_points
  for all to authenticated
  using (is_assigned_grader(batch_id) or is_admin())
  with check (is_assigned_grader(batch_id) or is_admin());

create policy sample_scores_read on sample_scores
  for select to authenticated
  using (
    exists (
      select 1 from sample_points sp
       where sp.id = sample_scores.sample_point_id
         and (owns_batch(sp.batch_id) or is_assigned_grader(sp.batch_id) or is_admin())
    )
  );

create policy sample_scores_write on sample_scores
  for all to authenticated
  using (
    exists (
      select 1 from sample_points sp
       where sp.id = sample_scores.sample_point_id
         and (is_assigned_grader(sp.batch_id) or is_admin())
    )
  )
  with check (
    exists (
      select 1 from sample_points sp
       where sp.id = sample_scores.sample_point_id
         and (is_assigned_grader(sp.batch_id) or is_admin())
    )
  );

create policy quantity_checks_read on quantity_checks
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy quantity_checks_write on quantity_checks
  for all to authenticated
  using (is_assigned_grader(batch_id) or is_admin())
  with check (is_assigned_grader(batch_id) or is_admin());

create policy documentation_checks_read on documentation_checks
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy documentation_checks_write on documentation_checks
  for all to authenticated
  using (is_assigned_grader(batch_id) or is_admin())
  with check (is_assigned_grader(batch_id) or is_admin());

-- -----------------------------------------------------------------------------
-- grading_results — insert oleh grader/admin, tidak ada update/delete
-- (sudah diblokir trigger di migrasi 0001)
-- -----------------------------------------------------------------------------
create policy grading_results_read on grading_results
  for select to authenticated
  using (owns_batch(batch_id) or is_assigned_grader(batch_id) or is_admin());

create policy grading_results_insert on grading_results
  for insert to authenticated
  with check (is_assigned_grader(batch_id) or is_admin());

-- -----------------------------------------------------------------------------
-- certificates — hanya Admin yang menerbitkan & mencabut
-- -----------------------------------------------------------------------------
create policy certificates_read on certificates
  for select to authenticated
  using (owns_batch(batch_id) or is_admin());

create policy certificates_admin_write on certificates
  for all to authenticated using (is_admin()) with check (is_admin());

-- -----------------------------------------------------------------------------
-- audit_logs — hanya admin yang membaca; penulisan lewat Server Action
-- -----------------------------------------------------------------------------
create policy audit_logs_admin_read on audit_logs
  for select to authenticated using (is_admin());

create policy audit_logs_insert on audit_logs
  for insert to authenticated with check (actor_id = auth.uid());

-- -----------------------------------------------------------------------------
-- dispute_requests — slot data; dibaca pemilik batch & admin
-- -----------------------------------------------------------------------------
create policy dispute_requests_read on dispute_requests
  for select to authenticated
  using (owns_batch(batch_id) or is_admin());

create policy dispute_requests_admin_write on dispute_requests
  for all to authenticated using (is_admin()) with check (is_admin());

-- =============================================================================
-- Verifikasi publik
--
-- Satu fungsi security definer yang mengembalikan persis payload publik.
-- Tidak ada policy anon ke tabel mana pun, jadi tidak mungkin ada kebocoran
-- kolom lain lewat PostgREST.
-- =============================================================================
create or replace function public_certificate(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'certificate_code', c.certificate_code,
    'status', c.status,
    'issued_at', c.issued_at,
    'valid_until', c.valid_until,
    'revoke_reason', c.revoke_reason,
    'qr_path', c.qr_path,
    'pdf_path', c.pdf_path,
    'grade', g.grade,
    'final_score', g.final_score,
    'purity_score', g.purity_score,
    'cleanliness_score', g.cleanliness_score,
    'consistency_score', g.consistency_score,
    'quantity_score', g.quantity_score,
    'documentation_score', g.documentation_score,
    'breakdown', g.breakdown_json,
    'scoring_version', g.scoring_version,
    'sampled_at', g.computed_at,
    'batch', jsonb_build_object(
      'batch_code', b.batch_code,
      'claimed_weight_kg', b.claimed_weight_kg,
      'claimed_spec', b.claimed_spec,
      'lot_number', b.lot_number,
      'production_date', b.production_date
    ),
    -- sengaja hanya nama & kota: tanpa alamat lengkap, kontak, atau email
    'factory', jsonb_build_object('legal_name', f.legal_name, 'city', f.city),
    'category', jsonb_build_object('code', m.code, 'name', m.name),
    'photos', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'file_path', p.file_path,
                   'sample_point', p.sample_point,
                   'angle_label', p.angle_label
                 )
                 order by p.sample_point nulls first, p.uploaded_at
               )
          from batch_photos p
         where p.batch_id = b.id
      ),
      '[]'::jsonb
    )
  )
    into result
    from certificates c
    join grading_results g on g.id = c.grading_result_id
    join batches b on b.id = c.batch_id
    join factories f on f.id = b.factory_id
    join material_categories m on m.id = b.category_id
   where upper(c.certificate_code) = upper(p_code);

  return result;
end;
$$;

grant execute on function public_certificate(text) to anon, authenticated;

-- =============================================================================
-- Storage buckets
--
-- batch-photos & certificates publik: keduanya tampil di halaman verifikasi
-- publik yang memang dibuka tanpa login.
-- batch-documents privat: dokumen asal-usul tidak boleh bocor ke publik
-- (SRD Bab 9.2), diakses staf lewat signed URL.
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('batch-photos', 'batch-photos', true),
  ('batch-documents', 'batch-documents', false),
  ('certificates', 'certificates', true)
on conflict (id) do nothing;

create policy storage_authenticated_upload on storage.objects
  for insert to authenticated
  with check (bucket_id in ('batch-photos', 'batch-documents', 'certificates'));

create policy storage_authenticated_read on storage.objects
  for select to authenticated
  using (bucket_id in ('batch-photos', 'batch-documents', 'certificates'));

create policy storage_admin_manage on storage.objects
  for all to authenticated
  using (is_admin() and bucket_id in ('batch-photos', 'batch-documents', 'certificates'))
  with check (is_admin() and bucket_id in ('batch-photos', 'batch-documents', 'certificates'));
