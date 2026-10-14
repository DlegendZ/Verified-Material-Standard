-- =============================================================================
-- VMS — seed data referensi
--
-- Isi file ini: akun demo, pabrik demo, dan SELURUH konfigurasi kategori
-- material (SRD Bab 8).
--
-- Batch demo, hasil grading, dan sertifikat TIDAK di sini — dibuat oleh
-- `npm run seed:demo`, supaya angka grading-nya dihitung oleh scoring engine
-- yang sama dengan yang dipakai aplikasi (tidak ada rumus yang ditulis dua kali).
-- Lihat DECISIONS.md.
--
-- Password seluruh akun demo: vmsdemo123
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Akun demo
-- -----------------------------------------------------------------------------
-- Catatan penting: kolom token di auth.users (confirmation_token, recovery_token,
-- email_change*, phone_change*, reauthentication_token) TIDAK boleh NULL.
-- GoTrue membacanya sebagai string Go; nilai NULL membuat proses login gagal
-- dengan "Email atau kata sandi salah" walau password-nya benar. Karena itu
-- semuanya diisi string kosong, dan baris lama dinormalkan di bawah.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'admin@vms.demo',
    crypt('vmsdemo123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin VMS"}', now(), now(), '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'grader@vms.demo',
    crypt('vmsdemo123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rangga Grader"}', now(), now(), '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'pabrik@vms.demo',
    crypt('vmsdemo123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"UD Mebel Contoh"}', now(), now(), '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-8444-444444444444',
    'authenticated', 'authenticated', 'pabrik2@vms.demo',
    crypt('vmsdemo123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Karya Logam Jaya"}', now(), now(), '', '', '', '', '', '', '', ''
  )
on conflict (id) do nothing;

-- Normalisasi baris yang terlanjur dibuat dengan kolom token NULL.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
where email in ('admin@vms.demo', 'grader@vms.demo', 'pabrik@vms.demo', 'pabrik2@vms.demo');

-- Identity email diperlukan GoTrue agar login email+password berfungsi.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('admin@vms.demo', 'grader@vms.demo', 'pabrik@vms.demo', 'pabrik2@vms.demo')
on conflict do nothing;

-- Peran: grader & admin sengaja tidak bisa dibuat lewat sign-up publik (D4).
insert into public.profiles (id, full_name, role, phone)
values
  ('11111111-1111-4111-8111-111111111111', 'Admin VMS', 'admin', '0811000001'),
  ('22222222-2222-4222-8222-222222222222', 'Rangga Grader', 'grader', '0811000002'),
  ('33333333-3333-4333-8333-333333333333', 'Budi Santoso', 'factory', '0811000003'),
  ('44444444-4444-4444-8444-444444444444', 'Siti Karya', 'factory', '0811000004')
on conflict (id) do update
set full_name = excluded.full_name,
    role = excluded.role,
    phone = excluded.phone;

-- -----------------------------------------------------------------------------
-- Pabrik demo: satu sudah verified, satu masih pending
-- -----------------------------------------------------------------------------
insert into public.factories (
  id, owner_id, legal_name, address, city, contact_person, contact_phone,
  verification_status, verified_by, verified_at
)
values
  (
    'aaaaaaaa-0000-4000-8000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'UD Mebel Contoh', 'Jl. Contoh Industri Kayu No. 12', 'Jepara',
    'Budi Santoso', '0811000003',
    'verified', '11111111-1111-4111-8111-111111111111', now() - interval '20 days'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444',
    'CV Karya Logam Jaya', 'Kawasan Industri MM2100 Blok C-7', 'Bekasi',
    'Siti Karya', '0811000004',
    'pending', null, null
  )
on conflict (id) do update set legal_name = excluded.legal_name, address = excluded.address, city = excluded.city, contact_person = excluded.contact_person, contact_phone = excluded.contact_phone;

update auth.users set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{full_name}', '"UD Mebel Contoh"'::jsonb) where id = '33333333-3333-4333-8333-333333333333';

-- Kategori aktif v1.3 (semua bobot draft). Sumber angka: lib/categories.ts.
insert into public.material_categories (id, code, name, is_active, status, notes, sort_order, short_description, certificate_validity_days, grade_meanings, odor_level3_hint, non_b3_extra, claim_boundary, threshold_disclaimer)
values
  ('cccccccc-0000-4000-8000-000000000007', 'solid_wood', 'Kayu Solid', true, 'live', 'Kategori pilot. Bobot draft kurasi, belum divalidasi Domain Expert (grading-system §11).', 1, 'Pilot — sisa produksi kayu solid dari pabrik atau bengkel: batang berikat atau potongan pendek lepas.', 42, '{"A":"Unit relatif utuh, hampir tanpa kerusakan biologis/kontaminan, konsisten. Cocok pemakaian ulang bernilai lebih tinggi (mis. bahan kerajinan/furnitur kecil).","B":"Layak pakai ulang dengan penyortiran ringan (buang unit cacat, cabut paku).","C":"Banyak penyortiran atau bagian terpakai kecil; cenderung untuk pemakaian bernilai lebih rendah.","D":"Tidak lolos sertifikasi; disarankan disortir/diproses ulang."}', 'Bau jamur atau busuk yang menyengat. Bau bahan kimia (pengawet, pelarut, cat) bukan dinilai di sini — hentikan penilaian dan pakai tombol "Tolak batch — temuan Non-B3".', 'Kayu yang diawetkan kimia atau terkontaminasi cat, lem, pernis, pelarut, atau oli tidak diterima di pilot sampai status hukumnya diverifikasi (kebijakan konservatif tim, bukan klaim hukum). Sisa sekecil apa pun pada satu unit = gagal. Ragu soal status B3 → tolak dulu.', 'Grade VMS menilai kondisi material dan kesesuaian klaim, bukan uji kekuatan struktural.', 'Ambang penilaian cacat kayu dan toleransi dimensi masih draft awal dan belum divalidasi ahli perkayuan.'),
  ('cccccccc-0000-4000-8000-000000000002', 'metal', 'Besi & Logam', true, 'coming_soon', 'Roadmap. Bobot diwarisi draft lama, belum divalidasi. Profil bentuk belum dirancang.', 2, 'Roadmap — kriteria masih draft, belum bisa diajukan.', null, null, 'Indikasi kontaminasi kimia/oli/bahan berbahaya.', null, null, null),
  ('cccccccc-0000-4000-8000-000000000008', 'glass', 'Kaca', true, 'coming_soon', 'Roadmap. Sub-kriteria & bobot sengaja belum diisi sampai divalidasi. Keselamatan sampling (APD, SOP) belum dirancang.', 3, 'Roadmap — kriteria belum dirancang, belum bisa diajukan.', null, null, null, null, null, null),
  ('cccccccc-0000-4000-8000-000000000009', 'ceramic', 'Keramik', true, 'coming_soon', 'Roadmap. Sumber dibatasi afkir ubin & pecahan padat. Pemetaan grade pabrik KW1–3 vs grade VMS belum dirancang.', 4, 'Roadmap — kriteria belum dirancang, belum bisa diajukan.', null, null, null, null, null, null)
on conflict (code) do update set name = excluded.name, is_active = excluded.is_active, status = excluded.status, notes = excluded.notes, sort_order = excluded.sort_order, short_description = excluded.short_description, certificate_validity_days = excluded.certificate_validity_days, grade_meanings = excluded.grade_meanings, odor_level3_hint = excluded.odor_level3_hint, non_b3_extra = excluded.non_b3_extra, claim_boundary = excluded.claim_boundary, threshold_disclaimer = excluded.threshold_disclaimer;

insert into public.category_criteria (category_id, criterion, sub_key, label, weight_pct, is_odor, odor_override_cap, sort_order, scoring_method, requires_measurement_method, help_text)
select m.id, v.criterion::criterion_type, v.sub_key, v.label, v.weight_pct, v.is_odor, v.odor_override_cap, v.sort_order, v.scoring_method::scoring_method, v.requires_measurement_method, v.help_text
from (values
    ('solid_wood', 'purity', 'species_match', 'Jenis kayu sesuai deklarasi', 70, false, null::int, 1, 'scale', false, 'Cocokkan dengan sampel acuan dan dokumen asal bahan baku. Identifikasi visual tidak 100% pasti.'),
    ('solid_wood', 'purity', 'uniformity', 'Keseragaman jenis & ukuran dalam 1 titik sampel', 30, false, null::int, 2, 'scale', false, 'Dalam satu titik, apakah jenis, warna, dan ukurannya seragam atau campur.'),
    ('solid_wood', 'cleanliness', 'biological_damage', 'Kerusakan biologis (lapuk, jamur/biru, rayap/bubuk)', 30, false, null::int, 3, 'unit_count', false, 'Unit tidak lolos bila: lapuk, jamur/biru, lubang atau serbuk bekas rayap.'),
    ('solid_wood', 'cleanliness', 'foreign_contaminant', 'Kontaminan benda asing (paku/sekrup tertanam)', 25, false, null::int, 4, 'unit_count', false, 'Unit tidak lolos bila ada paku, sekrup, atau logam lain yang tertanam. Sisa cat, lem, pernis, pelarut, atau oli tidak dinilai di sini: batch seperti itu ditolak lewat gerbang Non-B3.'),
    ('solid_wood', 'cleanliness', 'moisture', 'Kadar kelembapan', 15, false, null::int, 5, 'scale', true, 'Pakai moisture meter bila ada; bila tidak, estimasi sentuh. Metode wajib dicatat.'),
    ('solid_wood', 'cleanliness', 'physical_defect', 'Cacat fisik (retak/pecah, bengkok, mata kayu lepas)', 10, false, null::int, 6, 'unit_count', false, 'Unit tidak lolos bila: retak/pecah, bengkok/melintir, mata kayu lepas atau besar, kulit/tepi tidak rata.'),
    ('solid_wood', 'cleanliness', 'odor', 'Bau', 20, true, 40, 7, 'scale', false, 'Level 3 (parah) memicu override: skor kebersihan titik = 40, sub-kriteria lain diabaikan.'),
    ('solid_wood', 'quantity_accuracy', 'weight_accuracy', 'Akurasi kuantitas (berat; plus isi per ikat untuk klaim per ikat)', 60, false, null::int, 8, 'scale', false, 'Timbang ulang; untuk klaim per ikat, hitung juga isi ikat sampel. Dipakai selisih terbesar.'),
    ('solid_wood', 'quantity_accuracy', 'spec_accuracy', 'Akurasi dimensi (penampang & panjang) vs klaim', 40, false, null::int, 9, 'scale', false, 'Persentase unit sampel yang dimensinya dalam toleransi klaim.'),
    ('metal', 'purity', 'metal_type_match', 'Jenis logam sesuai deklarasi (ferrous/non-ferrous — uji magnet)', 70, false, null::int, 1, 'scale', false, null),
    ('metal', 'purity', 'uniformity', 'Keseragaman jenis dalam batch', 30, false, null::int, 2, 'scale', false, null),
    ('metal', 'cleanliness', 'rust_level', 'Tingkat karat/oksidasi', 50, false, null::int, 3, 'scale', false, null),
    ('metal', 'cleanliness', 'non_metal_contaminant', 'Kontaminan non-logam (plastik/karet menempel)', 30, false, null::int, 4, 'scale', false, null),
    ('metal', 'cleanliness', 'odor', 'Bau (indikasi oli/kimia berbahaya)', 20, true, 40, 5, 'scale', false, null),
    ('metal', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 60, false, null::int, 6, 'scale', false, null),
    ('metal', 'quantity_accuracy', 'spec_accuracy', 'Akurasi bentuk scrap (utuh/potongan sesuai klaim)', 40, false, null::int, 7, 'scale', false, null)
) as v (category_code, criterion, sub_key, label, weight_pct, is_odor, odor_override_cap, sort_order, scoring_method, requires_measurement_method, help_text)
join public.material_categories m on m.code = v.category_code
on conflict (category_id, criterion, sub_key) do update set label = excluded.label, weight_pct = excluded.weight_pct, is_odor = excluded.is_odor, odor_override_cap = excluded.odor_override_cap, sort_order = excluded.sort_order, scoring_method = excluded.scoring_method, requires_measurement_method = excluded.requires_measurement_method, help_text = excluded.help_text;

insert into public.material_form_profiles (id, category_id, code, name, description, point_definition, unit_label, units_per_point, sampling_notes, claim_mode, sort_order, is_active)
select v.id::uuid, m.id, v.code, v.name, v.description, v.point_definition, v.unit_label, v.units_per_point, v.sampling_notes, v.claim_mode::claim_mode, v.sort_order, v.is_active
from (values
    ('dddddddd-0000-4000-8000-000000000001', 'solid_wood', 'bundled_sticks', 'Batang berikat', 'Batang kayu sisa produksi yang diikat per ikat.', '1 ikat dari lapisan atas, tengah, dan dasar tumpukan', 'batang', 10, 'Ikat wajib dibuka. Jangan menilai dari sisi luar saja, karena bagian dalam ikat tidak kelihatan. Hitung juga jumlah batang di setiap ikat sampel.', 'bundle', 1, true),
    ('dddddddd-0000-4000-8000-000000000002', 'solid_wood', 'loose_offcuts', 'Potongan pendek lepas', 'Potongan pendek kayu solid yang tidak diikat.', 'Segenggam dari lapisan atas, tengah, dan dasar tumpukan', 'potongan', 20, 'Ambil dari bagian dalam tumpukan, bukan hanya permukaan.', 'weight', 2, true)
) as v (id, category_code, code, name, description, point_definition, unit_label, units_per_point, sampling_notes, claim_mode, sort_order, is_active)
join public.material_categories m on m.code = v.category_code
on conflict (category_id, code) do update set name = excluded.name, description = excluded.description, point_definition = excluded.point_definition, unit_label = excluded.unit_label, units_per_point = excluded.units_per_point, sampling_notes = excluded.sampling_notes, claim_mode = excluded.claim_mode, sort_order = excluded.sort_order, is_active = excluded.is_active;

-- Kategori lama dinonaktifkan; riwayat/FK tetap utuh.
update public.material_categories set is_active = false, notes = coalesce(notes, '') || case when notes like '%[nonaktif sejak revisi Kayu Solid]%' then '' else ' [nonaktif sejak revisi Kayu Solid]' end where code in ('textile', 'plastic', 'paper', 'biomass', 'uco');
