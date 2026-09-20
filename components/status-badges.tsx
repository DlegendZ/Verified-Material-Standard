import { Badge, type Tone } from "@/components/ui/badge";
import {
  BATCH_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "@/lib/text";
import type { BatchStatus, VerificationStatus } from "@/lib/types/db";

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

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge tone={BATCH_TONE[status]}>{BATCH_STATUS_LABELS[status]}</Badge>;
}

const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  pending: "warning",
  verified: "ok",
  rejected: "danger",
};

export function FactoryStatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={VERIFICATION_TONE[status]}>{VERIFICATION_STATUS_LABELS[status]}</Badge>;
}
