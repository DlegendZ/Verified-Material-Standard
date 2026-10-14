# VMS — Verified Material Standard

Jasa sertifikasi independen untuk batch limbah produksi pabrik.
Repo ini berisi **prototype/demo publik**, bukan sistem produksi.

Model bisnis: VMS = lembaga grading (analogi PSA), marketplace = etalase (analogi eBay).
VMS tidak menjual material dan tidak memegang transaksi — VMS menerbitkan sertifikat grade
digital per batch yang bisa diverifikasi siapa saja lewat link/QR publik.

## Cakupan material

Pilot **Kayu Solid**: batang berikat (10 batang per titik) dan potongan pendek lepas (20 potongan per titik), tiga titik sampling. Besi & Logam, Kaca, Keramik **Segera Hadir** dan belum bisa diajukan. Kategori lama nonaktif. Batu & Pasir tidak tampil.

Engine **2.0.0**: fixture GS §10 menghasilkan **77/B**, variasi Bau Bawah Level 3 **68/C**. Masa berlaku Kayu Solid **6 minggu (42 hari)** dari database kategori, tanpa default global. Grade bukan uji kekuatan struktural; bobot/ambang masih draft. Semua kontaminasi kimia, termasuk sisa cat/lem/pernis/pelarut/oli sekecil apa pun atau bau kimia, menolak seluruh batch di gerbang Non-B3 (P12).

FAQ di `/tentang`; `/proses-keberatan` hanya layar konsep statis, pengajuan manual ke Admin. VMS tidak menentukan harga. Badge unduhan/pratinjau listing (Fase 13) belum dikerjakan, opsional.

## Prasyarat

| Kebutuhan | Versi |
|---|---|
| Node.js | 22.x |
| npm | 10.x |
| Supabase CLI | terbaru (`npm i -g supabase`) — untuk Supabase lokal |
| Akun Supabase | opsional, bila ingin pakai project cloud alih-alih lokal |

## Instal dependency

```bash
npm install
```

## Menyiapkan Supabase

### Opsi A — Supabase lokal (disarankan untuk demo)

```bash
supabase start
supabase db reset
```

`supabase db reset` menjalankan seluruh file di `supabase/migrations/` secara berurutan lalu
`supabase/seed.sql`. Setelah selesai, salin URL & key yang dicetak CLI ke `.env.local`.

### Opsi B — Project Supabase cloud

Isi `SUPABASE_DB_URL` di `.env.local` dengan connection string Postgres dari dashboard Supabase
(Project Settings → Database → Connection string). Pilih **Session pooler** bila host `db.<ref>.supabase.co`
tidak bisa diakses dari jaringanmu — host langsung itu hanya punya alamat IPv6.

Lalu jalankan migrasi dan seed referensi:

```bash
npm run db:push
```

Perintah itu untuk **database kosong** dan menjalankan `0001_init.sql`, `0002_rls.sql`,
`0003_grading_results_delete.sql`, `0004_kayu_solid_pilot.sql`, lalu `seed.sql` secara berurutan. Ini
perintah manual yang dijalankan dari mesin sendiri, bukan bagian dari proses deploy.

Untuk pendaftaran dengan konfirmasi email, tambahkan `NEXT_PUBLIC_SITE_URL/sign-in`
ke daftar **Redirect URLs** di Supabase Authentication → URL Configuration. Atur
**Site URL** ke origin aplikasi yang dapat dibuka dari email pengguna, bukan URL
project Supabase. Untuk demo lokal, `http://localhost:3000/sign-in` hanya bisa
dibuka dari komputer yang menjalankan aplikasi. Setelah membuka tautan konfirmasi,
pengguna masuk memakai email dan kata sandi yang didaftarkan.

Alternatif tanpa skrip pada database kosong: jalankan kelima file di SQL Editor dengan urutan yang sama.

### Memperbarui database yang sudah ada ke v1.3

Bila migrasi 0001–0003 sudah terpasang, jalankan **hanya**:

```powershell
npm run db:push -- supabase/migrations/0004_kayu_solid_pilot.sql supabase/seed.sql
Start-Sleep -Seconds 10
npm run seed:demo
```

Jangan menjalankan semua migrasi dari awal pada DB lama: migrasi 0001 akan gagal karena tipe sudah ada. Tunggu 10 detik agar cache skema PostgREST diperbarui sebelum seed. Seed demo mengganti batch berkode `DEMO-`, bukan batch lain. Catat kode sertifikat yang dicetak untuk `DEMO-B-002`, `DEMO-B-004` dan `DEMO-E-005`. File SQL dan skrip telah diperiksa lokal; eksekusi serta RLS/alur penuh di database v1.3 belum diverifikasi. Pemilik menjalankan perintah ini secara manual.

