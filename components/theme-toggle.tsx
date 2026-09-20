"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Pilihan tema disimpan per browser; default mengikuti setelan sistem. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("vms-theme", next ? "dark" : "light");
    } catch {
      // Mode privat bisa menolak localStorage — cukup abaikan.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-9 items-center justify-center rounded-[3px] border border-line text-ink-muted hover:bg-surface-sunken hover:text-ink"
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
