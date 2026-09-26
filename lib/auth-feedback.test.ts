import { describe, expect, it } from "vitest";
import { AUTH_UNAVAILABLE, authErrorMessage } from "./auth-feedback";

describe("authErrorMessage", () => {
  it("membedakan gangguan koneksi dari kredensial salah", () => {
    expect(authErrorMessage({ status: 0 }, "sign-in")).toBe(AUTH_UNAVAILABLE);
    expect(authErrorMessage({ status: 0 }, "sign-up")).toBe(AUTH_UNAVAILABLE);
    expect(authErrorMessage({ code: "invalid_credentials" }, "sign-in")).toBe(
      "Email atau kata sandi salah.",
    );
  });

  it("menjelaskan konfirmasi email dan batas percobaan", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" }, "sign-in")).toContain(
      "Konfirmasi email",
    );
    expect(authErrorMessage({ status: 429 }, "sign-in")).toContain(
      "Tunggu sebentar",
    );
    expect(authErrorMessage({ status: 429 }, "sign-up")).toContain(
      "Tunggu sebentar",
    );
  });
});
