import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { APP } from "@/lib/text";
import "./globals.css";

/*
  IBM Plex dipilih karena punya karakter teknis-institusional dan dukungan
  Latin yang rapi untuk bahasa Indonesia. Mono hanya dipakai untuk data terukur:
  nomor sertifikat, kode lot, dan angka skor — bukan sebagai gaya label.
*/
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP.name} — ${APP.longName}`,
    template: `%s · ${APP.name}`,
  },
  description: APP.description,
};

/**
 * Menetapkan tema sebelum paint supaya tidak ada kedipan putih saat mode gelap.
 * Dijalankan inline dengan sengaja; tanpa ini pengguna melihat flash terang.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("vms-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${plexSans.variable} ${plexMono.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}
