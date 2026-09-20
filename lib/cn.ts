import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung className Tailwind tanpa konflik utility. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
