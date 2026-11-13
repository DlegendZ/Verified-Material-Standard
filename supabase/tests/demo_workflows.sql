-- Run on a disposable test database with migrations 0001–0005 applied.
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'qa-factory-one@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'qa-factory-two@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'qa-grader@example.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'qa-admin@example.invalid');
update public.profiles set role = 'grader', grader_available = false where id = '10000000-0000-4000-8000-000000000003';
update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000004';

insert into public.factories (id, owner_id, legal_name, address, city, contact_person, contact_phone, verification_status) values
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','QA Wood Factory','Private address','Jepara','Private contact','Private phone','verified'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','QA Other Factory','Private address','Jepara','Private contact','Private phone','pending');
insert into public.material_categories (id, code, name, status, is_active) values
  ('30000000-0000-4000-8000-000000000001','qa_wood','QA Kayu','live',true);
insert into public.batches (id, factory_id, category_id, batch_code, claimed_weight_kg, status)
select ('40000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       case when n in (2, 8) then '20000000-0000-4000-8000-000000000002' else '20000000-0000-4000-8000-000000000001' end::uuid,
       '30000000-0000-4000-8000-000000000001', 'QA-BATCH-' || n, 50,
       case when n in (1, 2) then 'draft' when n = 3 then 'submitted' else 'certified' end::public.batch_status
from generate_series(1, 8) n;

insert into public.grading_results (batch_id, purity_score, cleanliness_score, consistency_score, quantity_score, documentation_score, final_score, grade, breakdown_json, scoring_version, submitted_by)
select id, 95, 95, 95, 95, 95, 95, 'A', '{}', '2.0.0', '10000000-0000-4000-8000-000000000003'
from public.batches where batch_code like 'QA-BATCH-%' and status = 'certified';
insert into public.certificates (batch_id, grading_result_id, certificate_code, issued_by, valid_until, status)
select b.id, g.id, 'VMS-2611-QATEST' || chr(65 + right(b.batch_code, 1)::int) || 'Z', '10000000-0000-4000-8000-000000000004',
       now() + case when b.batch_code = 'QA-BATCH-5' then '-1 day'::interval else '1 day'::interval end,
       case when b.batch_code = 'QA-BATCH-6' then 'revoked' when b.batch_code = 'QA-BATCH-7' then 'superseded' else 'issued' end::public.certificate_status
from public.batches b join public.grading_results g on b.id = g.batch_id where b.batch_code like 'QA-BATCH-%';

update storage.buckets set allowed_mime_types = array['image/png', 'application/pdf'] where id = 'batch-documents';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
insert into storage.objects (bucket_id, name) values ('batch-documents', '40000000-0000-4000-8000-000000000001/proof.pdf');
insert into public.batch_documents (batch_id, kind, file_path) values
 ('40000000-0000-4000-8000-000000000001','origin_doc','40000000-0000-4000-8000-000000000001/proof.pdf');
do $$ begin
  if public.delete_factory_draft('40000000-0000-4000-8000-000000000002') is not null then raise exception 'Deleted another factory draft'; end if;
  if public.delete_factory_draft('40000000-0000-4000-8000-000000000003') is not null then raise exception 'Deleted submitted batch'; end if;
  update public.batches set status = 'draft' where id = '40000000-0000-4000-8000-000000000003';
  if found then raise exception 'Submitted batch reverted to draft'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists (select from storage.objects where name = '40000000-0000-4000-8000-000000000001/proof.pdf') then raise exception 'Other factory can read private PDF'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ declare files jsonb; begin
  files := public.delete_factory_draft('40000000-0000-4000-8000-000000000001');
  if files is null or jsonb_array_length(files->'documents') <> 1 then raise exception 'Draft file manifest missing'; end if;
  if exists (select from public.batches where id = '40000000-0000-4000-8000-000000000001') then raise exception 'Draft still exists'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin
  begin
    update public.profiles set grader_available = true where id = auth.uid();
    raise exception 'Grader changed own availability';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin
  if public.assign_available_grader('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003') then raise exception 'Unavailable grader assigned'; end if;
  update public.profiles set grader_available = true where id = '10000000-0000-4000-8000-000000000003';
  if not public.assign_available_grader('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003') then raise exception 'Available grader not assigned'; end if;
  if public.assign_available_grader('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003') then raise exception 'Duplicate assignment'; end if;
  if not exists (select from public.assignments where batch_id = '40000000-0000-4000-8000-000000000003') then raise exception 'Assignment row missing'; end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare result jsonb; begin
  result := public.public_verified_catalog('QA', 'A');
  if (result->>'total')::int <> 1 or result#>>'{items,0,batch_code}' <> 'QA-BATCH-4' then raise exception 'Wrong active catalog results: %', result; end if;
  if result#>>'{featured,0,grade_a_batches}' <> '1' then raise exception 'Wrong Grade A count: %', result; end if;
  if result::text like '%Private%' or result->'items'->0 ?| array['factory_id','batch_id','contact_phone','address'] then raise exception 'Catalog exposed private fields'; end if;
  if (public.public_verified_catalog('qa', 'B')->>'total')::int <> 0 then raise exception 'Grade filter failed'; end if;
end $$;

rollback;
