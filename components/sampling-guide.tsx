import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { GRADER_TEXT, REVISION_TEXT } from "@/lib/text";
import type { MaterialFormProfileRow } from "@/lib/types/db";
import type { Locale } from "@/lib/locale";
import { profileName } from "@/lib/public-english";
export function SamplingGuide({
  categoryName,
  profile,
  claimedSpec,
  thresholdDisclaimer,
  locale = "id",
}: {
  categoryName: string;
  profile: MaterialFormProfileRow | null;
  claimedSpec: string | null;
  thresholdDisclaimer: string | null;
  locale?: Locale;
}) {
  const en = locale === "en";
  const bundles = profile?.claim_mode === "bundle";
  return (
    <Panel>
      <PanelHeader
        title={en ? "Sampling guide" : GRADER_TEXT.samplingGuide}
        description={
          categoryName +
          (profile
            ? ` · ${profileName(locale, profile.code, profile.name)}`
            : "")
        }
      />
      <PanelBody className="space-y-3">
        {profile ? (
          <>
            <p className="text-sm text-ink">
              {en
                ? bundles
                  ? "Take one bundle from each of the top, middle, and bottom layers."
                  : "Take a handful of offcuts from each of the top, middle, and bottom layers."
                : profile.point_definition}
            </p>
            <p className="font-semibold text-ink">
              {en
                ? `Inspect ${profile.units_per_point} ${bundles ? "sticks" : "offcuts"} per point`
                : GRADER_TEXT.inspect(
                    profile.units_per_point,
                    profile.unit_label,
                  )}
            </p>
            <p className="rounded-xl bg-brand-soft p-3 text-sm font-medium text-ink">
              {en
                ? bundles
                  ? "Open each bundle before inspecting individual sticks."
                  : "Take a representative handful and inspect individual pieces."
                : profile.sampling_notes}
            </p>
          </>
        ) : null}
        {claimedSpec ? (
          <p className="text-sm leading-relaxed text-ink">{claimedSpec}</p>
        ) : null}
        <p className="text-sm text-ink-muted">
          {en
            ? "Sample counts are preliminary. Split large lots into multiple batches."
            : REVISION_TEXT.samplingDraftNote}
        </p>
        <p className="text-sm text-ink-muted">
          {en
            ? "Each batch must contain one material and one form. Separate mixed batches. Chips and sawdust are outside the pilot."
            : REVISION_TEXT.singleFormNote}
        </p>
        {thresholdDisclaimer ? (
          <p className="text-sm text-warning">
            {en
              ? "Defect thresholds and dimension tolerances are preliminary and await expert validation."
              : thresholdDisclaimer}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
