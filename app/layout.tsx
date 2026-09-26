import type { Metadata } from "next";
import { APP } from "@/lib/text";
import "./globals.css";

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
    var dark = stored === "dark";
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
