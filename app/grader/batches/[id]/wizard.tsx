"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { FileUploader } from "@/components/file-uploader";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
} from "@/components/grading-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { GradeStamp } from "@/components/ui/grade";
import { Panel, PanelBody } from "@/components/ui/panel";
import { ScoreInput } from "@/components/ui/score-input";
import { Steps } from "@/components/ui/steps";
import { submitGradingAction, type ActionState } from "../../actions";
import { ScoringError, computeGrading, type CategoryConfig, type GradingResult } from "@/lib/scoring";
import { formatWeight } from "@/lib/format";
import { BUCKETS } from "@/lib/storage";
import { ODOR_LEVELS, SAMPLE_POINT_LABELS } from "@/lib/text";
import type { SamplePointDb } from "@/lib/types/db";

const POINTS: SamplePointDb[] = ["top", "middle", "bottom"];
const STEP_LABELS = ["Sampling", "Kuantitas", "Dokumentasi", "Pratinjau"];

interface PointDraft {
  odorLevel: 1 | 2 | 3;
  notes: string;
  scores: Record<string, number>;
}

interface Draft {
  points: Record<SamplePointDb, PointDraft>;
  actualWeightKg: string;
  specMatchPct: string;
  quantityNotes: string;
  documentation: {
    hasProductionDate: boolean;
    hasMultiAnglePhotos: boolean;
    hasLotNumber: boolean;
    hasLabTest: boolean;
  };
}

function emptyDraft(category: CategoryConfig, defaults: Draft["documentation"]): Draft {
  const scores = Object.fromEntries(
    category.criteria
      .filter((c) => c.criterion !== "quantity_accuracy")
      .map((c) => [c.subKey, 70]),
  );

  return {
    points: {
      top: { odorLevel: 1, notes: "", scores: { ...scores } },
      middle: { odorLevel: 1, notes: "", scores: { ...scores } },
      bottom: { odorLevel: 1, notes: "", scores: { ...scores } },
    },
    actualWeightKg: "",
    specMatchPct: "",
    quantityNotes: "",
    documentation: defaults,
  };
}

/**
 * Wizard penilaian grader.
 *
 * Draft disimpan ke localStorage setiap perubahan — grader bekerja di lapangan
 * dengan sinyal buruk, dan kehilangan isian berarti mengulang seluruh sampling
 * (SRD Bab 6.3).
 *
 * Pratinjau memakai scoring engine yang sama persis dengan yang dipakai server,
 * bukan perkiraan terpisah. Engine murni tanpa I/O, jadi aman dijalankan di
 * browser.
 */
