"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { signInAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Masuk ke VMS</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Akun pabrik, grader, dan admin memakai halaman masuk yang sama.
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

            <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nama@pabrik.co.id"
              />
            </Field>

            <Field label="Kata sandi" htmlFor="password" error={state.fieldErrors?.password} required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" size="block" disabled={pending}>
              {pending ? "Memproses…" : "Masuk"}
            </Button>
          </form>
        </PanelBody>
      </Panel>

      <p className="text-sm text-ink-muted">
        Belum punya akun pabrik?{" "}
        <Link href="/sign-up" className="font-medium text-brand underline underline-offset-4">
          Daftar sebagai pabrik
        </Link>
      </p>
    </div>
  );
}
