alter table public.profiles add column if not exists grader_available boolean not null default true;

-- A profile may be edited by its owner; availability is an Admin decision.
create or replace function public.guard_grader_availability()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.grader_available is distinct from old.grader_available
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change grader availability' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_grader_availability on public.profiles;
create trigger profiles_guard_grader_availability before update of grader_available on public.profiles
for each row execute function public.guard_grader_availability();

create or replace function public.assign_available_grader(p_batch uuid, p_grader uuid)
returns boolean language plpgsql set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign graders' using errcode = '42501';
  end if;

  perform 1 from public.profiles p
  where p.id = p_grader and p.role = 'grader' and p.grader_available
  for share;
  if not found then return false; end if;

  update public.batches set status = 'assigned' where id = p_batch and status = 'submitted';
  if not found then return false; end if;

  insert into public.assignments (batch_id, grader_id, assigned_by)
  values (p_batch, p_grader, auth.uid());
  return true;
end;
$$;
revoke all on function public.assign_available_grader(uuid, uuid) from public;
grant execute on function public.assign_available_grader(uuid, uuid) to authenticated;

-- Prevent a submitted batch from being changed back into a deletable draft by its owner.
drop policy if exists batches_factory_update on public.batches;
create policy batches_factory_update on public.batches for update to authenticated
using (public.auth_role() = 'factory' and factory_id = public.my_factory_id() and status = 'draft')
with check (factory_id = public.my_factory_id() and status in ('draft', 'submitted'));

drop policy if exists batches_factory_insert on public.batches;
create policy batches_factory_insert on public.batches for insert to authenticated
with check (public.auth_role() = 'factory' and factory_id = public.my_factory_id() and status = 'draft');

create or replace function public.delete_factory_draft(p_batch uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  files jsonb;
begin
  if public.auth_role() is distinct from 'factory' then
    raise exception 'Only the factory can delete its draft' using errcode = '42501';
  end if;

  perform 1 from public.batches b
  where b.id = p_batch and b.status = 'draft' and b.factory_id = public.my_factory_id()
  for update;
  if not found then return null; end if;

  select jsonb_build_object(
    'documents', coalesce(jsonb_agg(name) filter (where bucket_id = 'batch-documents'), '[]'::jsonb),
    'photos', coalesce(jsonb_agg(name) filter (where bucket_id = 'batch-photos'), '[]'::jsonb)
  ) into files from storage.objects
    where bucket_id in ('batch-documents', 'batch-photos') and name like p_batch::text || '/%';
  delete from public.batches where id = p_batch;
  if not found then return null; end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'batch.draft_deleted', 'batch', p_batch);
  return files;
end;
$$;
revoke all on function public.delete_factory_draft(uuid) from public;
grant execute on function public.delete_factory_draft(uuid) to authenticated;

-- Keep document access scoped to the batch. Public photos retain their existing access.
create or replace function public.document_batch_id(object_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid end;
$$;

drop policy if exists batch_documents_write on public.batch_documents;
create policy batch_documents_write on public.batch_documents for insert to authenticated
with check (public.is_admin() or (
  public.auth_role() = 'factory' and batch_id = public.document_batch_id(file_path) and exists (
    select 1 from public.batches b where b.id = batch_id and b.factory_id = public.my_factory_id() and b.status = 'draft'
  )
));

drop policy if exists storage_authenticated_read on storage.objects;
create policy storage_authenticated_read on storage.objects for select to authenticated
using (bucket_id in ('batch-photos', 'certificates') or (
  bucket_id = 'batch-documents' and (
    public.owns_batch(public.document_batch_id(name)) or public.is_assigned_grader(public.document_batch_id(name))
  )
));

drop policy if exists storage_authenticated_upload on storage.objects;
create policy storage_authenticated_upload on storage.objects for insert to authenticated
with check (
  (bucket_id = 'batch-documents' and public.auth_role() = 'factory' and exists (
    select 1 from public.batches b where b.id = public.document_batch_id(name)
    and b.factory_id = public.my_factory_id() and b.status = 'draft'
  )) or (bucket_id = 'batch-photos' and exists (
    select 1 from public.batches b where b.id = public.document_batch_id(name) and (
      (b.factory_id = public.my_factory_id() and b.status = 'draft') or
      (public.is_assigned_grader(b.id) and b.status = 'grading')
    )
  ))
);

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
where id = 'batch-documents' and allowed_mime_types is not null
and not coalesce('application/pdf' = any(allowed_mime_types), false);

-- Only data already suitable for the public certificate is returned. Reputation
-- is based on active certificates per batch, never a blanket factory rating.
create or replace function public.public_verified_catalog(p_query text default '', p_grade text default '', p_page integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  with active as (
    select distinct on (b.id)
      c.certificate_code, c.valid_until, b.batch_code, b.claimed_weight_kg, b.declared_material_type,
      f.id as factory_id, f.legal_name as factory_name, f.city, m.code as category_code, m.name as category_name,
      g.grade, g.final_score, b.id as batch_id,
      (select bp.file_path from public.batch_photos bp where bp.batch_id = b.id
        order by bp.sample_point nulls first, bp.uploaded_at, bp.id limit 1) as photo_path
    from public.certificates c
    join public.batches b on b.id = c.batch_id
    join public.factories f on f.id = b.factory_id
    join public.material_categories m on m.id = b.category_id
    join public.grading_results g on g.id = c.grading_result_id and g.batch_id = b.id
    where c.status = 'issued' and c.valid_until > now() and b.status = 'certified'
      and f.verification_status = 'verified' and m.is_active and m.status = 'live'
      and g.grade in ('A', 'B', 'C')
    order by b.id, c.issued_at desc, c.id
  ), filtered as (
    select * from active
    where (coalesce(p_grade, '') = '' or grade::text = p_grade)
      and strpos(lower(concat_ws(' ', category_name, replace(category_code, '_', ' '), declared_material_type, factory_name, city, batch_code, certificate_code)), lower(left(trim(coalesce(p_query, '')), 100))) > 0
  ), featured as (
    select factory_name, city, count(*) as active_batches,
      count(*) filter (where grade = 'A') as grade_a_batches, max(final_score) as best_score
    from active group by factory_id, factory_name, city
    having count(*) filter (where grade = 'A') > 0
    order by grade_a_batches desc, best_score desc, factory_name, city, factory_id limit 5
  ), page as (
    select * from filtered order by final_score desc, valid_until desc, certificate_code
    offset ((greatest(1, least(coalesce(p_page, 1), 10000)) - 1) * 12) limit 12
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce((select jsonb_agg(to_jsonb(page) - 'batch_id' - 'factory_id' order by final_score desc, valid_until desc, certificate_code) from page), '[]'::jsonb),
    'featured', coalesce((select jsonb_agg(to_jsonb(featured) order by grade_a_batches desc, best_score desc, factory_name, city) from featured), '[]'::jsonb)
  );
$$;
revoke all on function public.public_verified_catalog(text, text, integer) from public;
grant execute on function public.public_verified_catalog(text, text, integer) to anon, authenticated;
