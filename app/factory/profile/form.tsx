"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { saveFactoryProfileAction, type ActionState } from "../actions";
import type { FactoryRow } from "@/lib/types/db";

const initialState: ActionState = {};

export function FactoryProfileForm({ factory }: { factory: FactoryRow | null }) {
  const [state, formAction, pending] = useActionState(saveFactoryProfileAction, initialState);

  return (
    <Panel>
      <PanelBody>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p role="status" className="border border-ok bg-ok-soft px-3 py-2 text-sm text-ok">
              Profil pabrik tersimpan.
            </p>
          ) : null}

          <Field
            label="Nama badan usaha"
            htmlFor="legalName"
            hint="Sesuai dokumen resmi, misalnya PT Sentosa Textile."
            error={state.fieldErrors?.legalName}
            required
          >
            <Input id="legalName" name="legalName" defaultValue={factory?.legal_name ?? ""} required />
          </Field>

          <Field label="Alamat" htmlFor="address" error={state.fieldErrors?.address} required>
            <Textarea id="address" name="address" defaultValue={factory?.address ?? ""} required />
          </Field>

          <Field label="Kota" htmlFor="city" error={state.fieldErrors?.city} required>
            <Input id="city" name="city" defaultValue={factory?.city ?? ""} required />
          </Field>

          <Field
            label="Nama kontak"
            htmlFor="contactPerson"
            hint="Orang yang menemui grader saat sampling."
            error={state.fieldErrors?.contactPerson}
            required
          >
            <Input
              id="contactPerson"
              name="contactPerson"
              defaultValue={factory?.contact_person ?? ""}
              required
            />
          </Field>

          <Field
            label="Telepon kontak"
            htmlFor="contactPhone"
            error={state.fieldErrors?.contactPhone}
            required
          >
            <Input
              id="contactPhone"
              name="contactPhone"
              inputMode="tel"
              defaultValue={factory?.contact_phone ?? ""}
              required
            />
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan profil"}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  );
}
