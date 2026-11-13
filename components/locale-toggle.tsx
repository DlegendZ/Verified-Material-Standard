import { setLocaleAction } from "@/app/locale-action";
import { getLocale } from "@/lib/locale-server";

export async function LocaleToggle() {
  const en = (await getLocale()) === "en";
  return (
    <form action={setLocaleAction}>
      <button
        type="submit"
        name="locale"
        value={en ? "id" : "en"}
        aria-label={en ? "Switch to Indonesian" : "Switch to English"}
        title={en ? "Ganti ke Bahasa Indonesia" : "Switch to English"}
        className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-line px-2 text-xs font-bold text-ink hover:bg-surface-sunken"
      >
        {en ? "ID" : "EN"}
      </button>
    </form>
  );
}
