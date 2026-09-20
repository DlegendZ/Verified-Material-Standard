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
    '{"full_name":"Sentosa Textile"}', now(), now(), '', '', '', '', '', '', '', ''
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
  ('33333333-3333-4333-8333-333333333333', 'Budi Sentosa', 'factory', '0811000003'),
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
    'PT Sentosa Textile', 'Jl. Soekarno-Hatta No. 218', 'Bandung',
    'Budi Sentosa', '0811000003',
    'verified', '11111111-1111-4111-8111-111111111111', now() - interval '20 days'
  ),
  (
    'aaaaaaaa-0000-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444',
    'CV Karya Logam Jaya', 'Kawasan Industri MM2100 Blok C-7', 'Bekasi',
    'Siti Karya', '0811000004',
    'pending', null, null
  )
on conflict (id) do nothing;

-- =============================================================================
-- Kategori material & sub-kriteria (SRD Bab 8)
--
-- Sumber angka: lib/categories.ts. Kalau salah satu diubah, ubah keduanya —
-- test `lib/categories.seed.test.ts` akan gagal bila keduanya tidak sinkron.
--
-- Catatan jujur dari dokumen domain: kategori selain Tekstil memakai pola bobot
-- yang sama dan BELUM divalidasi Domain Expert (sesi Week 7). Karena itu bobot
-- disimpan sebagai data yang bisa diubah Admin, bukan konstanta di kode.
-- =============================================================================
insert into public.material_categories (id, code, name, is_active, status, notes)
values
  ('cccccccc-0000-4000-8000-000000000001', 'textile', 'Tekstil', true, 'live',
   'Kategori pilot. Bobot sudah dipakai sebagai contoh di grading-system.md Section 10.'),
  ('cccccccc-0000-4000-8000-000000000002', 'metal', 'Logam & Besi', true, 'live',
   'Belum divalidasi Domain Expert (sesi Week 7).'),
  ('cccccccc-0000-4000-8000-000000000003', 'plastic', 'Plastik Daur Ulang', true, 'live',
   'Belum divalidasi Domain Expert (sesi Week 7).'),
  ('cccccccc-0000-4000-8000-000000000004', 'paper', 'Kertas & Kardus', true, 'live',
   'Belum divalidasi Domain Expert (sesi Week 7).'),
  ('cccccccc-0000-4000-8000-000000000005', 'biomass', 'Biomassa / Organik', true, 'live',
   'Belum divalidasi Domain Expert (sesi Week 7).'),
  ('cccccccc-0000-4000-8000-000000000006', 'uco', 'Minyak Jelantah (UCO)', true, 'coming_soon',
   'Feasibility rendah: kadar air butuh alat lab. Tampil di UI sebagai Segera Hadir, tidak bisa dipilih saat submit batch. Cap override bau 20 (lebih ketat dari default 40).')
on conflict (code) do nothing;

insert into public.category_criteria
  (category_id, criterion, sub_key, label, weight_pct, is_odor, odor_override_cap, sort_order)
