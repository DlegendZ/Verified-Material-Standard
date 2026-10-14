# DECISIONS.md

Catatan keputusan teknis yang diambil saat membangun prototype VMS, sesuai perintah
SRD Bab 2.2: bila suatu kebutuhan ambigu, pilih opsi paling sederhana yang tetap
memenuhi alur demo, lalu catat di sini.

Nomor `D1`–`D8` milik SRD Bab 14 (keputusan pemilik produk). Nomor `A1` ke atas
adalah keputusan agent saat implementasi.

---

## A1 — Aplikasi ditaruh di root repo, bukan di subfolder `vms/`

SRD Bab 4.2 menggambar struktur folder diawali `vms/`. Repo ini sendiri sudah bernama
`Verified-Material-Standard`, jadi `vms/` diperlakukan sebagai nama root project, bukan
subfolder tambahan. Semua path lain (`app/`, `lib/scoring/`, `supabase/migrations/`) persis
seperti SRD.

Alasan: menghindari nesting ganda `Verified-Material-Standard/vms/` yang bikin perintah npm
dan path import lebih panjang tanpa manfaat.

## A2 — Nama package npm `vms`

`create-next-app` menolak nama berhuruf kapital, sementara nama folder repo mengandung kapital.
`package.json.name` di-set `vms`.

## A3 — Konfigurasi kategori ditulis dua kali (sengaja), dengan satu sumber angka

Bobot sub-kriteria hidup di database (keputusan D7). Tapi unit test scoring engine tidak boleh
menyentuh database (SRD Bab 4.3: engine murni). Karena itu:

- `lib/categories.ts` = sumber angka untuk **seed** dan **fixture test**
- `supabase/seed.sql` = yang benar-benar mengisi tabel
- runtime aplikasi **selalu** membaca dari tabel, tidak pernah dari `lib/categories.ts`

Risiko drift antara keduanya diterima dan dijaga lewat test sinkronisasi seed.

## A4 — Batch demo dibuat lewat skrip, bukan `seed.sql`

`supabase/seed.sql` hanya berisi data referensi (akun, pabrik, kategori, sub-kriteria).
Batch demo + hasil grading + sertifikat dibuat `npm run seed:demo`.

Alasan: `grading_results.breakdown_json` harus identik dengan keluaran scoring engine.
Menulis ulang rumusnya dalam SQL berarti ada dua implementasi rumus yang bisa berbeda —
persis yang dilarang SRD Bab 4.3. Skrip seed memanggil engine yang sama dengan aplikasi.

## A5 — Publik tidak diberi policy `SELECT` sama sekali

SRD Bab 4.3 meminta publik bisa membaca sertifikat terbit, dan Bab 9.2 melarang data kontak
pemilik pabrik / email / dokumen asal-usul muncul di halaman publik. Memberi anon policy
`SELECT` ke tabel `factories` akan membocorkan `contact_phone` lewat PostgREST.

Solusi: satu fungsi `public_certificate(code)` `security definer` yang mengembalikan persis
field yang boleh tampil. Anon hanya diberi `EXECUTE` ke fungsi itu.

## A6 — Bucket `batch-photos` dibuat publik, `batch-documents` privat

Halaman verifikasi publik menampilkan galeri foto batch & foto per titik sampel, jadi foto harus
bisa dibuka tanpa sesi login. Dokumen asal-usul tidak pernah tampil ke publik, jadi buckets-nya
privat dan hanya diakses staf lewat signed URL.

## A7 — Aturan "jumlah bobot = 100" dijaga di tiga lapis

1. `lib/scoring` melempar `ScoringError` bila jumlah bobot ≠ 100 (bukan normalisasi diam-diam)
2. Server Action konfigurasi kategori memvalidasi sebelum menyimpan (kriteria penerimaan A8)
3. Constraint trigger `category_criteria_weight_sum` di database sebagai jaring terakhir

Trigger dibuat `deferrable initially deferred` supaya satu transaksi boleh menukar bobot beberapa
baris sekaligus (mis. 70/30 → 60/40) tanpa gagal di tengah jalan.

## A8 — `grading_results` diblokir dari UPDATE/DELETE lewat trigger

