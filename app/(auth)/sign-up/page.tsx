"use client";

import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { signUpAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function SignUpPage() {
  const en = useLocale() === "en";
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  );

  if (state.confirmationRequired) {
    return (
      <Panel>
        <PanelBody>
          <h1 className="text-2xl font-semibold text-ink">
            {en ? "Check your email" : "Periksa emailmu"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            {en
              ? "If registration was accepted, check your email for a confirmation link. Open it before signing in. Check your spam folder if needed."
              : "Jika pendaftaran diterima, tautan konfirmasi dikirim ke emailmu. Buka tautan itu sebelum masuk. Periksa folder spam bila belum terlihat."}
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block font-semibold text-brand underline underline-offset-4"
          >
            {en ? "Go to sign in" : "Ke halaman masuk"}
          </Link>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {en ? "Register a factory" : "Daftar sebagai pabrik"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {en
            ? "After registering, complete your factory profile. A VMS administrator will verify it before you can submit a batch."
            : "Setelah mendaftar, lengkapi profil pabrik. Admin VMS akan memverifikasi sebelum kamu bisa mengajukan batch."}
        </p>
      </div>

      <Panel>
        <PanelBody>
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <p
                role="alert"
                className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {en
                  ? "This request could not be completed. Check your details and try again."
                  : state.error}
              </p>
            ) : null}

            <Field
              label={en ? "Full name" : "Nama lengkap"}
              htmlFor="fullName"
              error={state.fieldErrors?.fullName}
              required
            >
              <Input
                id="fullName"
                name="fullName"
                autoComplete="name"
                required
              />
            </Field>

            <Field
              label="Email"
              htmlFor="email"
              error={state.fieldErrors?.email}
              required
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label={en ? "Phone number" : "Nomor telepon"}
              htmlFor="phone"
              hint={
                en
                  ? "The grader uses this to arrange sampling."
                  : "Dipakai grader untuk mengatur jadwal sampling."
              }
              error={state.fieldErrors?.phone}
              required
            >
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </Field>

            <Field
              label={en ? "Password" : "Kata sandi"}
              htmlFor="password"
              hint={en ? "At least 8 characters." : "Minimal 8 karakter."}
              error={state.fieldErrors?.password}
              required
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            </Field>

            <Button type="submit" size="block" disabled={pending}>
              {pending
                ? en
                  ? "Working…"
                  : "Memproses…"
                : en
                  ? "Register"
                  : "Daftar"}
            </Button>
          </form>
        </PanelBody>
      </Panel>

      <p className="text-sm text-ink-muted">
        {en ? "Already have an account?" : "Sudah punya akun?"}{" "}
        <Link
          href="/sign-in"
          className="font-medium text-brand underline underline-offset-4"
        >
          {en ? "Sign in" : "Masuk"}
        </Link>
      </p>
    </div>
  );
}
