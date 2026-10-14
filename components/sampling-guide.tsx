import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { GRADER_TEXT, REVISION_TEXT } from "@/lib/text";
import type { MaterialFormProfileRow } from "@/lib/types/db";
export function SamplingGuide({
  categoryName,
  profile,
  claimedSpec,
  thresholdDisclaimer,
}: {
  categoryName: string;
  profile: MaterialFormProfileRow | null;
  claimedSpec: string | null;
  thresholdDisclaimer: string | null;
}) {
  return (
    <Panel>
      <PanelHeader
        title={GRADER_TEXT.samplingGuide}
        description={categoryName + (profile ? ` · ${profile.name}` : "")}
      />
      <PanelBody className="space-y-3">
        {profile ? (
          <>
            <p className="text-sm text-ink">{profile.point_definition}</p>
            <p className="font-semibold text-ink">
              {GRADER_TEXT.inspect(profile.units_per_point, profile.unit_label)}
            </p>
            <p className="rounded-xl bg-brand-soft p-3 text-sm font-medium text-ink">
              {profile.sampling_notes}
            </p>
          </>
        ) : null}
        {claimedSpec ? (
          <p className="text-sm leading-relaxed text-ink">{claimedSpec}</p>
        ) : null}
        <p className="text-sm text-ink-muted">
          {REVISION_TEXT.samplingDraftNote}
        </p>
        <p className="text-sm text-ink-muted">{REVISION_TEXT.singleFormNote}</p>
        {thresholdDisclaimer ? (
          <p className="text-sm text-warning">{thresholdDisclaimer}</p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
