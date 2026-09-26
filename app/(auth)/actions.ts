"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { AUTH_UNAVAILABLE, authErrorMessage } from "@/lib/auth-feedback";
import { siteUrl } from "@/lib/env";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  confirmationRequired?: boolean;
}

function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: authErrorMessage(error, "sign-in") };
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { error: AUTH_UNAVAILABLE };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: "Profil akun belum tersedia. Hubungi admin VMS." };
  }

  revalidatePath("/", "layout");
  const role = profile.role as string;
  redirect(role === "admin" ? "/admin" : role === "grader" ? "/grader" : "/factory");
}

/**
 * Sign-up publik selalu menghasilkan peran Factory (keputusan D4).
 * Akun Grader dan Admin dibuat lewat seed atau oleh Admin, supaya orang asing
 * tidak bisa mendaftar sebagai grader saat demo dibuka ke publik.
 */
export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      emailRedirectTo: `${siteUrl()}/sign-in`,
    },
  });

  if (error) {
    return { error: authErrorMessage(error, "sign-up") };
  }

  if (!data.session) return { confirmationRequired: true };
  revalidatePath("/", "layout");
  redirect("/factory");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
