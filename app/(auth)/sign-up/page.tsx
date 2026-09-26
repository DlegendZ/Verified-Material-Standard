"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { signUpAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.confirmationRequired) {
    return (
      <Panel>
        <PanelBody>
          <h1 className="text-2xl font-semibold text-ink">Periksa emailmu</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Jika pendaftaran diterima, tautan konfirmasi dikirim ke emailmu.
            Buka tautan itu sebelum masuk. Periksa folder spam bila belum terlihat.
          </p>
          <Link href="/sign-in" className="mt-6 inline-block font-semibold text-brand underline underline-offset-4">
            Ke halaman masuk
          </Link>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Daftar sebagai pabrik</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Setelah mendaftar, lengkapi profil pabrik. Admin VMS akan memverifikasi sebelum kamu bisa
          mengajukan batch.
        </p>
      </div>

      <Panel>
        <PanelBody>
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : null}

            <Field label="Nama lengkap" htmlFor="fullName" error={state.fieldErrors?.fullName} required>
              <Input id="fullName" name="fullName" autoComplete="name" required />
            </Field>

            <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>

            <Field
              label="Nomor telepon"
              htmlFor="phone"
              hint="Dipakai grader untuk mengatur jadwal sampling."
              error={state.fieldErrors?.phone}
              required
            >
              <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" required />
            </Field>

            <Field
              label="Kata sandi"
              htmlFor="password"
              hint="Minimal 8 karakter."
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
              {pending ? "Memproses…" : "Daftar"}
            </Button>
          </form>
        </PanelBody>
      </Panel>

      <p className="text-sm text-ink-muted">
        Sudah punya akun?{" "}
        <Link href="/sign-in" className="font-medium text-brand underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}
