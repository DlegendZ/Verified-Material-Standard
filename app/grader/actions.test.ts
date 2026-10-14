import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { ERRORS, REVISION_TEXT } from "@/lib/text";
import { GS_FIXTURE } from "@/lib/scoring/__tests__/fixtures";
import { rejectNonB3FindingAction, submitGradingAction } from "./actions";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  requireRole: vi.fn().mockResolvedValue({ id: "grader-demo" }),
  AuthorizationError: class AuthorizationError extends Error {},
}));
interface Scenario {
  assigned: boolean;
  status: string;
  hasResult: boolean;
  resultReadError: boolean;
}
function clientFor(s: Scenario) {
  const writes: { table: string; payload: Record<string, unknown> }[] = [];
  return {
    writes,
    client: {
      from(table: string) {
        let updated = false;
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          limit: vi.fn(() => query),
          update: vi.fn((payload: Record<string, unknown>) => {
            writes.push({ table, payload });
            updated = true;
            return query;
          }),
          upsert: vi.fn(async (payload: Record<string, unknown>) => {
            writes.push({ table, payload });
            return { error: null };
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "assignments")
              return {
                data: s.assigned ? { id: "assignment-demo" } : null,
                error: null,
              };
            if (table === "batches")
              return {
                data: updated ? { id: "batch-demo" } : { status: s.status },
                error: null,
              };
            if (table === "grading_results")
              return {
                data: s.hasResult ? { id: "grading-demo" } : null,
                error: s.resultReadError ? { message: "Koneksi gagal" } : null,
              };
            if (table === "gate_checks")
              return {
                data: {
                  non_b3_pass: true,
                  origin_exists_pass: true,
                  origin_authentic_pass: false,
                  notes: "Catatan awal.",
                },
                error: null,
              };
            return { data: null, error: null };
          }),
        };
        return query;
      },
    },
  };
}
function notes(value = "Ikat Tengah: dua batang ada sisa lem.") {
  const data = new FormData();
  data.set("notes", value);
  return data;
}
describe("P12/A35: temuan Non-B3 setelah gerbang", () => {
  beforeEach(() => vi.clearAllMocks());
  function setup(patch: Partial<Scenario> = {}) {
    const mock = clientFor({
      assigned: true,
      status: "grading",
      hasResult: false,
      resultReadError: false,
      ...patch,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mock.client as never,
    );
    return mock;
  }
  it("menolak batch tanpa skor, mempertahankan asal-usul, menambah catatan dan audit", async () => {
    const { writes } = setup();
    expect(await rejectNonB3FindingAction("batch-demo", {}, notes())).toEqual({
      ok: true,
    });
    expect(writes).toContainEqual({
      table: "batches",
      payload: { status: "rejected_gate" },
    });
    expect(writes).toContainEqual({
      table: "assignments",
      payload: { status: "submitted" },
    });
    const gate = writes.find((w) => w.table === "gate_checks")!.payload;
    expect(gate.non_b3_pass).toBe(false);
    expect(gate.origin_exists_pass).toBe(true);
    expect(gate.origin_authentic_pass).toBe(false);
    expect(gate.notes).toBe(
      "Catatan awal.\nTemuan saat penilaian: Ikat Tengah: dua batang ada sisa lem.",
    );
    expect(
      writes.some((w) => ["grading_results", "certificates"].includes(w.table)),
    ).toBe(false);
    expect(writeAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "batch.gate_rejected_late",
        payload: { notes: "Ikat Tengah: dua batang ada sisa lem." },
      }),
    );
  });
  it.each([
    { status: "computed" },
    { status: "certified" },
    { hasResult: true },
  ])("menolak perubahan setelah hasil terkirim %j", async (patch) => {
    const { writes } = setup(patch);
    expect(await rejectNonB3FindingAction("batch-demo", {}, notes())).toEqual({
      error: REVISION_TEXT.nonB3FindingNotAllowed,
    });
    expect(writes).toHaveLength(0);
  });
  it("menolak grader lain, catatan terlalu pendek, dan pembacaan hasil yang gagal", async () => {
    let mock = setup({ assigned: false });
    expect(
      (await rejectNonB3FindingAction("batch-demo", {}, notes())).error,
    ).toBeDefined();
    expect(mock.writes).toHaveLength(0);
    mock = setup();
    expect(
      (await rejectNonB3FindingAction("batch-demo", {}, notes("lem")))
        .fieldErrors?.notes,
    ).toBeDefined();
    expect(mock.writes).toHaveLength(0);
    mock = setup({ resultReadError: true });
    expect(await rejectNonB3FindingAction("batch-demo", {}, notes())).toEqual({
      error: ERRORS.generic,
    });
    expect(mock.writes).toHaveLength(0);
  });
  it("submit tanpa konfirmasi ulang gagal sebelum akses database", async () => {
    expect(
      (
        await submitGradingAction({
          batchId: "aaaaaaaa-0000-4000-8000-000000000001",
          samplePoints: GS_FIXTURE.samplePoints,
          quantity: {
            actualWeightKg: 384,
            countChecks: GS_FIXTURE.quantity.countChecks,
            specUnitsPassed: 25,
            specUnitsChecked: 30,
          },
          documentation: GS_FIXTURE.documentation,
          nonB3Reconfirmed: false,
        })
      ).error,
    ).toBe(REVISION_TEXT.nonB3ReconfirmRequired);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
