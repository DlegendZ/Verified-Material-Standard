"use client";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { FileUploader } from "@/components/file-uploader";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
  QuantityDetail,
} from "@/components/grading-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { GradeStamp } from "@/components/ui/grade";
import { Panel, PanelBody } from "@/components/ui/panel";
import { ScoreInput } from "@/components/ui/score-input";
import { UnitCountInput } from "@/components/ui/unit-count-input";
import { Steps } from "@/components/ui/steps";
import {
  rejectNonB3FindingAction,
  submitGradingAction,
  type ActionState,
} from "../../actions";
import {
  ScoringError,
  computeGrading,
  computeQuantity,
  computeSamplePoint,
  odorOverrideCapOf,
  type CategoryConfig,
  type DocumentationInput,
  type GradingResult,
  type MeasurementMethod,
  type SamplePointInput,
} from "@/lib/scoring";
import { canonicalCountChecks } from "@/lib/grading-input";
import { toFormProfile } from "@/lib/category-config";
import { toNumber, type ClaimedSpecDetail } from "@/lib/validation/schemas";
import { BUCKETS } from "@/lib/storage";
import {
  ACTIONS,
  GRADER_TEXT,
  ODOR_LEVELS,
  REVISION_TEXT,
  SAMPLE_POINT_LABELS,
} from "@/lib/text";
import type {
  GradeDb,
  MaterialFormProfileRow,
  SamplePointDb,
} from "@/lib/types/db";
const POINTS = ["top", "middle", "bottom"] as const;
const pointDraftSchema = z.object({
  odorLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  notes: z.string(),
  scores: z.record(z.string(), z.number().min(0).max(100)),
  unitsPassed: z.record(z.string(), z.string()),
  measurementMethods: z.record(
    z.string(),
    z.enum(["moisture_meter", "touch_estimate"]),
  ),
});
const draftSchema = z.object({
  points: z.object({
    top: pointDraftSchema,
    middle: pointDraftSchema,
    bottom: pointDraftSchema,
  }),
  actualWeightKg: z.string(),
  counts: z.record(z.string(), z.string()),
  specUnitsPassed: z.string(),
  specUnitsChecked: z.string(),
  weighingMoistureNote: z.string(),
  quantityNotes: z.string(),
  documentation: z.object({
    hasProductionDate: z.boolean(),
    hasMultiAnglePhotos: z.boolean(),
    hasLotNumber: z.boolean(),
    hasLabTest: z.boolean(),
  }),
});
type Draft = z.infer<typeof draftSchema>;
type PointDraft = z.infer<typeof pointDraftSchema>;
function emptyDraft(
  profile: MaterialFormProfileRow,
  documentation: DocumentationInput,
): Draft {
  const point = (): PointDraft => ({
    odorLevel: 1,
    notes: "",
    scores: {},
    unitsPassed: {},
    measurementMethods: {},
  });
  return {
    points: { top: point(), middle: point(), bottom: point() },
    actualWeightKg: "",
    counts: {},
    specUnitsPassed: "",
    specUnitsChecked: String(profile.units_per_point * 3),
    weighingMoistureNote: "",
    quantityNotes: "",
    documentation,
  };
}
export function GradingWizard({
  batchId,
  category,
  profile,
  claimedWeightKg,
  claimedSpecDetail,
  gradeMeanings,
  odorLevel3Hint,
  documentationDefaults,
  photoActions,
}: {
  batchId: string;
  category: CategoryConfig;
  profile: MaterialFormProfileRow;
  claimedWeightKg: number;
  claimedSpecDetail: ClaimedSpecDetail;
  gradeMeanings: Record<GradeDb, string> | null;
  documentationDefaults: DocumentationInput;
  odorLevel3Hint: string | null;
  photoActions: Record<
    SamplePointDb,
    (filePath: string) => Promise<{ error?: string }>
  >;
}) {
  const router = useRouter();
  const storageKey = `vms-grading-v2-${batchId}`;
  const [step, setStep] = useState(0);
  const [activePoint, setActivePoint] = useState<SamplePointDb>("top");
  const [draft, setDraft] = useState<Draft>(() =>
    emptyDraft(profile, documentationDefaults),
  );
  const [restored, setRestored] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nonB3Reconfirmed, setNonB3Reconfirmed] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [findingNotes, setFindingNotes] = useState("");
  const [findingState, findingAction, findingPending] = useActionState(
    async (prev: ActionState, data: FormData) => {
      const result = await rejectNonB3FindingAction(batchId, prev, data);
      if (result.ok) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        router.refresh();
      }
      return result;
    },
    {},
  );
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = draftSchema.safeParse(JSON.parse(stored));
        if (parsed.success) setDraft(parsed.data);
      }
    } catch {}
    setRestored(true);
  }, [storageKey]);
  useEffect(() => {
    if (restored) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {}
    }
  }, [draft, restored, storageKey]);
  const samplingProfile = toFormProfile(profile);
  function updatePoint(point: SamplePointDb, patch: Partial<PointDraft>) {
    setDraft((d) => ({
      ...d,
      points: { ...d.points, [point]: { ...d.points[point], ...patch } },
    }));
  }
  function updateScore(key: string, value: number | undefined) {
    const scores = { ...draft.points[activePoint].scores };
    if (value === undefined) delete scores[key];
    else scores[key] = value;
    updatePoint(activePoint, { scores });
  }
  const pointInputs: SamplePointInput[] = POINTS.map((point) => ({
    point,
    odorLevel: draft.points[point].odorLevel,
    scores: draft.points[point].scores,
    unitCounts: Object.fromEntries(
      Object.entries(draft.points[point].unitsPassed)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [
          key,
          { passed: Number(value), checked: profile.units_per_point },
        ]),
    ),
    measurementMethods: draft.points[point].measurementMethods,
  }));
  function quantityInput() {
    const observations = POINTS.map((point) => ({
      key: `units_per_bundle_${point}`,
      observed: toNumber(draft.counts[point]),
    }));
    if (draft.counts.bundle_count?.trim())
      observations.push({
        key: "bundle_count",
        observed: toNumber(draft.counts.bundle_count),
      });
    return {
      claimedWeightKg,
      actualWeightKg: toNumber(draft.actualWeightKg),
      countChecks: canonicalCountChecks(claimedSpecDetail, observations),
      specUnits: {
        passed: toNumber(draft.specUnitsPassed),
        checked: toNumber(draft.specUnitsChecked),
      },
    };
  }
  const preview = useMemo<{ result?: GradingResult; error?: string }>(() => {
    try {
      return {
        result: computeGrading({
          category,
          samplingProfile: toFormProfile(profile),
          samplePoints: pointInputs,
          quantity: quantityInput(),
          documentation: draft.documentation,
        }),
      };
    } catch (error) {
      return {
        error:
          error instanceof ScoringError
            ? error.message
            : GRADER_TEXT.calculationError,
      };
    }
    // Payload diturunkan sepenuhnya dari konfigurasi dan draft pada render ini.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, profile, claimedWeightKg, claimedSpecDetail, draft]);
  let quantityPreview: ReturnType<typeof computeQuantity> | null = null;
  try {
    quantityPreview = computeQuantity(
      category,
      quantityInput(),
      samplingProfile,
    );
  } catch {}
  const complete = POINTS.map((point) => {
    try {
      computeSamplePoint(
        category,
        pointInputs.find((p) => p.point === point)!,
        samplingProfile,
      );
      return true;
    } catch {
      return false;
    }
  });
  function submit() {
    if (!nonB3Reconfirmed || !preview.result) return;
    setSubmitError(null);
    startTransition(async () => {
      const q = quantityInput();
      const result = await submitGradingAction({
        batchId,
        nonB3Reconfirmed,
        samplePoints: pointInputs.map((p) => ({
          ...p,
          notes: draft.points[p.point].notes,
        })),
        quantity: {
          actualWeightKg: q.actualWeightKg,
          countChecks: q.countChecks.map(({ key, observed, label }) => ({
            key,
            observed,
            label,
          })),
          specUnitsPassed: q.specUnits.passed,
          specUnitsChecked: q.specUnits.checked,
          weighingMoistureNote: draft.weighingMoistureNote,
          notes: draft.quantityNotes,
        },
        documentation: draft.documentation,
      });
      if (result.error) setSubmitError(result.error);
      else if (result.ok) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
        router.refresh();
      }
    });
  }
  const p = draft.points[activePoint];
  const overridden = p.odorLevel === 3;
  function renderSub(sub: CategoryConfig["criteria"][number]) {
    const disabled =
      pending ||
      findingPending ||
      (sub.criterion === "cleanliness" && overridden);
    return (
      <div key={sub.subKey}>
        {sub.scoringMethod === "unit_count" ? (
          <UnitCountInput
            id={`${activePoint}-${sub.subKey}`}
            label={sub.label}
            hint={sub.helpText}
            checked={profile.units_per_point}
            unitLabel={profile.unit_label}
            value={p.unitsPassed[sub.subKey] ?? ""}
            disabled={disabled}
            onChange={(value) =>
              updatePoint(activePoint, {
                unitsPassed: { ...p.unitsPassed, [sub.subKey]: value },
              })
            }
          />
        ) : (
          <ScoreInput
            id={`${activePoint}-${sub.subKey}`}
            label={sub.label}
            hint={sub.helpText ?? undefined}
            weightPct={sub.weightPct}
            value={p.scores[sub.subKey]}
            disabled={disabled}
            onChange={(value) => updateScore(sub.subKey, value)}
          />
        )}
        {sub.requiresMeasurementMethod ? (
          <fieldset className="mb-3 space-y-2">
            <legend className="mb-2 text-sm font-medium text-ink">
              {GRADER_TEXT.method}
            </legend>
            {(["moisture_meter", "touch_estimate"] as const).map((method) => (
              <label
                key={method}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line p-3"
              >
                <input
                  type="radio"
                  name={`${activePoint}-${sub.subKey}-method`}
                  checked={p.measurementMethods[sub.subKey] === method}
                  disabled={disabled}
                  onChange={() =>
                    updatePoint(activePoint, {
                      measurementMethods: {
                        ...p.measurementMethods,
                        [sub.subKey]: method as MeasurementMethod,
                      },
                    })
                  }
                  className="size-5 accent-[var(--brand)]"
                />
                <span className="text-sm text-ink">
                  {method === "moisture_meter"
                    ? GRADER_TEXT.moistureMeter
                    : GRADER_TEXT.touchEstimate}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
      </div>
    );
  }
  return (
    <Panel>
      <Steps steps={GRADER_TEXT.steps} current={step} />
      <PanelBody className="space-y-5">
        {step === 0 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {POINTS.map((point, i) => (
                <Button
                  key={point}
                  type="button"
                  variant={activePoint === point ? "primary" : "outline"}
                  onClick={() => setActivePoint(point)}
                  className="h-auto min-h-11 flex-col px-2 py-2"
                >
                  {SAMPLE_POINT_LABELS[point]}
                  <span className="block text-xs">
                    {complete[i]
                      ? `✓ ${GRADER_TEXT.completePoint}`
                      : GRADER_TEXT.incompletePoint}
                  </span>
                </Button>
              ))}
            </div>
            <fieldset>
              <legend className="text-base font-semibold text-ink">
                {GRADER_TEXT.speciesPurity}
              </legend>
              {category.criteria
                .filter((s) => s.criterion === "purity")
                .map(renderSub)}
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-base font-semibold text-ink">
                {GRADER_TEXT.cleanliness}
              </legend>
              <div className="space-y-2">
                {ODOR_LEVELS.map((level) => (
                  <label
                    key={level.level}
                    className="flex cursor-pointer gap-3 rounded-xl border border-line p-3"
                  >
                    <input
                      type="radio"
                      name={`${activePoint}-odor-level`}
                      checked={p.odorLevel === level.level}
                      disabled={pending || findingPending}
                      onChange={() =>
                        updatePoint(activePoint, { odorLevel: level.level })
                      }
                      className="mt-1 size-5 accent-[var(--brand)]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {level.level} · {level.label}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {level.level === 3
                          ? (odorLevel3Hint ?? level.hint)
                          : level.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {overridden ? (
                <p
                  role="status"
                  className="rounded-xl bg-warning-soft p-3 text-sm text-warning"
                >
                  {GRADER_TEXT.overrideNotice(odorOverrideCapOf(category))}
                </p>
              ) : null}
              {category.criteria
                .filter((s) => s.criterion === "cleanliness")
                .map(renderSub)}
            </fieldset>
            <Field label={GRADER_TEXT.notes} htmlFor={`notes-${activePoint}`}>
              <Textarea
                id={`notes-${activePoint}`}
                value={p.notes}
                maxLength={500}
                onChange={(e) =>
                  updatePoint(activePoint, { notes: e.target.value })
                }
              />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {GRADER_TEXT.photoTitle(SAMPLE_POINT_LABELS[activePoint])}
              </p>
              <FileUploader
                batchId={batchId}
                bucket={BUCKETS.photos}
                label={GRADER_TEXT.pointPhoto}
                accept="image/*"
                onUploaded={photoActions[activePoint]}
              />
            </div>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="space-y-5">
            <Field
              label={GRADER_TEXT.actualWeight}
              htmlFor="actualWeightKg"
              required
            >
              <Input
                id="actualWeightKg"
                inputMode="decimal"
                value={draft.actualWeightKg}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, actualWeightKg: e.target.value }))
                }
              />
            </Field>
            <Field
              label={GRADER_TEXT.weighingMoistureNote}
              htmlFor="weighingMoistureNote"
              hint={GRADER_TEXT.weighingMoistureHint}
            >
              <Input
                id="weighingMoistureNote"
                value={draft.weighingMoistureNote}
                maxLength={200}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    weighingMoistureNote: e.target.value,
                  }))
                }
              />
            </Field>
            {profile.claim_mode === "bundle" &&
            claimedSpecDetail.claimMode === "bundle" ? (
              <div className="space-y-3">
                {POINTS.map((point) => (
                  <Field
                    key={point}
                    label={GRADER_TEXT.bundleObserved(
                      SAMPLE_POINT_LABELS[point],
                    )}
                    htmlFor={`count-${point}`}
                    hint={GRADER_TEXT.claimedCount(
                      claimedSpecDetail.unitsPerBundle,
                    )}
                    required
                  >
                    <Input
                      id={`count-${point}`}
                      inputMode="numeric"
                      value={draft.counts[point] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          counts: { ...d.counts, [point]: e.target.value },
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field
                  label={GRADER_TEXT.bundleCountObserved}
                  htmlFor="bundleCountObserved"
                  hint={GRADER_TEXT.claimedCount(claimedSpecDetail.bundleCount)}
                >
                  <Input
                    id="bundleCountObserved"
                    inputMode="numeric"
                    value={draft.counts.bundle_count ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        counts: { ...d.counts, bundle_count: e.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
            ) : null}
            <Field
              label={GRADER_TEXT.unitsChecked}
              htmlFor="specUnitsChecked"
              required
            >
              <Input
                id="specUnitsChecked"
                inputMode="numeric"
                value={draft.specUnitsChecked}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, specUnitsChecked: e.target.value }))
                }
              />
            </Field>
            <UnitCountInput
              id="specUnitsPassed"
              label={GRADER_TEXT.dimensionUnits}
              checked={Number(draft.specUnitsChecked) || 0}
              unitLabel={profile.unit_label}
              value={draft.specUnitsPassed}
              onChange={(value) =>
                setDraft((d) => ({ ...d, specUnitsPassed: value }))
              }
            />
            <Field label={GRADER_TEXT.quantityNotes} htmlFor="quantityNotes">
              <Textarea
                id="quantityNotes"
                value={draft.quantityNotes}
                maxLength={500}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, quantityNotes: e.target.value }))
                }
              />
            </Field>
            {quantityPreview ? (
              <QuantityDetail
                breakdown={{ quantity: quantityPreview }}
                weighingMoistureNote={draft.weighingMoistureNote}
              />
            ) : null}
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              {GRADER_TEXT.documentationHint}
            </p>
            {GRADER_TEXT.documentationItems.map(({ key, label }) => (
              <Checkbox
                key={key}
                label={label}
                checked={draft.documentation[key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    documentation: {
                      ...d.documentation,
                      [key]: e.target.checked,
                    },
                  }))
                }
              />
            ))}
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-5">
            {preview.error ? (
              <p
                role="alert"
                className="rounded-xl bg-warning-soft p-3 text-sm text-warning"
              >
                {preview.error}
              </p>
            ) : preview.result ? (
              <>
                <GradeStamp
                  grade={preview.result.grade}
                  finalScore={preview.result.finalScore}
                />
                <FinalScoreBreakdown breakdown={preview.result.breakdown} />
                <SamplePointTable breakdown={preview.result.breakdown} />
                <ConsistencyNote breakdown={preview.result.breakdown} />
                <QuantityDetail
                  breakdown={preview.result.breakdown}
                  weighingMoistureNote={draft.weighingMoistureNote}
                />
                <GradeMeaningTable
                  categoryName={category.name}
                  meanings={gradeMeanings}
                  grade={preview.result.grade}
                />
                <Badge tone="neutral">
                  {GRADER_TEXT.formulaVersion} {preview.result.scoringVersion}
                </Badge>
              </>
            ) : null}
            <Checkbox
              label={REVISION_TEXT.nonB3ReconfirmLabel}
              checked={nonB3Reconfirmed}
              onChange={(e) => setNonB3Reconfirmed(e.target.checked)}
            />
            {submitError ? (
              <p role="alert" className="text-sm text-danger">
                {submitError}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || findingPending}
              onClick={() => setStep(step - 1)}
            >
              {ACTIONS.back}
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              disabled={pending || findingPending}
              onClick={() => setStep(step + 1)}
            >
              {ACTIONS.next}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                pending ||
                findingPending ||
                !preview.result ||
                !nonB3Reconfirmed
              }
              onClick={submit}
            >
              {pending ? GRADER_TEXT.submitting : GRADER_TEXT.submit}
            </Button>
          )}
        </div>
        <div className="border-t border-line pt-4">
          <Button
            type="button"
            variant="danger"
            disabled={pending || findingPending}
            onClick={() => setFindingOpen(true)}
          >
            {REVISION_TEXT.nonB3FindingButton}
          </Button>
        </div>
        {findingOpen ? (
          <form
            action={findingAction}
            className="space-y-3 rounded-xl border border-danger bg-danger-soft p-4"
            aria-label={REVISION_TEXT.nonB3FindingTitle}
          >
            <h3 className="font-semibold text-danger">
              {REVISION_TEXT.nonB3FindingTitle}
            </h3>
            <p className="text-sm leading-relaxed text-ink">
              {REVISION_TEXT.nonB3FindingBody}
            </p>
            <Field
              label={GRADER_TEXT.gateNotes}
              htmlFor="nonB3FindingNotes"
              error={findingState.fieldErrors?.notes}
              required
            >
              <Textarea
                id="nonB3FindingNotes"
                name="notes"
                value={findingNotes}
                onChange={(e) => setFindingNotes(e.target.value)}
                placeholder={REVISION_TEXT.nonB3FindingPlaceholder}
                maxLength={1000}
              />
            </Field>
            {findingState.error ? (
              <p role="alert" className="text-sm text-danger">
                {findingState.error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="danger"
                disabled={findingPending || findingNotes.trim().length < 10}
              >
                {REVISION_TEXT.nonB3FindingConfirm}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={findingPending}
                onClick={() => setFindingOpen(false)}
              >
                {REVISION_TEXT.nonB3FindingCancel}
              </Button>
            </div>
          </form>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
