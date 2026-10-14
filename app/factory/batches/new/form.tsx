"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Panel, PanelBody } from "@/components/ui/panel";
import { Steps } from "@/components/ui/steps";
import { createBatchAction, type ActionState } from "../../actions";
import { claimedSpecSummary } from "@/lib/claims";
import {
  batchDraftSchema,
  claimedSpecDetailSchema,
  toNumber,
} from "@/lib/validation/schemas";
import {
  ACTIONS,
  BATCH_FORM_TEXT,
  CLAIM_TEXT,
  PUBLIC_TEXT,
  REVISION_TEXT,
} from "@/lib/text";
import type {
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";
const bundleFields = [
  "bundleCount",
  "unitsPerBundle",
  "crossSectionWidthCm",
  "crossSectionThicknessCm",
  "lengthCm",
  "crossSectionToleranceCm",
  "lengthToleranceCm",
] as const;
const weightFields = [
  "lengthMinCm",
  "lengthMaxCm",
  "lengthToleranceCm",
] as const;
const declarations = [
  "sourceIsProductionResidue",
  "noChemicalTreatment",
  "singleForm",
] as const;
export function NewBatchForm({
  categories,
  profiles,
}: {
  categories: MaterialCategoryRow[];
  profiles: MaterialFormProfileRow[];
}) {
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [wood, setWood] = useState("");
  const [weight, setWeight] = useState("");
  const [spec, setSpec] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState({
    productionDate: "",
    lotNumber: "",
    description: "",
  });
  const [checked, setChecked] = useState<
    Record<(typeof declarations)[number], boolean>
  >({
    sourceIsProductionResidue: false,
    noChemicalTreatment: false,
    singleForm: false,
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, data: FormData) => {
      const result = await createBatchAction(prev, data);
      const first = Object.keys(result.fieldErrors ?? {})[0];
      if (first)
        setStep(
          first.startsWith("declarations")
            ? 3
            : ["categoryId", "formProfileId"].includes(first)
              ? 0
              : ["productionDate", "lotNumber", "description"].includes(first)
                ? 2
                : 1,
        );
      return result;
    },
    {},
  );
  const errors = { ...state.fieldErrors, ...localErrors };
  const live = categories.filter((c) => c.status === "live");
  const profile = profiles.find(
    (p) => p.id === profileId && p.category_id === categoryId,
  );
  const claim = { ...spec, claimMode: profile?.claim_mode ?? "bundle" };
  const parsedSpec = claimedSpecDetailSchema.safeParse(claim);
  const summary =
    parsedSpec.success &&
    profile &&
    wood.trim().length >= 2 &&
    toNumber(weight) > 0
      ? claimedSpecSummary(
          parsedSpec.data,
          profile,
          wood.trim(),
          toNumber(weight),
        )
      : null;
  const values = {
    categoryId,
    formProfileId: profileId,
    declaredMaterialType: wood,
    claimedWeightKg: weight,
    claimedSpecDetail: claim,
    ...detail,
    declarations: checked,
  };
  function next() {
    const schema =
      step === 0
        ? batchDraftSchema.pick({ categoryId: true, formProfileId: true })
        : step === 1
          ? batchDraftSchema.pick({
              declaredMaterialType: true,
              claimedWeightKg: true,
              claimedSpecDetail: true,
            })
          : batchDraftSchema.pick({
              productionDate: true,
              lotNumber: true,
              description: true,
            });
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setLocalErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      return;
    }
    setLocalErrors({});
    setStep(step + 1);
  }
  function clearError(key: string) {
    setLocalErrors((prev) => ({ ...prev, [key]: "" }));
  }
  if (!live.length)
    return (
      <Panel>
        <PanelBody>
          <p className="text-ink-muted">{BATCH_FORM_TEXT.noCategories}</p>
        </PanelBody>
      </Panel>
    );
  return (
    <Panel>
      <Steps steps={BATCH_FORM_TEXT.steps} current={step} />
      <PanelBody>
        <form action={formAction} noValidate className="space-y-5">
          <input
            type="hidden"
            name="claimedSpecDetail"
            value={JSON.stringify(claim)}
          />
          {state.error ? (
            <p
              role="alert"
              className="rounded-xl border border-danger bg-danger-soft p-3 text-sm text-danger"
            >
              {state.error}
            </p>
          ) : null}
          <div className={step === 0 ? "space-y-5" : "hidden"}>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-ink">
                {CLAIM_TEXT.category}
              </legend>
              {live.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="radio"
                    name="categoryId"
                    value={c.id}
                    checked={categoryId === c.id}
                    onChange={() => {
                      setCategoryId(c.id);
                      setProfileId("");
                      clearError("categoryId");
                    }}
                    className="mt-1 size-5 shrink-0 accent-[var(--brand)]"
                  />
                  <span>
                    <span className="block font-semibold text-ink">
                      {c.name}
                    </span>
                    <span className="block text-sm text-ink-muted">
                      {c.short_description}
                    </span>
                  </span>
                </label>
              ))}
              {errors.categoryId ? (
                <p role="alert" className="text-sm text-danger">
                  {errors.categoryId}
                </p>
              ) : null}
              {categories
                .filter((c) => c.status === "coming_soon")
                .map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-dashed border-line-strong bg-surface-sunken p-3"
                  >
                    <p className="font-medium text-ink-muted">
                      {c.name} · {PUBLIC_TEXT.comingSoonBadge}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {REVISION_TEXT.comingSoon}
                    </p>
                  </div>
                ))}
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold text-ink">
                {CLAIM_TEXT.formProfile}
              </legend>
              {profiles
                .filter((p) => p.category_id === categoryId)
                .map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                  >
                    <input
                      type="radio"
                      name="formProfileId"
                      value={p.id}
                      checked={profileId === p.id}
                      onChange={() => {
                        setProfileId(p.id);
                        setSpec({});
                        clearError("formProfileId");
                      }}
                      className="mt-1 size-5 shrink-0 accent-[var(--brand)]"
                    />
                    <span>
                      <span className="block font-semibold text-ink">
                        {p.name}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {p.description}
                      </span>
                    </span>
                  </label>
                ))}
              <p className="text-sm text-ink-muted">
                {REVISION_TEXT.singleFormNote}
              </p>
              {errors.formProfileId ? (
                <p role="alert" className="text-sm text-danger">
                  {errors.formProfileId}
                </p>
              ) : null}
            </fieldset>
          </div>
          <div className={step === 1 ? "space-y-5" : "hidden"}>
            <Field
              label={CLAIM_TEXT.declaredMaterialType}
              htmlFor="declaredMaterialType"
              required
              error={errors.declaredMaterialType}
            >
              <Input
                id="declaredMaterialType"
                name="declaredMaterialType"
                value={wood}
                placeholder={CLAIM_TEXT.woodExample}
                onChange={(e) => {
                  setWood(e.target.value);
                  clearError("declaredMaterialType");
                }}
                maxLength={80}
              />
            </Field>
            <Field
              label={CLAIM_TEXT.claimedWeightKg}
              htmlFor="claimedWeightKg"
              required
              hint={CLAIM_TEXT.weightHint}
              error={errors.claimedWeightKg}
            >
              <Input
                id="claimedWeightKg"
                name="claimedWeightKg"
                inputMode="decimal"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  clearError("claimedWeightKg");
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {(profile?.claim_mode === "weight"
                ? weightFields
                : bundleFields
              ).map((key) => (
                <Field
                  key={key}
                  label={CLAIM_TEXT[key]}
                  htmlFor={key}
                  required
                  error={errors[`claimedSpecDetail.${key}`]}
                  hint={
                    key.includes("Tolerance")
                      ? CLAIM_TEXT.toleranceHint
                      : undefined
                  }
                >
                  <Input
                    id={key}
                    inputMode={
                      key === "bundleCount" || key === "unitsPerBundle"
                        ? "numeric"
                        : "decimal"
                    }
                    value={spec[key] ?? ""}
                    onChange={(e) => {
                      setSpec((s) => ({ ...s, [key]: e.target.value }));
                      clearError(`claimedSpecDetail.${key}`);
                    }}
                  />
                </Field>
              ))}
            </div>
            {profile?.claim_mode === "weight" ? (
              <Field
                label={CLAIM_TEXT.crossSectionNote}
                htmlFor="crossSectionNote"
              >
                <Input
                  id="crossSectionNote"
                  value={spec.crossSectionNote ?? ""}
                  maxLength={120}
                  placeholder={CLAIM_TEXT.crossSectionExample}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, crossSectionNote: e.target.value }))
                  }
                />
              </Field>
            ) : null}
            <div
              aria-live="polite"
              className="rounded-xl bg-surface-sunken p-3 text-sm"
            >
              <p className="mb-1 font-semibold text-ink">
                {CLAIM_TEXT.summary}
              </p>
              <p className="text-ink-muted">
                {summary ?? BATCH_FORM_TEXT.previewHint}
              </p>
            </div>
          </div>
          <div className={step === 2 ? "space-y-5" : "hidden"}>
            <Field
              label={BATCH_FORM_TEXT.productionDate}
              htmlFor="productionDate"
              hint={BATCH_FORM_TEXT.documentationHint}
              error={errors.productionDate}
            >
              <Input
                type="date"
                id="productionDate"
                name="productionDate"
                value={detail.productionDate}
                onChange={(e) =>
                  setDetail((d) => ({ ...d, productionDate: e.target.value }))
                }
              />
            </Field>
            <Field
              label={BATCH_FORM_TEXT.lotNumber}
              htmlFor="lotNumber"
              hint={BATCH_FORM_TEXT.documentationHint}
              error={errors.lotNumber}
            >
              <Input
                id="lotNumber"
                name="lotNumber"
                value={detail.lotNumber}
                maxLength={80}
                onChange={(e) =>
                  setDetail((d) => ({ ...d, lotNumber: e.target.value }))
                }
              />
            </Field>
            <Field
              label={BATCH_FORM_TEXT.description}
              htmlFor="description"
              error={errors.description}
            >
              <Textarea
                id="description"
                name="description"
                value={detail.description}
                maxLength={1000}
                onChange={(e) =>
                  setDetail((d) => ({ ...d, description: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className={step === 3 ? "space-y-4" : "hidden"}>
            <p className="rounded-xl bg-surface-sunken p-3 text-sm leading-relaxed text-ink">
              {summary}
            </p>
            {declarations.map((key) => (
              <div key={key}>
                <Checkbox
                  name={key}
                  label={REVISION_TEXT.declarations[key]}
                  checked={checked[key]}
                  onChange={(e) => {
                    setChecked((c) => ({ ...c, [key]: e.target.checked }));
                    clearError(`declarations.${key}`);
                  }}
                />
                {errors[`declarations.${key}`] ? (
                  <p role="alert" className="mt-1 text-sm text-danger">
                    {errors[`declarations.${key}`]}
                  </p>
                ) : null}
              </div>
            ))}
            <p className="text-sm text-ink-muted">
              {REVISION_TEXT.declarationNote}
            </p>
            <p className="text-sm text-ink-muted">
              {BATCH_FORM_TEXT.afterSave}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={pending}
              >
                {ACTIONS.back}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="button" onClick={next}>
                {ACTIONS.next}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending || !Object.values(checked).every(Boolean)}
              >
                {pending ? BATCH_FORM_TEXT.saving : BATCH_FORM_TEXT.save}
              </Button>
            )}
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
