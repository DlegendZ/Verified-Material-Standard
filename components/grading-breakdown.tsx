import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { formatScore } from "@/lib/format";
import { normalizeBreakdown } from "@/lib/breakdown";
import { SAMPLE_POINT_LABELS, GRADER_TEXT } from "@/lib/text";
import type { Locale } from "@/lib/locale";
import { criteriaEn } from "@/lib/public-english";
import { assessmentEn, criteriaHelpEn } from "@/lib/assessment-english";

const sampleEn = { top: "Top", middle: "Middle", bottom: "Bottom" };
const criterionKeys = [
  "purity",
  "cleanliness",
  "consistency",
  "quantity",
  "documentation",
];

/** Rincian lima kriteria beserta bobot dan kontribusinya ke skor akhir. */
export function FinalScoreBreakdown({
  breakdown: raw,
  scoringVersion = "2.0.0",
  locale = "id",
}: {
  breakdown: unknown;
  scoringVersion?: string;
  locale?: Locale;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  return (
    <div className="divide-y divide-line">
      {breakdown.final.map((row) => (
        <ScoreBar
          key={row.key}
          label={
            locale === "en"
              ? criteriaEn[criterionKeys.indexOf(row.key)].label
              : row.label
          }
          locale={locale}
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
  locale = "id",
}: {
  breakdown: unknown;
  scoringVersion?: string;
  locale?: Locale;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  const en = locale === "en";
  const override = breakdown.samplePoints.find(
    (point) => point.cleanlinessOverridden,
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              {en ? "Point" : "Titik"}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              {en ? "Purity" : "Kemurnian"}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-ink-muted">
              {en ? "Cleanliness" : "Kebersihan"}
            </th>
            <th scope="col" className="py-2 font-medium text-ink-muted">
              {en ? "Odor" : "Bau"}
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
                {(en ? sampleEn : SAMPLE_POINT_LABELS)[point.point]}
              </th>
              <td className="py-2.5 pr-4 font-mono tabular text-ink">
                {formatScore(point.purity, locale)}
              </td>
              <td className="py-2.5 pr-4">
                <span className="font-mono tabular text-ink">
                  {formatScore(point.cleanliness, locale)}
                </span>
                {point.cleanlinessOverridden ? (
                  <Badge tone="danger" className="ml-2">
                    {en ? "odor override" : "override bau"}
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

      {override ? (
        <p className="mt-3 text-sm text-ink-muted">
          {en
            ? `Level 3 odor was detected. That point’s cleanliness score was set to ${formatScore(override.cleanlinessOverrideCap ?? 40, locale)}, and its other cleanliness scores did not count.`
            : `Bau level 3 terdeteksi di salah satu titik. Skor kebersihan titik itu ditetapkan ke ${formatScore(override.cleanlinessOverrideCap ?? 40)}, dan sub-kriteria kebersihan lain di titik itu tidak ikut dihitung.`}
        </p>
      ) : null}
    </div>
  );
}

/** Penjelasan naratif kenapa konsistensi batch bernilai sekian. */
export function ConsistencyNote({
  breakdown: raw,
  scoringVersion = "2.0.0",
  locale = "id",
}: {
  breakdown: unknown;
  scoringVersion?: string;
  locale?: Locale;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  const { consistency } = breakdown;
  if (locale === "en")
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        Score spread across samples:{" "}
        {formatScore(consistency.puritySpread, locale)} points for purity and{" "}
        {formatScore(consistency.cleanlinessSpread, locale)} for cleanliness.
        The greater level of variation ({consistency.appliedLevel}) sets the
        consistency score to {formatScore(consistency.score, locale)}.
      </p>
    );
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
  locale = "id",
}: {
  breakdown: unknown;
  scoringVersion?: string;
  locale?: Locale;
}) {
  const breakdown = normalizeBreakdown(raw, scoringVersion);
  const en = locale === "en";
  const text = en ? assessmentEn : GRADER_TEXT;
  return (
    <div className="space-y-5">
      {breakdown.samplePoints.map((point) => (
        <div key={point.point}>
          <p className="mb-2 text-sm font-medium text-ink">
            {en
              ? sampleEn[point.point]
              : `Titik ${SAMPLE_POINT_LABELS[point.point]}`}
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
                  {en
                    ? (criteriaHelpEn[contribution.subKey]?.[0] ??
                      contribution.label)
                    : contribution.label}
                </span>
                <span className="font-mono tabular text-ink-muted">
                  {contribution.rawScore === null ? (
                    text.overrideEmpty
                  ) : (
                    <>
                      {contribution.method === "unit_count" &&
                      contribution.unitsChecked !== null &&
                      contribution.unitsPassed !== null
                        ? text.unitSummary(
                            contribution.unitsPassed,
                            contribution.unitsChecked,
                            formatScore(contribution.passPct, locale),
                            formatScore(contribution.rawScore, locale),
                          )
                        : formatScore(contribution.rawScore, locale)}
                      {contribution.measurementMethod
                        ? ` (${contribution.measurementMethod === "moisture_meter" ? text.moistureMeter.toLowerCase() : text.touchEstimate.toLowerCase()})`
                        : ""}
                      {" × "}
                      {contribution.weightPct}% ={" "}
                      {formatScore(contribution.contribution, locale)}
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
  locale = "id",
}: {
  breakdown: unknown;
  scoringVersion?: string;
  weighingMoistureNote?: string | null;
  locale?: Locale;
}) {
  const { quantity } = normalizeBreakdown(raw, scoringVersion);
  const text = locale === "en" ? assessmentEn : GRADER_TEXT;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-sunken p-3">
      <h3 className="text-sm font-semibold text-ink">{text.quantityDetail}</h3>
      <dl className="space-y-2 text-sm text-ink">
        <div className="flex flex-wrap justify-between gap-2">
          <dt>{text.weightDeviation}</dt>
          <dd>{formatScore(quantity.weightDeviationPct, locale)}%</dd>
        </div>
        {quantity.countChecks.map((c) => (
          <div
            key={c.key}
            className="space-y-1 rounded-lg border border-line p-2"
          >
            <dt className="font-medium">{c.label}</dt>
            <dd className="text-ink-muted">
              {text.countClaim} {c.claimed} · {text.countObserved} {c.observed}{" "}
              · {text.deviation} {formatScore(c.deviationPct, locale)}%{" "}
              {quantity.deviationSource === c.key ? `· ${text.applied}` : ""}
            </dd>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2 font-semibold">
          <dt>{text.maxDeviation}</dt>
          <dd>
            {formatScore(quantity.deviationPct, locale)}% →{" "}
            {formatScore(quantity.weightScore, locale)}
          </dd>
        </div>
        {quantity.specUnitsChecked !== null ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt>{text.dimensionUnits}</dt>
            <dd>
              {quantity.specUnitsPassed}/{quantity.specUnitsChecked} (
              {formatScore(quantity.specMatchPct, locale)}%) →{" "}
              {formatScore(quantity.specScore, locale)}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <dt>{text.quantityScore}</dt>
          <dd>{formatScore(quantity.score, locale)}</dd>
        </div>
      </dl>
      {weighingMoistureNote ? (
        <p className="text-sm text-ink-muted">
          {text.weighingMoistureNote}: {weighingMoistureNote}
        </p>
      ) : null}
    </div>
  );
}