export function GradingWizard({
  batchId,
  category,
  claimedWeightKg,
  documentationDefaults,
  photoActions,
}: {
  batchId: string;
  category: CategoryConfig;
  claimedWeightKg: number;
  documentationDefaults: Draft["documentation"];
  photoActions: Record<SamplePointDb, (filePath: string) => Promise<{ error?: string }>>;
}) {
  const router = useRouter();
  const storageKey = `vms-grading-${batchId}`;

  const [step, setStep] = useState(0);
  const [activePoint, setActivePoint] = useState<SamplePointDb>("top");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(category, documentationDefaults));
  const [restored, setRestored] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setDraft(JSON.parse(stored) as Draft);
    } catch {
      // Draft rusak atau localStorage diblokir: mulai dari isian kosong.
    }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Penyimpanan penuh atau mode privat — form tetap bisa dipakai.
    }
  }, [draft, restored, storageKey]);

  const purity = category.criteria.filter((c) => c.criterion === "purity");
  const cleanliness = category.criteria.filter((c) => c.criterion === "cleanliness");

  function updatePoint(point: SamplePointDb, patch: Partial<PointDraft>) {
    setDraft((prev) => ({
      ...prev,
      points: { ...prev.points, [point]: { ...prev.points[point], ...patch } },
    }));
  }

  function updateScore(point: SamplePointDb, subKey: string, value: number) {
    setDraft((prev) => ({
      ...prev,
      points: {
        ...prev.points,
        [point]: {
          ...prev.points[point],
          scores: { ...prev.points[point].scores, [subKey]: value },
        },
      },
    }));
  }

  const preview = useMemo<{ result?: GradingResult; error?: string }>(() => {
    const actual = Number(draft.actualWeightKg.replace(",", "."));
    const spec = Number(draft.specMatchPct.replace(",", "."));
    if (!Number.isFinite(actual) || !Number.isFinite(spec)) {
      return { error: "Isi berat timbang ulang dan persentase kesesuaian spesifikasi dulu." };
    }

    try {
      return {
        result: computeGrading({
          category,
          samplePoints: POINTS.map((point) => ({
            point,
            odorLevel: draft.points[point].odorLevel,
            scores: draft.points[point].scores,
          })),
          quantity: { claimedWeightKg, actualWeightKg: actual, specMatchPct: spec },
          documentation: draft.documentation,
        }),
      };
    } catch (error) {
      if (error instanceof ScoringError) return { error: error.message };
      return { error: "Perhitungan gagal. Periksa kembali isian." };
    }
  }, [category, claimedWeightKg, draft]);

  function submit() {
    setSubmitError(null);
    startTransition(async () => {
      const result: ActionState = await submitGradingAction({
        batchId,
        samplePoints: POINTS.map((point) => ({
          point,
          odorLevel: draft.points[point].odorLevel,
          notes: draft.points[point].notes,
          scores: draft.points[point].scores,
        })),
        quantity: {
          actualWeightKg: Number(draft.actualWeightKg.replace(",", ".")),
          specMatchPct: Number(draft.specMatchPct.replace(",", ".")),
          notes: draft.quantityNotes,
        },
        documentation: draft.documentation,
      });

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Tidak masalah bila gagal dibersihkan.
      }
      router.refresh();
    });
  }

  const pointDraft = draft.points[activePoint];
  const overridden = pointDraft.odorLevel === 3;
  const odorSub = cleanliness.find((c) => c.isOdor);
  const cap = odorSub?.odorOverrideCap ?? 40;

  return (
    <Panel>
      <Steps steps={STEP_LABELS} current={step} />

      <PanelBody className="space-y-6">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-ink-muted">
                Ambil sampel di tiga titik berbeda dalam satu tumpukan: Atas, Tengah, Bawah.
              </p>
              <div className="mt-3 flex gap-2">
                {POINTS.map((point) => (
                  <button
                    key={point}
                    type="button"
                    onClick={() => setActivePoint(point)}
                    aria-pressed={activePoint === point}
                    className={`h-11 flex-1 rounded-[3px] border text-sm font-medium ${
                      activePoint === point
                        ? "border-brand bg-brand text-brand-ink"
                        : "border-line-strong bg-surface text-ink"
                    }`}
                  >
                    {SAMPLE_POINT_LABELS[point]}
                  </button>
                ))}
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">Kemurnian/Komposisi</legend>
              <div className="divide-y divide-line">
                {purity.map((sub) => (
                  <ScoreInput
                    key={sub.subKey}
                    id={`${activePoint}-${sub.subKey}`}
                    label={sub.label}
                    weightPct={sub.weightPct}
                    value={pointDraft.scores[sub.subKey] ?? 0}
                    onChange={(value) => updateScore(activePoint, sub.subKey, value)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-ink">Kebersihan & Kontaminasi</legend>

              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium text-ink">Level bau</p>
                {ODOR_LEVELS.map((level) => (
                  <label
                    key={level.level}
                    className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                  >
                    <input
                      type="radio"
                      name={`odor-${activePoint}`}
                      checked={pointDraft.odorLevel === level.level}
                      onChange={() => updatePoint(activePoint, { odorLevel: level.level })}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        Level {level.level} — {level.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{level.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {overridden ? (
                <p className="mt-3 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                  Override aktif. Skor kebersihan titik {SAMPLE_POINT_LABELS[activePoint]}{" "}
                  ditetapkan {cap}. Sub-kriteria di bawah tetap disimpan sebagai data mentah, tapi
                  tidak ikut dihitung.
                </p>
              ) : null}

              <div className="divide-y divide-line">
                {cleanliness.map((sub) => (
                  <ScoreInput
                    key={sub.subKey}
                    id={`${activePoint}-${sub.subKey}`}
                    label={sub.label}
                    weightPct={sub.weightPct}
                    value={pointDraft.scores[sub.subKey] ?? 0}
                    disabled={overridden}
                    onChange={(value) => updateScore(activePoint, sub.subKey, value)}
                  />
                ))}
              </div>
            </fieldset>

            <Field label="Catatan titik ini" htmlFor={`notes-${activePoint}`}>
              <Textarea
                id={`notes-${activePoint}`}
                value={pointDraft.notes}
                onChange={(event) => updatePoint(activePoint, { notes: event.target.value })}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                Foto titik {SAMPLE_POINT_LABELS[activePoint]}
              </p>
              <FileUploader
                batchId={batchId}
                bucket={BUCKETS.photos}
                label="Ambil / unggah foto titik ini"
                accept="image/*"
                onUploaded={photoActions[activePoint]}
              />
            </div>

            <Button type="button" size="block" onClick={() => setStep(1)}>
              Lanjut ke kuantitas
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <p className="text-sm text-ink-muted">
              Klaim pabrik: {formatWeight(claimedWeightKg)}. Timbang ulang seluruh batch, lalu catat
              berapa persen sampel yang sesuai spesifikasi klaim.
            </p>

            <Field label="Berat timbang ulang (kg)" htmlFor="actualWeightKg" required>
              <Input
                id="actualWeightKg"
                inputMode="decimal"
                value={draft.actualWeightKg}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, actualWeightKg: event.target.value }))
                }
              />
            </Field>

            <Field
              label="Sampel sesuai spesifikasi (%)"
              htmlFor="specMatchPct"
              hint="Berapa persen sampel yang ukuran/bentuknya sesuai klaim pabrik."
              required
            >
              <Input
                id="specMatchPct"
                inputMode="decimal"
                value={draft.specMatchPct}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, specMatchPct: event.target.value }))
                }
              />
            </Field>

            <Field label="Catatan" htmlFor="quantityNotes">
              <Textarea
                id="quantityNotes"
                value={draft.quantityNotes}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, quantityNotes: event.target.value }))
                }
              />
            </Field>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Kembali
              </Button>
              <Button type="button" className="flex-1" onClick={() => setStep(2)}>
                Lanjut
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <p className="text-sm text-ink-muted">
              Empat item, masing-masing 25 poin. Centang yang benar-benar ada pada batch ini.
            </p>

            <div className="space-y-2">
              <Checkbox
                label="Tanggal produksi tercantum"
                checked={draft.documentation.hasProductionDate}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    documentation: { ...prev.documentation, hasProductionDate: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Foto batch multi-sudut"
                checked={draft.documentation.hasMultiAnglePhotos}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    documentation: {
                      ...prev.documentation,
                      hasMultiAnglePhotos: event.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="Nomor lot / traceability"
                checked={draft.documentation.hasLotNumber}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    documentation: { ...prev.documentation, hasLotNumber: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Hasil uji tambahan (mis. uji lab)"
                checked={draft.documentation.hasLabTest}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    documentation: { ...prev.documentation, hasLabTest: event.target.checked },
                  }))
                }
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button type="button" className="flex-1" onClick={() => setStep(3)}>
                Lihat pratinjau
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            {preview.error ? (
              <p role="alert" className="border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
                {preview.error}
              </p>
            ) : preview.result ? (
              <>
                <GradeStamp
                  grade={preview.result.grade}
                  finalScore={preview.result.finalScore}
                />

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-ink">Kenapa skornya sekian</h3>
                  <FinalScoreBreakdown breakdown={preview.result.breakdown} />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink">Skor per titik</h3>
                  <SamplePointTable breakdown={preview.result.breakdown} />
                  <div className="mt-3">
                    <ConsistencyNote breakdown={preview.result.breakdown} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Versi rumus {preview.result.scoringVersion}</Badge>
                  <CopyButton
                    label="Salin ringkasan"
                    value={`Batch ${batchId} — grade ${preview.result.grade}, skor ${preview.result.finalScore}`}
                  />
                </div>
              </>
            ) : null}

            {submitError ? (
              <p role="alert" className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            ) : null}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Kembali
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={submit}
                disabled={pending || !preview.result}
              >
                {pending ? "Mengirim…" : "Submit hasil penilaian"}
              </Button>
            </div>

            <p className="text-sm text-ink-muted">
              Setelah disubmit, hasil masuk ke Admin untuk ditinjau. Sertifikat diterbitkan Admin,
              bukan grader.
            </p>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