SRD Bab 5.3 mewajibkan append-only. Policy RLS saja tidak cukup karena service role melewati RLS,
sedangkan skrip seed dan proses penerbitan sertifikat memakai service role. Trigger berlaku untuk
semua role.

## A9 — Sub-kriteria "akurasi berat" dikenali lewat `sub_key = 'weight_accuracy'`

Model data SRD Bab 5.1 tidak menyediakan kolom penanda mana sub-kriteria berat dan mana spesifikasi,
padahal bobot keduanya berbeda per kategori (60/40, 70/30, 100/0). Dipakai konvensi `sub_key`:
`weight_accuracy` = akurasi berat, `spec_accuracy` = akurasi spesifikasi. sub_key lain di kriteria
`quantity_accuracy` ditolak engine. Keputusan ini sudah diserap ke SRD v1.1 Bab 5.1 & 7.6.

## A10 — `@types/node` dinaikkan ke `^22`

Vitest 5 menolak `@types/node@^20` (peer conflict). Versi Node yang dipakai juga 22.x.

## A11 — Status verifikasi pabrik dijaga trigger, bukan `WITH CHECK`

Policy `WITH CHECK` yang membaca ulang tabel yang sedang di-RLS berisiko rekursi. Kunci kolom
`verification_status` dipindah ke trigger `factories_guard_verification` yang menolak perubahan
kolom itu bila pelakunya bukan Admin.

## A12 — Skrip seed demo dijalankan dengan `tsx`

Skrip `scripts/seed-demo.ts` mengimpor scoring engine langsung (keputusan A4), jadi butuh runner
TypeScript yang memahami path alias. `tsx` dipilih karena tidak butuh langkah build terpisah.
Variabel lingkungan dibaca lewat `node --env-file=.env.local` bawaan Node 22, bukan paket dotenv.

## A13 — Foto demo berupa SVG blok warna berlabel

SRD Bab 13.1 membolehkan placeholder asal tidak terlihat seperti gambar rusak. Membuat file JPG
butuh dependensi pengolah gambar; SVG blok warna dengan label kategori, kode batch, dan titik
sampel memberi hasil yang jelas tanpa menambah dependensi.

## A14 — Pratinjau grader memakai scoring engine yang sama, dijalankan di browser

SRD Bab 6.3 meminta pratinjau hasil sebelum submit. Karena engine murni tanpa I/O, modulnya aman
diimpor komponen client. Alternatifnya adalah memanggil server setiap kali angka berubah (lambat di
lapangan) atau menulis perkiraan terpisah (dua sumber kebenaran). Angka final yang disimpan tetap
hasil perhitungan server.

## A15 — Halaman verifikasi publik memakai client anon tanpa cookie

`createSupabaseServerClient()` membaca cookie sehingga membuat rute menjadi dinamis penuh. Halaman
publik memakai `createSupabasePublicClient()` supaya bisa di-cache (ISR 60 detik) dan isinya tidak
pernah berbeda tergantung siapa yang membuka.

## A16 — URL Supabase dinormalkan di satu tempat

Nilai `NEXT_PUBLIC_SUPABASE_URL` yang tersalin dari dashboard sering berakhiran `/rest/v1`.
Client Supabase menambahkan path itu sendiri, sehingga hasilnya `/rest/v1/rest/v1/...` dan ditolak
dengan "Invalid path specified in request URL" — sementara endpoint auth tetap jalan, jadi gejalanya
menyesatkan. `normalizeSupabaseUrl()` di `lib/env.ts` membuang garis miring dan sufiks
`/rest|auth|storage|realtime/vN`, lalu dipakai seragam oleh server client, browser client,
middleware, URL Storage, dan skrip seed.

## A17 — PDF sertifikat hanya dirender di dalam Next, bukan di skrip seed

`@react-pdf/renderer` gagal di-resolve saat dijalankan lewat `tsx`
(`Package subpath './en-us' is not defined by "exports" in @react-pdf/hyphenate`), tapi berjalan
normal di runtime Next. Karena itu `npm run seed:demo` tetap membuat QR (memakai `qrcode` langsung)
dan melewati PDF dengan peringatan, sedangkan PDF sertifikat demo terbentuk saat Admin menerbitkan
sertifikat dari aplikasi. Keduanya dipisah supaya kegagalan PDF tidak ikut menghilangkan QR.

## A18 — Kolom token di `auth.users` diisi string kosong, bukan NULL

