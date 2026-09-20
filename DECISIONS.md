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
`weight_accuracy` = akurasi berat, sub_key lain di kriteria `quantity_accuracy` = akurasi spesifikasi.

## A10 — `@types/node` dinaikkan ke `^22`

Vitest 5 menolak `@types/node@^20` (peer conflict). Versi Node yang dipakai juga 22.x.

## A11 — Status verifikasi pabrik dijaga trigger, bukan `WITH CHECK`

Policy `WITH CHECK` yang membaca ulang tabel yang sedang di-RLS berisiko rekursi. Kunci kolom
`verification_status` dipindah ke trigger `factories_guard_verification` yang menolak perubahan
kolom itu bila pelakunya bukan Admin.

---

## Blocker yang butuh DevOps (tidak dikerjakan agent, sesuai SRD Bab 12)

Belum ada. Bila muncul, ditulis di sini — bukan diselesaikan sendiri.
