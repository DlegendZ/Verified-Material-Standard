import { Badge, type Tone } from "@/components/ui/badge";
import { BATCH_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/text";
import type { BatchStatus, VerificationStatus } from "@/lib/types/db";
import type { Locale } from "@/lib/locale";

const batchStatusEn: Record<BatchStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  assigned: "Grader assigned",
  gate_check: "Gate check",
  grading: "Assessment in progress",
  computed: "Awaiting issue",
  certified: "Certified",
  rejected_gate: "Rejected at gate",
  not_certified: "Not certified",
};
const factoryStatusEn: Record<VerificationStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const BATCH_TONE: Record<BatchStatus, Tone> = {
  draft: "neutral",
  submitted: "warning",
  assigned: "brand",
  gate_check: "brand",
  grading: "brand",
  computed: "warning",
  certified: "ok",
  rejected_gate: "danger",
  not_certified: "danger",
};

export function BatchStatusBadge({
  status,
  locale = "id",
}: {
  status: BatchStatus;
  locale?: Locale;
}) {
  return (
    <Badge tone={BATCH_TONE[status]}>
      {(locale === "en" ? batchStatusEn : BATCH_STATUS_LABELS)[status]}
    </Badge>
  );
}

const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  pending: "warning",
  verified: "ok",
  rejected: "danger",
};

export function FactoryStatusBadge({
  status,
  locale = "id",
}: {
  status: VerificationStatus;
  locale?: Locale;
}) {
  return (
    <Badge tone={VERIFICATION_TONE[status]}>
      {(locale === "en" ? factoryStatusEn : VERIFICATION_STATUS_LABELS)[status]}
    </Badge>
  );
}
