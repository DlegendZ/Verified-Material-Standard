import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInAction, signUpAction } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

function signupData() {
  const form = new FormData();
  form.set("fullName", "Pabrik Contoh");
  form.set("email", "contoh@example.com");
  form.set("password", "password123");
  form.set("phone", "08123456789");
  return form;
}

describe("aksi akun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("meminta konfirmasi email ketika signup tidak menghasilkan sesi", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signUp },
    } as never);

    expect(await signUpAction({}, signupData())).toEqual({ confirmationRequired: true });
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "contoh@example.com",
        options: expect.objectContaining({
          emailRedirectTo: "http://localhost:3000/sign-in",
        }),
      }),
    );
  });

  it("membedakan login gagal akibat koneksi dari sandi salah", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: { status: 0 } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signInWithPassword },
    } as never);
    const form = new FormData();
    form.set("email", "contoh@example.com");
    form.set("password", "password123");

    expect(await signInAction({}, form)).toEqual({
      error: "Layanan akun tidak dapat dihubungi. Coba lagi beberapa saat.",
    });
  });
});