Akun demo dibuat lewat SQL. GoTrue membaca `confirmation_token`, `recovery_token`,
`email_change*`, `phone_change*`, dan `reauthentication_token` sebagai string Go; nilai NULL membuat
login ditolak dengan pesan "Email atau kata sandi salah" walau password benar. `seed.sql` mengisi
semuanya dengan `''` dan menormalkan baris lama.


## A19 — Profil bentuk per kategori

Profil bentuk disimpan di tabel baru `material_form_profiles` (per kategori), dipilih pabrik saat mengajukan batch (`batches.form_profile_id`).

Alasan: GS §11 template profil: material baru = tambah data, bukan ubah kode.

## A20 — Metode skoring dan ukur sebagai data

Tiap sub-kriteria punya `scoring_method` (`scale` | `unit_count`) dan `requires_measurement_method` sebagai **data** di `category_criteria`. Konversi "% unit lolos → skor" dilakukan **engine** memakai tabel GS §7 yang sama dengan akurasi spesifikasi.

Alasan: Satu rumus, satu tempat; grader tidak menghitung manual.

## A21 — Deviasi terbesar dari berat dan hitungan

Deviasi kuantitas = **maksimum** dari deviasi berat dan semua deviasi hitungan (isi per ikat per titik, + jumlah ikat bila dihitung). Rumus deviasi `abs(klaim − aktual) × 100 / klaim` (kali dulu baru bagi) supaya batas 2/5/10% tepat tanpa galat float.

Alasan: GS §7 & §10 ("dipakai selisih terbesar", "batas atas inklusif").

## A22 — Masa berlaku per kategori

Masa berlaku disimpan di `material_categories.certificate_validity_days`. Env `CERTIFICATE_VALIDITY_DAYS` **dihapus**. Penerbitan ditolak bila nilainya NULL.

Alasan: P4: tidak boleh di-generalize.

## A23 — Arti grade per material

Arti grade per material disimpan di `material_categories.grade_meanings` (jsonb `{A,B,C,D}`) dan ditampilkan di halaman publik, PDF, landing, dashboard pabrik, review admin. Label generik (Premium/Standard/Ekonomis/Tidak lolos) tetap dipakai sebagai judul.

Alasan: GS §9: tabel per material yang ditampilkan ke user.

## A24 — Klaim terstruktur dan ringkasan otomatis

Klaim spesifikasi terstruktur disimpan di `batches.claimed_spec_detail` (jsonb, divalidasi Zod per profil). `batches.claimed_spec` (teks) tetap ada dan diisi **otomatis** dari detail (ringkasan satu baris) supaya halaman lama & publik tetap bekerja.

Alasan: Kontrak kolom SRD Bab 5 tidak boleh dihapus.

## A25 — RPC kategori publik dengan fallback

Landing page membaca daftar kategori lewat fungsi `public_categories()` `SECURITY DEFINER` (anon hanya `EXECUTE`), dengan fallback statis bila Supabase tidak terjangkau.

Alasan: Pola A5: tidak ada policy SELECT anon ke tabel.

## A26 — Kategori lama nonaktif dan riwayat tetap

Kategori lama dinonaktifkan (`is_active=false`), tidak dihapus; semua query UI memfilter `is_active = true`.

Alasan: P3; riwayat & FK aman.

## A27 — Kompatibilitas breakdown 1.x

UI wajib tetap bisa merender `breakdown_json` versi rumus 1.x (sertifikat lama non-demo, kalau ada). Field baru di breakdown v2 diperlakukan opsional saat render.

Alasan: Sertifikat terbit tidak boleh rusak (SRD Bab 4.3).

## A28 — Keberatan hanya layar konsep

Halaman keberatan statis di route publik `/proses-keberatan`, ditautkan dari `/tentang`, halaman publik sertifikat, dan detail batch pabrik.

Alasan: P5.

## A29 — Draft grading versi dua

Kunci draft wizard grader di localStorage dinaikkan ke `vms-grading-v2-<batchId>`; draft lama diabaikan.

Alasan: Bentuk draft berubah; mencegah crash restore.

## A30 — Jumlah unit sesuai profil sampling

Bila profil bentuk diberikan ke engine, engine memvalidasi jumlah unit yang diperiksa per titik = `units_per_point` profil.

