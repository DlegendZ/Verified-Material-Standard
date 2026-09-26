# VMS — Verified Material Standard

Jasa sertifikasi independen untuk batch limbah produksi pabrik.
Repo ini berisi **prototype/demo publik**, bukan sistem produksi.

Model bisnis: VMS = lembaga grading (analogi PSA), marketplace = etalase (analogi eBay).
VMS tidak menjual material dan tidak memegang transaksi — VMS menerbitkan sertifikat grade
digital per batch yang bisa diverifikasi siapa saja lewat link/QR publik.

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

Perintah itu menjalankan `0001_init.sql`, `0002_rls.sql`, dan `seed.sql` secara berurutan. Ini
perintah manual yang dijalankan dari mesin sendiri, bukan bagian dari proses deploy.

Untuk pendaftaran dengan konfirmasi email, tambahkan `NEXT_PUBLIC_SITE_URL/sign-in`
ke daftar **Redirect URLs** di Supabase Authentication → URL Configuration. Atur
**Site URL** ke origin aplikasi yang dapat dibuka dari email pengguna, bukan URL
project Supabase. Untuk demo lokal, `http://localhost:3000/sign-in` hanya bisa
dibuka dari komputer yang menjalankan aplikasi. Setelah membuka tautan konfirmasi,
pengguna masuk memakai email dan kata sandi yang didaftarkan.

Alternatif tanpa skrip: buka SQL Editor di dashboard Supabase, lalu tempel isi ketiga file itu
satu per satu dengan urutan yang sama.

### Data demo

Seed di atas mengisi akun, pabrik, dan seluruh konfigurasi kategori material.
Batch demo + hasil grading + sertifikat dibuat terpisah (alasannya di `DECISIONS.md`):

```bash
npm run seed:demo
```

Akun demo (password seragam: `vmsdemo123`):

| Email | Peran |
|---|---|
| `admin@vms.demo` | Admin |
| `grader@vms.demo` | Grader |
| `pabrik@vms.demo` | Factory (PT Sentosa Textile, sudah verified) |
| `pabrik2@vms.demo` | Factory (CV Karya Logam Jaya, masih pending) |

## Menjalankan dev server

```bash
cp .env.example .env.local   # lalu isi nilainya
npm run dev
```

Buka http://localhost:3000.

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
`E2E_CERTIFICATE_CODE=VMS-... npm run test:e2e`. Tanpa variabel itu test tersebut dilewati.

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
| `CERTIFICATE_VALIDITY_DAYS` | tidak | Default 90 |

## Struktur folder

```
app/                    # routes (App Router)
  (public)/verify/[code]/   halaman verifikasi publik, tanpa login
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
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CERTIFICATE_VALIDITY_DAYS` (opsional)
- **Migrasi**: dijalankan manual dari `supabase/migrations/`, tidak ada hook otomatis saat deploy

## Lisensi

Lihat [LICENSE](LICENSE).
