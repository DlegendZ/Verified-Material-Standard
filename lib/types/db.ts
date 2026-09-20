/**
 * Tipe database — ditulis tangan mengikuti `supabase/migrations/`.
 *
 * Sengaja tidak memakai `supabase gen types`: itu butuh koneksi/CLI saat build,
 * sementara repo ini harus bisa di-typecheck tanpa database hidup. Bila skema
 * berubah, file ini ikut diubah di commit yang sama.
 */

export type UserRole = "factory" | "grader" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type CategoryStatusDb = "live" | "coming_soon";
export type CriterionDb = "purity" | "cleanliness" | "quantity_accuracy";
export type SamplePointDb = "top" | "middle" | "bottom";
export type AssignmentStatus = "open" | "in_progress" | "submitted";
export type DocumentKind = "origin_doc" | "lab_test" | "other";
export type GradeDb = "A" | "B" | "C" | "D";
export type CertificateStatus = "issued" | "revoked" | "superseded";

/** Lifecycle batch, SRD Bab 5.2. */
export type BatchStatus =
  | "draft"
  | "submitted"
  | "assigned"
  | "gate_check"
  | "grading"
  | "computed"
  | "certified"
  | "rejected_gate"
  | "not_certified";

export interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
}

export interface FactoryRow {
  id: string;
  owner_id: string;
  legal_name: string;
  address: string;
  city: string;
  contact_person: string;
  contact_phone: string;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface MaterialCategoryRow {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  status: CategoryStatusDb;
  notes: string | null;
  created_at: string;
}

export interface CategoryCriterionRow {
  id: string;
  category_id: string;
  criterion: CriterionDb;
  sub_key: string;
  label: string;
  weight_pct: number;
  is_odor: boolean;
  odor_override_cap: number | null;
  sort_order: number;
}

export interface BatchRow {
  id: string;
  factory_id: string;
  category_id: string;
  batch_code: string;
  claimed_weight_kg: number;
  claimed_spec: string | null;
  production_date: string | null;
  lot_number: string | null;
  description: string | null;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
}

export interface BatchDocumentRow {
  id: string;
  batch_id: string;
  kind: DocumentKind;
  file_path: string;
  uploaded_at: string;
}

export interface BatchPhotoRow {
  id: string;
  batch_id: string;
  sample_point: SamplePointDb | null;
  file_path: string;
  angle_label: string | null;
  uploaded_at: string;
}

export interface AssignmentRow {
  id: string;
  batch_id: string;
  grader_id: string;
  assigned_by: string;
  assigned_at: string;
  status: AssignmentStatus;
}

export interface GateCheckRow {
  id: string;
  batch_id: string;
  non_b3_pass: boolean;
  origin_exists_pass: boolean;
  origin_authentic_pass: boolean;
  notes: string | null;
  checked_by: string;
  checked_at: string;
}

export interface SamplePointRow {
  id: string;
  batch_id: string;
  point: SamplePointDb;
  odor_level: number;
  notes: string | null;
}

export interface SampleScoreRow {
  id: string;
  sample_point_id: string;
  criterion: CriterionDb;
  sub_key: string;
  raw_score: number;
}

export interface QuantityCheckRow {
  id: string;
  batch_id: string;
  actual_weight_kg: number;
  spec_match_pct: number;
  notes: string | null;
}

export interface DocumentationCheckRow {
  id: string;
  batch_id: string;
  has_production_date: boolean;
  has_multi_angle_photos: boolean;
  has_lot_number: boolean;
  has_lab_test: boolean;
}

export interface GradingResultRow {
  id: string;
  batch_id: string;
  purity_score: number;
  cleanliness_score: number;
  consistency_score: number;
  quantity_score: number;
  documentation_score: number;
  final_score: number;
  grade: GradeDb;
  breakdown_json: unknown;
  scoring_version: string;
  computed_at: string;
  submitted_by: string;
}

export interface CertificateRow {
  id: string;
  batch_id: string;
  grading_result_id: string;
  certificate_code: string;
  issued_by: string;
  issued_at: string;
  valid_until: string;
  status: CertificateStatus;
  revoke_reason: string | null;
  qr_path: string | null;
  pdf_path: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload_json: unknown;
  created_at: string;
}

/** Bentuk kembalian fungsi `public_certificate(code)` (SRD Bab 9.3). */
export interface PublicCertificate {
  certificate_code: string;
  status: CertificateStatus;
  issued_at: string;
  valid_until: string;
  revoke_reason: string | null;
  qr_path: string | null;
  pdf_path: string | null;
  grade: GradeDb;
  final_score: number;
  purity_score: number;
  cleanliness_score: number;
  consistency_score: number;
  quantity_score: number;
  documentation_score: number;
  breakdown: unknown;
  scoring_version: string;
  sampled_at: string;
  batch: {
    batch_code: string;
    claimed_weight_kg: number;
    claimed_spec: string | null;
    lot_number: string | null;
    production_date: string | null;
  };
  factory: { legal_name: string; city: string };
  category: { code: string; name: string };
  photos: { file_path: string; sample_point: SamplePointDb | null; angle_label: string | null }[];
}
