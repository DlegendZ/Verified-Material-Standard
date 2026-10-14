import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { formatScore } from "@/lib/format";
import { normalizeBreakdown } from "@/lib/breakdown";
import { SAMPLE_POINT_LABELS, GRADER_TEXT } from "@/lib/text";

/** Rincian lima kriteria beserta bobot dan kontribusinya ke skor akhir. */
export function FinalScoreBreakdown({
  breakdown: raw,
  scoringVersion = "2.0.0",
}: {
  breakdown: unknown;
  scoringVersion?: string;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  return (
    <div className="divide-y divide-line">
      {breakdown.final.map((row) => (
        <ScoreBar
          key={row.key}
          label={row.label}
          score={row.score}
          weightPct={row.weightPct}
          contribution={row.contribution}
        />
      ))}
    </div>
  );
}

/**
 * Tabel skor per titik sampel. Titik yang terkena override bau ditandai
 * eksplisit — ini informasi paling sering jadi pertanyaan pembeli.
 */
export function SamplePointTable({
  breakdown: raw,
  scoringVersion = "2.0.0",
}: {
  breakdown: unknown;
  scoringVersion?: string;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              Titik
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              Kemurnian
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              Kebersihan
            </th>
            <th scope="col" className="py-2 font-medium text-ink-muted">
              Bau
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.samplePoints.map((point) => (
            <tr
              key={point.point}
              className="border-b border-line last:border-b-0"
            >
              <th
                scope="row"
                className="py-2.5 pr-4 text-left font-medium text-ink"
              >
                {SAMPLE_POINT_LABELS[point.point]}
              </th>
              <td className="py-2.5 pr-4 font-mono tabular text-ink">
                {formatScore(point.purity)}
              </td>
              <td className="py-2.5 pr-4">
                <span className="font-mono tabular text-ink">
                  {formatScore(point.cleanliness)}
                </span>
                {point.cleanlinessOverridden ? (
                  <Badge tone="danger" className="ml-2">
                    override bau
                  </Badge>
                ) : null}
              </td>
              <td className="py-2.5 font-mono tabular text-ink-muted">
                Level {point.odorLevel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {breakdown.samplePoints.some((point) => point.cleanlinessOverridden) ? (
        <p className="mt-3 text-sm text-ink-muted">
          Bau level 3 terdeteksi di salah satu titik. Skor kebersihan titik itu
          ditetapkan ke{" "}
          {formatScore(
            breakdown.samplePoints.find((point) => point.cleanlinessOverridden)
              ?.cleanlinessOverrideCap ?? 40,
          )}
          , dan sub-kriteria kebersihan lain di titik itu tidak ikut dihitung.
        </p>
      ) : null}
    </div>
  );
}

/** Penjelasan naratif kenapa konsistensi batch bernilai sekian. */
export function ConsistencyNote({
  breakdown: raw,
  scoringVersion = "2.0.0",
}: {
  breakdown: unknown;
  scoringVersion?: string;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  const { consistency } = breakdown;
  const levelText = {
    small: "kecil",
    medium: "sedang",
    large: "besar",
  }[consistency.appliedLevel];

  return (
    <p className="text-sm leading-relaxed text-ink-muted">
      Sebaran skor antar titik: kemurnian{" "}
      {formatScore(consistency.puritySpread)} poin, kebersihan{" "}
      {formatScore(consistency.cleanlinessSpread)} poin. Level variasi yang
      dipakai adalah yang lebih parah di antara keduanya — {levelText} —
      sehingga skor konsistensi batch {formatScore(consistency.score)}.
    </p>
  );
}

/** Rincian mentah tiap sub-kriteria per titik, untuk keperluan audit internal. */
export function SubCriteriaDetail({
  breakdown: raw,
  scoringVersion = "2.0.0",
}: {
  breakdown: unknown;
  scoringVersion?: string;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  return (
    <div className="space-y-5">
      {breakdown.samplePoints.map((point) => (
        <div key={point.point}>
          <p className="mb-2 text-sm font-medium text-ink">
            Titik {SAMPLE_POINT_LABELS[point.point]}
          </p>
          <ul className="divide-y divide-line border-y border-line">
            {point.contributions.map((contribution) => (
              <li
                key={`${point.point}-${contribution.subKey}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm"
              >
                <span
                  className={
                    contribution.ignoredByOverride
                      ? "text-ink-muted line-through"
                      : "text-ink"
                  }
                >
                  {contribution.label}
                </span>
                <span className="font-mono tabular text-ink-muted">
                  {contribution.rawScore === null ? (
                    GRADER_TEXT.overrideEmpty
                  ) : (
                    <>
                      {contribution.method === "unit_count" &&
                      contribution.unitsChecked !== null &&
                      contribution.unitsPassed !== null
                        ? GRADER_TEXT.unitSummary(
                            contribution.unitsPassed,
                            contribution.unitsChecked,
                            formatScore(contribution.passPct),
                            formatScore(contribution.rawScore),
                          )
                        : formatScore(contribution.rawScore)}
                      {contribution.measurementMethod
                        ? ` (${contribution.measurementMethod === "moisture_meter" ? GRADER_TEXT.moistureMeter.toLowerCase() : GRADER_TEXT.touchEstimate.toLowerCase()})`
                        : ""}
                      {" × "}
                      {contribution.weightPct}% ={" "}
                      {formatScore(contribution.contribution)}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function QuantityDetail({
  breakdown: raw,
  scoringVersion = "2.0.0",
  weighingMoistureNote,
}: {
  breakdown: unknown;
  scoringVersion?: string;
  weighingMoistureNote?: string | null;
}) {
  const { quantity } = normalizeBreakdown(raw, scoringVersion);
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-sunken p-3">
      <h3 className="text-sm font-semibold text-ink">
        {GRADER_TEXT.quantityDetail}
      </h3>
      <dl className="space-y-2 text-sm text-ink">
        <div className="flex flex-wrap justify-between gap-2">
          <dt>{GRADER_TEXT.weightDeviation}</dt>
          <dd>{formatScore(quantity.weightDeviationPct)}%</dd>
        </div>
        {quantity.countChecks.map((c) => (
          <div
            key={c.key}
            className="space-y-1 rounded-lg border border-line p-2"
          >
            <dt className="font-medium">{c.label}</dt>
            <dd className="text-ink-muted">
              {GRADER_TEXT.countClaim} {c.claimed} · {GRADER_TEXT.countObserved}{" "}
              {c.observed} · {GRADER_TEXT.deviation}{" "}
              {formatScore(c.deviationPct)}%{" "}
              {quantity.deviationSource === c.key
                ? `· ${GRADER_TEXT.applied}`
                : ""}
            </dd>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2 font-semibold">
          <dt>{GRADER_TEXT.maxDeviation}</dt>
          <dd>
            {formatScore(quantity.deviationPct)}% →{" "}
            {formatScore(quantity.weightScore)}
          </dd>
        </div>
        {quantity.specUnitsChecked !== null ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt>{GRADER_TEXT.dimensionUnits}</dt>
            <dd>
              {quantity.specUnitsPassed}/{quantity.specUnitsChecked} (
              {formatScore(quantity.specMatchPct)}%) →{" "}
              {formatScore(quantity.specScore)}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <dt>{GRADER_TEXT.quantityScore}</dt>
          <dd>{formatScore(quantity.score)}</dd>
        </div>
      </dl>
      {weighingMoistureNote ? (
        <p className="text-sm text-ink-muted">
          {GRADER_TEXT.weighingMoistureNote}: {weighingMoistureNote}
        </p>
      ) : null}
    </div>
  );
}