Alasan: GS §3: "angkanya sama untuk setiap batch".

## A31 — Deklarasi intake wajib

Deklarasi intake pabrik (sumber material & syarat Non-B3 tambahan) berupa checkbox wajib di form batch, disimpan di `batches.intake_declarations`. Deklarasi **bukan pengganti gate**; grader tetap menjalankan 3 gate.

Alasan: GS §1 & §11.1.

## A32 — Kontaminasi kimia ditolak tanpa toleransi

**(Direvisi v1.3.1, mengikuti P12.)** Kontaminasi kimia Kayu Solid ditangani **hanya** oleh gerbang Non-B3, dengan ambang nol: tanda pengawetan kimia, sisa cat/lem/pernis/pelarut/oli sekecil apa pun, atau bau bahan kimia → gate gagal. Sub-kriteria `foreign_contaminant` dilabeli "Kontaminan benda asing (paku/sekrup tertanam)" dan hanya menilai paku, sekrup, atau logam lain yang tertanam. Bau Level 3 Kayu Solid = jamur/busuk saja. Data teks di 7.3.1; aturan lengkap Bab 3.4.

Alasan: GS §2 "ragu → tolak" & §11.1 syarat Non-B3 menang atas daftar cacat per unit, karena gerbang dijalankan sebelum skoring dan tidak ada ambang "ringan" yang tertulis. Grader tidak perlu menebak batas.

## A33 — Badge canvas sebagai backlog opsional

Badge (Fase 13) dirender di browser dengan `<canvas>` + `qrcode.toCanvas`, diunduh sebagai PNG; tidak menambah dependensi pengolah gambar.

Alasan: Marketplace menerima PNG/JPG; menjaga dependensi tipis (A13).

Status: Fase 13 opsional **belum dikerjakan**; ini keputusan untuk backlog.

## A34 — Rumus versi 2.0.0

`SCORING_VERSION` naik ke `2.0.0` (bentuk input & breakdown berubah).

Alasan: Aturan di `lib/scoring/rules.ts`.

## A35 — Temuan Non-B3 setelah gerbang dan konfirmasi ulang

**Temuan Non-B3 setelah gerbang lolos:** wizard punya tombol "Tolak batch — temuan Non-B3" (aksi server baru `rejectNonB3FindingAction`, tanpa migrasi DB) yang mengubah `gate_checks.non_b3_pass` → false, menambah catatan temuan, batch → `rejected_gate`, assignment → `submitted`, audit `batch.gate_rejected_late`, dan menghapus draft wizard. Hanya bisa dipakai selama batch `grading` dan belum ada `grading_results`. Sebelum kirim hasil, grader **wajib** mencentang konfirmasi ulang Non-B3 (`nonB3Reconfirmed: true`, disimpan di payload audit `grading.submitted`).

Alasan: Ikat baru dibuka saat sampling, jadi kontaminasi bisa baru terlihat setelah gerbang. Tanpa jalur ini grader terpaksa menilainya di sub-kriteria, padahal itu dilarang P12.

## A36 — Ringkasan klaim menerima berat total sebagai parameter keempat

`claimedSpecSummary(detail, profile, declaredMaterialType, claimedWeightKg)` menerima berat
total dari kolom batch secara eksplisit. Bentuk JSON klaim di Bab 7.4.2 tidak memuat berat,
sementara keluaran Bab 7.4.3 wajib menampilkan total kg. Berat tidak diduplikasi ke JSON klaim.

Alasan: satu sumber berat dan format ringkasan persis contoh dokumen.

## A37 — Helper ringkasan klaim dipisahkan ke modul yang aman di browser

Implementasi `claimedSpecSummary` ada di `lib/claims.ts` dan diekspor ulang dari
`lib/certificate.ts`. Form pabrik mengimpor modul browser tersebut. Modul certificate
mengimpor `node:crypto` untuk kode sertifikat, sehingga tidak boleh diimpor form client.

Alasan: pratinjau browser dan ringkasan server memakai fungsi yang sama tanpa membawa crypto
ke bundel browser.

---

## Blocker yang butuh DevOps (tidak dikerjakan agent, sesuai SRD Bab 12)

Belum ada. Bila muncul, ditulis di sini — bukan diselesaikan sendiri.
