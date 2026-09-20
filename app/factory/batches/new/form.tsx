"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { Steps } from "@/components/ui/steps";
import { createBatchAction, type ActionState } from "../../actions";
import type { MaterialCategoryRow } from "@/lib/types/db";

const initialState: ActionState = {};
const STEPS = ["Material & klaim", "Detail batch"];

/**
 * Pengajuan bertahap. Berkas (foto & dokumen asal-usul) diunggah setelah draft
 * dibuat, karena file butuh batch_id sebagai tempat menautkannya.
 */
export function NewBatchForm({ categories }: { categories: MaterialCategoryRow[] }) {
  const [state, formAction, pending] = useActionState(createBatchAction, initialState);
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [weight, setWeight] = useState("");

  const live = categories.filter((c) => c.status === "live");
  const comingSoon = categories.filter((c) => c.status === "coming_soon");
  const canContinue = categoryId !== "" && weight.trim() !== "" && Number(weight) > 0;

  return (
    <Panel>
      <Steps steps={STEPS} current={step} />
      <PanelBody>
        <form action={formAction} className="space-y-5">
          {state.error ? (
            <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className={step === 0 ? "space-y-5" : "hidden"}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Kategori material *</legend>
              <p className="text-sm text-ink-muted">
                Sub-kriteria penilaian berbeda tiap kategori.
              </p>
              <div className="space-y-2 pt-1">
                {live.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                  >
                    <input
                      type="radio"
                      name="categoryId"
                      value={category.id}
                      checked={categoryId === category.id}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                      required
                    />
                    <span className="text-sm font-medium text-ink">{category.name}</span>
                  </label>
                ))}

                {comingSoon.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-start gap-3 border border-dashed border-line-strong bg-surface-sunken p-3 opacity-80"
                  >
                    <span className="mt-0.5 size-5 shrink-0 rounded-full border border-line-strong" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-muted">
                        {category.name} — segera hadir
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">
                        Penilaian kategori ini butuh alat lab, jadi belum bisa diajukan.
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {state.fieldErrors?.categoryId ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {state.fieldErrors.categoryId}
                </p>
              ) : null}
            </fieldset>

            <Field
              label="Klaim berat (kg)"
              htmlFor="claimedWeightKg"
              hint="Berat total batch menurut pabrik. Grader akan menimbang ulang."
              error={state.fieldErrors?.claimedWeightKg}
              required
            >
              <Input
                id="claimedWeightKg"
                name="claimedWeightKg"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </Field>

            <Button type="button" onClick={() => setStep(1)} disabled={!canContinue}>
              Lanjut ke detail
            </Button>
          </div>

          <div className={step === 1 ? "space-y-5" : "hidden"}>
            <Field
              label="Klaim spesifikasi"
              htmlFor="claimedSpec"
              hint="Contoh: potongan 20–30 cm, katun 100%, warna gelap."
              error={state.fieldErrors?.claimedSpec}
            >
              <Textarea id="claimedSpec" name="claimedSpec" />
            </Field>

            <Field
              label="Tanggal produksi"
              htmlFor="productionDate"
              hint="Menambah 25 poin pada kelengkapan dokumentasi."
              error={state.fieldErrors?.productionDate}
            >
              <Input id="productionDate" name="productionDate" type="date" />
            </Field>

            <Field
              label="Nomor lot / traceability"
              htmlFor="lotNumber"
              hint="Menambah 25 poin pada kelengkapan dokumentasi."
              error={state.fieldErrors?.lotNumber}
            >
              <Input id="lotNumber" name="lotNumber" />
            </Field>

            <Field label="Catatan tambahan" htmlFor="description" error={state.fieldErrors?.description}>
              <Textarea id="description" name="description" />
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Kembali
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan draft batch"}
              </Button>
            </div>
            <p className="text-sm text-ink-muted">
              Setelah draft tersimpan, unggah foto dan dokumen asal-usul di halaman batch, lalu
              tekan Ajukan.
            </p>
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