### Data demo

Seed di atas mengisi akun, pabrik, dan seluruh konfigurasi kategori material.
Tujuh batch demo Kayu Solid + hasil grading + sertifikat dibuat terpisah (alasannya di `DECISIONS.md`):

```bash
npm run seed:demo
```

Akun demo (password seragam: `vmsdemo123`):

| Email | Peran |
|---|---|
| `admin@vms.demo` | Admin |
| `grader@vms.demo` | Grader |
| `pabrik@vms.demo` | Factory (UD Mebel Contoh, Jepara, sudah verified) |
| `pabrik2@vms.demo` | Factory (CV Karya Logam Jaya, masih pending) |

## Menjalankan dev server

```bash
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Buka [aplikasi lokal](http://localhost:3000). Bila `.env.local` sudah ada, jangan menimpanya dengan perintah salin di atas.

## Menjalankan test

```bash
npm test               # unit test (Vitest)
npm run test:coverage  # coverage scoring engine
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
```

E2E memakai akun demo dan data dari seed, jadi jalankan seed dulu:

```bash
npx playwright install chromium
npm run test:e2e
```

Satu test verifikasi publik butuh kode sertifikat hasil seed:
Gunakan kode **DEMO-B-002** yang dicetak seed. PowerShell:

```powershell
$env:E2E_CERTIFICATE_CODE = "VMS-..."  # kode DEMO-B-002, skor 77/B
npm run test:e2e
```

Tanpa kode tersebut, tes sertifikat DB dilewati. Hasil lokal 14 Oktober 2026: 130 unit test, coverage engine 100%, typecheck/lint/build hijau; 10 tes publik desktop/390px lolos, 2 tes sertifikat DB dilewati. Tes full-flow akun/DB belum dijalankan untuk revisi v1.3.1.

Scoring engine (`lib/scoring/`) wajib hijau 100% sebelum perubahan apa pun di-merge —
rumus di situ adalah IP inti VMS.

## Variabel environment

Daftar lengkap beserta penjelasannya ada di [`.env.example`](.env.example).

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | Anon key, dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Server-only: seed demo, render QR/PDF sertifikat |
| `SUPABASE_DB_URL` | untuk seed/migrasi manual | Connection string Postgres |
| `NEXT_PUBLIC_SITE_URL` | ya | URL absolut aplikasi; jadi isi QR code |

Masa berlaku diatur per kategori di `material_categories.certificate_validity_days` (Kayu Solid 42 hari). Variabel env masa berlaku lama diabaikan aplikasi.

## Struktur folder

```
app/                    # routes (App Router)
  (public)/verify/[code]/   halaman verifikasi publik, tanpa login
  (public)/tentang/         Tentang & FAQ
  (public)/proses-keberatan/ layar konsep keberatan
  (auth)/                   sign-in, sign-up
  factory/                  dashboard pabrik
  grader/                   antrian & wizard grading
  admin/                    verifikasi, penugasan, penerbitan, konfigurasi
components/             # komponen UI
lib/
  scoring/              # ENGINE MURNI — tanpa I/O, tanpa import Supabase
  supabase/             # client & server helper
  validation/           # skema Zod dipakai bersama client & server
  categories.ts         # sumber angka seed kategori + fixture test
  category-config.ts    # pemetaan konfigurasi/profil dari DB
  breakdown.ts          # normalisasi snapshot v1/v2 tanpa menghitung ulang
  claims.ts             # ringkasan klaim untuk browser/server
  public-categories.ts  # RPC anon + fallback aman
scripts/demo-specs.ts    # input/oracle 7 batch fiktif
supabase/migrations/0004_kayu_solid_pilot.sql # profil, klaim, metadata, RPC
supabase/migrations/    # SQL migrations
supabase/seed.sql       # data referensi demo
DECISIONS.md            # catatan keputusan teknis
```

## Catatan untuk DevOps (diisi manusia)

Bagian ini sengaja hanya berisi fakta aplikasi. Tidak ada instruksi deployment di repo ini —
seluruh lapisan DevOps dikerjakan manusia (SRD Bab 12).

- **Port**: `3000` (dapat diubah lewat `PORT`)
- **Perintah build**: `npm run build`
- **Perintah start**: `npm start`
- **Env yang dibutuhkan saat runtime**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- **Env lama**: hapus variabel masa berlaku global dari runtime; durasi memakai data kategori
- **Migrasi**: dijalankan manual dari `supabase/migrations/`, tidak ada hook otomatis saat deploy

## Lisensi

Lihat [LICENSE](LICENSE).