select m.id, v.criterion::criterion_type, v.sub_key, v.label, v.weight_pct, v.is_odor, v.odor_override_cap, v.sort_order
from (
  values
    -- Tekstil
    ('textile', 'purity', 'fiber_type_match', 'Jenis serat sesuai deklarasi', 70, false, null::int, 1),
    ('textile', 'purity', 'uniformity', 'Keseragaman warna/jenis dalam 1 titik', 30, false, null, 2),
    ('textile', 'cleanliness', 'dirt_level', 'Tingkat kotoran/noda', 50, false, null, 3),
    ('textile', 'cleanliness', 'fraying_level', 'Tingkat fraying (serat lepas)', 30, false, null, 4),
    ('textile', 'cleanliness', 'odor', 'Bau', 20, true, 40, 5),
    ('textile', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 60, false, null, 6),
    ('textile', 'quantity_accuracy', 'spec_accuracy', 'Akurasi ukuran potongan vs klaim', 40, false, null, 7),

    -- Logam & Besi
    ('metal', 'purity', 'metal_type_match', 'Jenis logam sesuai deklarasi (uji magnet ferrous/non-ferrous)', 70, false, null, 1),
    ('metal', 'purity', 'uniformity', 'Keseragaman jenis dalam batch', 30, false, null, 2),
    ('metal', 'cleanliness', 'rust_level', 'Tingkat karat/oksidasi', 50, false, null, 3),
    ('metal', 'cleanliness', 'non_metal_contaminant', 'Kontaminan non-logam (plastik/karet menempel)', 30, false, null, 4),
    ('metal', 'cleanliness', 'odor', 'Bau (indikasi oli/kimia berbahaya)', 20, true, 40, 5),
    ('metal', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 60, false, null, 6),
    ('metal', 'quantity_accuracy', 'spec_accuracy', 'Akurasi bentuk scrap vs klaim', 40, false, null, 7),

    -- Plastik Daur Ulang
    ('plastic', 'purity', 'resin_type_match', 'Jenis resin sesuai deklarasi (kode 1-7)', 70, false, null, 1),
    ('plastic', 'purity', 'uniformity', 'Keseragaman warna/jenis', 30, false, null, 2),
    ('plastic', 'cleanliness', 'contaminant', 'Kontaminan (label/lem/tutup beda material)', 50, false, null, 3),
    ('plastic', 'cleanliness', 'dirt_level', 'Tingkat kotoran fisik (debu, sisa cairan)', 30, false, null, 4),
    ('plastic', 'cleanliness', 'odor', 'Bau (indikasi sisa kimia berbahaya)', 20, true, 40, 5),
    ('plastic', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 60, false, null, 6),
    ('plastic', 'quantity_accuracy', 'spec_accuracy', 'Akurasi bentuk (utuh/pecahan/pellet) vs klaim', 40, false, null, 7),

    -- Kertas & Kardus
    ('paper', 'purity', 'paper_type_match', 'Jenis kertas sesuai deklarasi (OCC/HVS/koran)', 70, false, null, 1),
    ('paper', 'purity', 'uniformity', 'Keseragaman jenis dalam batch', 30, false, null, 2),
    ('paper', 'cleanliness', 'contaminant', 'Kontaminan (staples, lakban, klip)', 40, false, null, 3),
    ('paper', 'cleanliness', 'moisture_level', 'Kadar kelembaban', 40, false, null, 4),
    ('paper', 'cleanliness', 'odor', 'Bau (indikasi jamur/busuk)', 20, true, 40, 5),
    ('paper', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 70, false, null, 6),
    ('paper', 'quantity_accuracy', 'spec_accuracy', 'Akurasi spesifikasi (laminasi) vs klaim', 30, false, null, 7),

    -- Biomassa / Organik
    ('biomass', 'purity', 'moisture_threshold', 'Kadar air sesuai ambang', 60, false, null, 1),
    ('biomass', 'purity', 'particle_uniformity', 'Keseragaman ukuran partikel', 40, false, null, 2),
    ('biomass', 'cleanliness', 'non_organic_contaminant', 'Kontaminan non-organik (plastik, batu, kerikil)', 50, false, null, 3),
    ('biomass', 'cleanliness', 'rot_signs', 'Tanda pembusukan/jamur (visual)', 30, false, null, 4),
    ('biomass', 'cleanliness', 'odor', 'Bau busuk', 20, true, 40, 5),
    ('biomass', 'quantity_accuracy', 'weight_accuracy', 'Akurasi berat', 70, false, null, 6),
    ('biomass', 'quantity_accuracy', 'spec_accuracy', 'Akurasi ukuran partikel vs klaim', 30, false, null, 7),

    -- Minyak Jelantah (UCO) — cap override bau lebih ketat: 20
    ('uco', 'purity', 'color_clarity', 'Kejernihan warna (indikasi frekuensi pemakaian)', 60, false, null, 1),
    ('uco', 'purity', 'water_content', 'Kadar air (butuh alat lab — limitation MVP)', 40, false, null, 2),
    ('uco', 'cleanliness', 'solid_contaminant', 'Kontaminan padatan (sisa makanan/kerak)', 60, false, null, 3),
    ('uco', 'cleanliness', 'odor', 'Bau tengik ekstrem', 40, true, 20, 4),
    ('uco', 'quantity_accuracy', 'weight_accuracy', 'Akurasi volume/berat', 100, false, null, 5)
) as v (category_code, criterion, sub_key, label, weight_pct, is_odor, odor_override_cap, sort_order)
join public.material_categories m on m.code = v.category_code
on conflict (category_id, criterion, sub_key) do update
set label = excluded.label,
    weight_pct = excluded.weight_pct,
    is_odor = excluded.is_odor,
    odor_override_cap = excluded.odor_override_cap,
    sort_order = excluded.sort_order;
