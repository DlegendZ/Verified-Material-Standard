import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, ScanLine, ShieldCheck } from "lucide-react";
import { GradeExplorer } from "@/components/grade-explorer";
import { LandingMotion } from "@/components/landing-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { Wordmark } from "@/components/wordmark";
import { CRITERIA_EXPLAINER } from "@/lib/text";

const STEPS = [
  {
    number: "01",
    image: "/illustrations/batch.svg",
    imageAlt: "Maskot VMS mencatat tumpukan material berwarna",
    title: "Daftarkan batch",
    body: "Pabrik mengajukan satu lot material beserta kategori, berat, foto, dan bukti asal-usul.",
  },
  {
    number: "02",
    image: "/illustrations/sampling.svg",
    imageAlt: "Maskot VMS memeriksa tiga lapisan material dengan kaca pembesar",
    title: "Uji di 3 titik",
    body: "Grader memeriksa sampel fisik dari bagian atas, tengah, dan bawah batch.",
  },
  {
    number: "03",
    image: "/illustrations/certificate.svg",
    imageAlt: "Maskot VMS menunjukkan ilustrasi sertifikat grade",
    title: "Bagikan hasilnya",
    body: "Admin menerbitkan sertifikat ber-QR setelah penilaian. Pembeli bisa mengeceknya tanpa akun.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-dvh bg-paper">
      <LandingMotion />
      <header className="landing-header">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Beranda VMS">
            <Wordmark />
          </Link>
          <nav
            aria-label="Navigasi beranda"
            className="hidden items-center gap-9 text-sm text-ink-muted md:flex"
          >
            <a href="#cara-kerja" className="hover:text-brand">
              Cara kerja
            </a>
            <a href="#grade" className="hover:text-brand">
              Grade
            </a>
            <a href="#kriteria" className="hover:text-brand">
              Kriteria
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="text-sm font-medium text-ink hover:text-brand"
            >
              Masuk
            </Link>
            <Link
              href="/sign-up"
              className="hidden rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-hover sm:inline-flex"
            >
              Daftar <ArrowUpRight className="ml-1.5 size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <span className="landing-progress" aria-hidden />
      </header>

      <main>
        <section className="hero-stage relative overflow-hidden">
          <div className="hero-grid absolute inset-0" aria-hidden />
          <div className="hero-glow absolute inset-0" aria-hidden />
          <div className="hero-halo" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-7xl gap-4 px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:min-h-[650px] lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:gap-0 lg:px-12 lg:pb-20 lg:pt-12">
            <div className="relative z-10 max-w-xl">
              <div className="hero-kicker mb-7 flex items-center gap-3 text-xs font-bold tracking-[.2em] text-brand">
                <span className="hero-kicker-line" />
                VERIFIED MATERIAL STANDARD{" "}
                <span className="font-mono text-ink-muted">/ 001</span>
              </div>
              <h1 className="hero-title text-[clamp(2.85rem,5.2vw,5.4rem)] leading-[1.03] text-ink">
                Kualitas material,
                <br />
                <span className="hero-heading-accent">
                  tanpa tebak-tebakan.
                </span>
              </h1>
              <p className="hero-description mt-7 max-w-[34rem] text-base leading-8 text-ink-muted sm:text-lg">
                Bukti nyata di balik setiap batch limbah produksi. VMS memeriksa
                sampel di tiga titik dan mengubah hasilnya menjadi grade yang
                bisa diverifikasi siapa saja.
              </p>
              <div className="hero-actions mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#verifikasi"
                  className="hero-primary inline-flex min-h-12 items-center gap-3 rounded-full bg-brand px-6 font-semibold text-white shadow-[0_10px_24px_rgba(42,94,235,.24)] hover:bg-brand-hover"
                >
                  Verifikasi sertifikat{" "}
                  <ArrowUpRight className="size-5" aria-hidden />
                </a>
                <a
                  href="#cara-kerja"
                  className="hero-secondary inline-flex min-h-12 items-center gap-2 rounded-full border border-blue-200 bg-white/60 px-6 font-medium text-ink hover:bg-white dark:border-line dark:bg-surface/60"
                >
                  Lihat cara kerja <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
              <p className="hero-trust mt-8 flex items-center gap-2 text-sm text-ink-muted">
                <ShieldCheck className="size-4 text-brand" aria-hidden />{" "}
                Independen · Terukur · Bisa dicek publik
              </p>
            </div>
            <div className="hero-art relative mx-auto w-full max-w-[660px] lg:-mr-10">
              <Image
                src="/vms-hero.svg"
                alt="Ilustrasi lapisan material tiga dimensi, contoh grade, dan maskot cap digital VMS"
                width={680}
                height={610}
                priority
                className="h-auto w-full"
              />
              <div className="hero-float hero-float-top" aria-hidden>
                <span className="hero-float-dot" /> SAMPLING / 03 TITIK
              </div>
              <div className="hero-float hero-float-bottom" aria-hidden>
                <span className="font-mono text-brand">01—05</span> KRITERIA
                TERUKUR
              </div>
            </div>
          </div>
          <div className="hero-bottom-rule" aria-hidden>
            <span>VMS / TRANSPARENCY BY DESIGN</span>
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
        </section>

        <section
          id="verifikasi"
          className="relative z-10 mx-auto -mt-7 w-full max-w-6xl scroll-mt-24 px-5 sm:px-8 lg:px-12"
        >
          <div
            data-reveal
            className="verify-panel rounded-[28px] p-5 shadow-[0_22px_75px_rgba(34,76,143,.12)] sm:p-8 lg:flex lg:items-center lg:gap-10"
          >
            <Image
              className="verify-buddy"
              src="/illustrations/buddy-scan.svg"
              alt=""
              width={230}
              height={250}
            />
            <div className="mb-5 lg:mb-0 lg:w-[42%]">
              <p className="verify-eyebrow mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.17em]">
                <ScanLine className="size-4" aria-hidden /> Cek keaslian
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Punya nomor sertifikat?
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Masukkan kode dari penjual. Hasil verifikasi terbuka untuk
                semua, tanpa akun.
              </p>
            </div>
            <div className="lg:flex-1">
              <VerifyCodeForm />
            </div>
          </div>
        </section>

        <div
          className="signal-strip"
          role="img"
          aria-label="Tiga titik sampling, lima kriteria, satu standar yang bisa diverifikasi"
        >
          <div className="signal-track" aria-hidden>
            {[0, 1].map((copy) => (
              <div className="signal-group" key={copy}>
                <span>
                  03 <em>TITIK SAMPLING</em>
                </span>
                <i />
                <span>
                  05 <em>KRITERIA TERUKUR</em>
                </span>
                <i />
                <span>
                  01 <em>STANDAR TRANSPARAN</em>
                </span>
                <i />
                <span>
                  VMS <em>VERIFIKASI PUBLIK</em>
                </span>
                <i />
              </div>
            ))}
          </div>
        </div>

        <section
          id="cara-kerja"
          className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:px-12"
        >
          <div
            data-reveal
            className="mb-10 flex flex-wrap items-end justify-between gap-5"
          >
            <div>
              <p className="section-eyebrow">PROSES VMS / 01</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Dari material ke kepastian.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-ink-muted">
              Proses singkat, penilaian transparan. Setiap langkah dirancang
              agar kualitas tidak hanya jadi klaim.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.number}
                data-reveal
                className="feature-card story-card overflow-hidden rounded-[30px] border border-line bg-surface"
              >
                <div className="story-art">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    width={480}
                    height={330}
                    className="story-image"
                  />
                  <span className="story-number">{step.number} / 03</span>
                </div>
                <div className="story-copy">
                  <span className="story-small-label">
                    LANGKAH {step.number}
                  </span>
                  <h3 className="mt-2 text-[1.45rem] font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-ink-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="grade"
          className="grade-section scroll-mt-20 py-20 sm:py-24"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <div
              data-reveal
              className="mb-9 flex flex-wrap items-end justify-between gap-8 lg:mb-12"
            >
              <div>
                <p className="section-eyebrow">HASIL YANG MUDAH DIBACA / 02</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Satu grade.
                  <br />
                  Cerita kualitas lengkap.
                </h2>
              </div>
              <div className="max-w-md">
                <p className="text-base leading-8 text-ink-muted">
                  Lima kriteria berbobot menghasilkan skor 0–100. Grade membantu
                  pembeli membandingkan batch, bukan menggantikan pemeriksaan
                  kebutuhan produksi mereka.
                </p>
                <a
                  href="#kriteria"
                  className="mt-7 inline-flex items-center gap-2 font-semibold text-brand hover:underline"
                >
                  Lihat kriteria penilaian{" "}
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>
            <div data-reveal>
              <GradeExplorer />
            </div>
          </div>
        </section>

        <section
          id="kriteria"
          className="mx-auto grid w-full max-w-7xl scroll-mt-20 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12 lg:py-24"
        >
          <div data-reveal>
            <p className="section-eyebrow">DI BALIK ANGKA / 03</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Bukan sekadar label.
            </h2>
            <p className="mt-5 max-w-md text-base leading-8 text-ink-muted">
              Kemurnian, kebersihan, konsistensi, akurasi, dan dokumentasi
              dihitung dengan bobot jelas. Gate wajib diperiksa sebelum skoring
              dimulai.
            </p>
            <div className="criteria-art" data-reveal>
              <Image
                src="/illustrations/buddy-lab.svg"
                alt="Maskot VMS mengecek sampel di laboratorium ilustratif"
                width={440}
                height={300}
              />
            </div>
          </div>
          <ul
            data-reveal
            className="criteria-list overflow-hidden rounded-[26px] border border-line bg-surface px-5 sm:px-8"
          >
            {CRITERIA_EXPLAINER.map((criterion) => (
              <li
                key={criterion.label}
                className="criteria-row flex gap-5 border-b border-line py-5 last:border-0"
              >
                <span className="w-12 shrink-0 font-mono text-lg font-semibold text-brand">
                  {criterion.weight}%
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">{criterion.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {criterion.hint}
                  </p>
                  <div className="criteria-track" aria-hidden>
                    <span style={{ width: `${criterion.weight * 3}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <div
            data-reveal
            className="cta-panel relative overflow-hidden rounded-[32px] px-7 py-12 text-white sm:px-12"
          >
            <div className="relative z-10 lg:max-w-[65%]">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-200">
                Untuk pabrik
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Beri materialmu bukti kualitas.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-blue-100">
                Ajukan batch, jalani penilaian, lalu bagikan sertifikatnya pada
                calon pembeli.
              </p>
              <Link
                href="/sign-up"
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Daftar sebagai pabrik{" "}
                <ArrowUpRight className="size-5" aria-hidden />
              </Link>
            </div>
            <Image
              className="cta-buddy"
              src="/illustrations/buddy-cheer.svg"
              alt=""
              width={330}
              height={330}
            />
          </div>
        </section>
      </main>
      <footer className="landing-footer border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8 lg:px-12">
          <Wordmark />
          <div className="text-right">
            <p className="text-sm font-semibold text-ink">
              Material punya cerita. Kami bantu membacanya.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
