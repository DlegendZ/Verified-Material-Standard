import { describe, expect, it } from "vitest";
import { BUCKETS, batchFileType, isBatchFilePath } from "./storage";

describe("batch attachments", () => {
  it("recognizes a PDF even when the browser supplies no useful MIME type", () => {
    expect(batchFileType(BUCKETS.documents, "report.PDF", "")).toBe(
      "application/pdf",
    );
    expect(
      batchFileType(
        BUCKETS.documents,
        "report.pdf",
        "application/octet-stream",
      ),
    ).toBe("application/pdf");
    expect(batchFileType(BUCKETS.documents, "scan.png", "image/png")).toBe(
      "image/png",
    );
    expect(
      batchFileType(BUCKETS.photos, "report.pdf", "application/pdf"),
    ).toBeNull();
    expect(
      batchFileType(BUCKETS.documents, "report.pdf", "text/html"),
    ).toBeNull();
  });

  it("accepts a file only inside its own batch folder", () => {
    expect(isBatchFilePath("batch-a", "batch-a/report.pdf")).toBe(true);
    expect(isBatchFilePath("batch-a", "batch-b/report.pdf")).toBe(false);
    expect(isBatchFilePath("batch-a", "batch-a/../report.pdf")).toBe(false);
  });
});
