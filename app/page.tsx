import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { APP, CRITERIA_EXPLAINER, GRADE_DESCRIPTION, GRADE_MEANING } from "@/lib/text";
import type { GradeDb } from "@/lib/types/db";

const GRADES: { grade: GradeDb; range: string }[] = [
  { grade: "A", range: "85–100" },
  { grade: "B", range: "70–84" },
  { grade: "C", range: "55–69" },
  { grade: "D", range: "di bawah 55" },
];

const GRADE_BG: Record<GradeDb, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
};

const STEPS = [
  {
    title: "Pabrik mengajukan batch",
    body: "Pabrik mendaftarkan satu lot limbah produksi: kategori material, klaim berat, foto, dan dokumen asal-usul.",
  },
  {
    title: "Grader mengambil sampel 3 titik",
    body: "Grader VMS datang ke lokasi dan mengambil sampel fisik di titik Atas, Tengah, dan Bawah — supaya bagian yang jelek tidak bisa disembunyikan di bawah.",
  },
  {
    title: "Sertifikat terbit, siapa pun bisa cek",
    body: "Skor dihitung dengan rumus yang sama untuk semua batch, lalu sertifikat ber-QR terbit maksimal 1×24 jam sejak sampling.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <h1 className="max-w-[18ch] text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Pembeli tidak perlu percaya kata penjual soal kualitas limbah produksi.
            </h1>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
              {APP.description}
            </p>

            <div className="mt-8 max-w-lg">
              <p className="mb-2 text-sm font-medium text-ink">
                Punya nomor sertifikat dari penjual?
              </p>
              <VerifyCodeForm />
              <p className="mt-2 text-sm text-ink-muted">
                Tidak perlu akun. Sertifikat bisa dicek siapa saja, kapan saja.
              </p>
            </div>
          </div>

          {/* Contoh stempel: bentuk fisik yang ditempel penjual di listing. */}
          <div className="border border-line bg-surface">
            <div className="flex items-stretch border-b border-line">
              <div className="flex w-28 items-center justify-center bg-grade-b text-grade-ink">
                <span className="font-mono text-7xl font-semibold leading-none">B</span>
              </div>
              <div className="flex flex-col justify-center px-5 py-5">
                <p className="text-lg font-semibold text-ink">Standard</p>
                <p className="font-mono tabular text-sm text-ink-muted">Skor akhir 78 dari 100</p>
              </div>
            </div>
            <dl className="px-5 py-4">
              {[
                ["Kategori", "Tekstil — kain perca"],
                ["Klaim berat", "500 kg"],
                ["Disampling", "3 titik: Atas, Tengah, Bawah"],
                ["Nomor sertifikat", "VMS-2609-K7M2QX4A"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0"
                >
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd className="text-right text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
              Contoh tampilan sertifikat. Bukan sertifikat sungguhan.
            </p>
          </div>
        </section>

        <section className="rule-measure py-12">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">Cara kerjanya</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-brand pt-4">
                <span className="font-mono text-sm font-semibold text-brand">
                  Langkah {index + 1}
                </span>
                <h3 className="mt-1 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rule-measure py-12">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">Arti tiap grade</h2>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            Grade ditentukan dari skor akhir 0–100, hasil gabungan lima kriteria berbobot tetap.
          </p>

          <ul className="mt-6 space-y-3">
            {GRADES.map(({ grade, range }) => (
              <li key={grade} className="flex items-start gap-4 border border-line bg-surface p-4">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-[2px] font-mono text-xl font-semibold text-grade-ink ${GRADE_BG[grade]}`}
                >
                  {grade}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {GRADE_MEANING[grade]}{" "}
                    <span className="font-mono tabular font-normal text-ink-muted">({range})</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {GRADE_DESCRIPTION[grade]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rule-measure py-12">
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">Lima kriteria penilaian</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {CRITERIA_EXPLAINER.map((criterion) => (
              <li key={criterion.label} className="flex flex-wrap gap-x-6 gap-y-1 py-3">
                <span className="font-mono tabular w-12 text-sm font-semibold text-brand">
                  {criterion.weight}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{criterion.label}</p>
                  <p className="text-sm text-ink-muted">{criterion.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rule-measure my-12 bg-surface px-5 py-8 sm:px-8">
          <h2 className="text-xl font-semibold text-ink">Punya limbah produksi yang mau dijual?</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
            Daftarkan pabrikmu, ajukan satu batch, dan dapatkan sertifikat yang bisa ditempel di
            deskripsi listing. Pembeli melihat angka, bukan janji.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/sign-up">
              <Button size="lg">Daftar sebagai pabrik</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg">
                Masuk
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-xs text-ink-muted">
            {APP.longName} · {APP.demoNotice}
          </p>
        </div>
      </footer>
    </div>
  );
}
