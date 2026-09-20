import "server-only";
import QRCode from "qrcode";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { verificationUrl } from "./certificate";
import { GRADE_MEANING } from "./text";
import type { GradeDb } from "./types/db";

/**
 * Aset sertifikat: QR code PNG dan PDF A4 satu halaman.
 *
 * Sertifikat ini akan difoto dan dikirim lewat WhatsApp, jadi desainnya
 * kontras tinggi, tanpa gradien atau bayangan (SRD Bab 9.4).
 */

export interface CertificatePdfData {
  certificateCode: string;
  grade: GradeDb;
  finalScore: number;
  factoryName: string;
  factoryCity: string;
  categoryName: string;
  batchCode: string;
  lotNumber: string | null;
  claimedWeightKg: number;
  productionDate: string | null;
  sampledAt: string;
  issuedAt: string;
  validUntil: string;
  criteria: { label: string; score: number; weightPct: number }[];
}

const GRADE_HEX: Record<GradeDb, string> = {
  A: "#14543A",
  B: "#1B5878",
  C: "#8A5810",
  D: "#8C2F2A",
};

export async function renderQrPng(certificateCode: string): Promise<Buffer> {
  return QRCode.toBuffer(verificationUrl(certificateCode), {
    type: "png",
    width: 600,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0F1613", light: "#FFFFFF" },
  });
}

function formatId(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#0F1613", backgroundColor: "#FFFFFF" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0F1613",
    paddingBottom: 10,
  },
  brandBlock: { flexDirection: "row", alignItems: "center" },
  brandMark: {
    backgroundColor: "#14543A",
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 3,
    paddingHorizontal: 6,
    letterSpacing: 1,
  },
  brandName: { marginLeft: 8, fontSize: 11 },
  docTitle: { fontSize: 13, textAlign: "right" },
  docSub: { fontSize: 9, color: "#56605A", textAlign: "right", marginTop: 2 },

  gradeRow: { flexDirection: "row", marginTop: 22 },
  gradeBox: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeLetter: { color: "#FFFFFF", fontSize: 64 },
  gradeMeta: { flex: 1, paddingLeft: 18, justifyContent: "center" },
  gradeMeaning: { fontSize: 20 },
  gradeScore: { fontSize: 11, color: "#56605A", marginTop: 4 },
  code: { fontSize: 14, marginTop: 10, letterSpacing: 1 },

  section: { marginTop: 22 },
  sectionTitle: {
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#B6BFB6",
    paddingBottom: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D8DED6",
  },
  label: { color: "#56605A" },
  value: { textAlign: "right" },

  twoCol: { flexDirection: "row", marginTop: 22 },
  colLeft: { flex: 1, paddingRight: 18 },
  colRight: { width: 150, alignItems: "center" },
  qr: { width: 130, height: 130 },
  qrCaption: { fontSize: 8, color: "#56605A", marginTop: 6, textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#B6BFB6",
    paddingTop: 8,
    fontSize: 8,
    color: "#56605A",
  },
});

function CertificateDocument({
  data,
  qrDataUrl,
}: {
  data: CertificatePdfData;
  qrDataUrl: string;
}) {
  return (
    <Document
      title={`Sertifikat Grade Material ${data.certificateCode}`}
      author="Verified Material Standard"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandMark}>VMS</Text>
            <Text style={styles.brandName}>Verified Material Standard</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>Sertifikat Grade Material</Text>
            <Text style={styles.docSub}>Penilaian per batch, berbasis sampling 3 titik</Text>
          </View>
        </View>

        <View style={styles.gradeRow}>
          <View style={[styles.gradeBox, { backgroundColor: GRADE_HEX[data.grade] }]}>
            <Text style={styles.gradeLetter}>{data.grade}</Text>
          </View>
          <View style={styles.gradeMeta}>
            <Text style={styles.gradeMeaning}>{GRADE_MEANING[data.grade]}</Text>
            <Text style={styles.gradeScore}>Skor akhir {data.finalScore} dari 100</Text>
            <Text style={styles.code}>{data.certificateCode}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            <Text style={styles.sectionTitle}>Identitas batch</Text>
            {[
              ["Pabrik", data.factoryName],
              ["Kota", data.factoryCity],
              ["Kategori material", data.categoryName],
              ["Kode batch", data.batchCode],
              ["Nomor lot", data.lotNumber ?? "—"],
              ["Klaim berat", `${data.claimedWeightKg} kg`],
              ["Tanggal produksi", formatId(data.productionDate)],
              ["Tanggal sampling", formatId(data.sampledAt)],
            ].map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.colRight}>
            {/* Image di sini milik @react-pdf/renderer, bukan <img> DOM — tidak punya prop alt. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.qr} src={qrDataUrl} />
            <Text style={styles.qrCaption}>Pindai untuk memverifikasi keaslian sertifikat</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian skor</Text>
          {data.criteria.map((criterion) => (
            <View key={criterion.label} style={styles.row}>
              <Text style={styles.label}>
                {criterion.label} ({criterion.weightPct}%)
              </Text>
              <Text style={styles.value}>{criterion.score.toFixed(1)}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text>Skor akhir</Text>
            <Text style={styles.value}>{data.finalScore}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Masa berlaku</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Diterbitkan</Text>
            <Text style={styles.value}>{formatId(data.issuedAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Berlaku sampai</Text>
            <Text style={styles.value}>{formatId(data.validUntil)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Penilaian berbasis sampling 3 titik (Atas, Tengah, Bawah) oleh grader VMS, bukan inspeksi
          100% terhadap seluruh isi batch. Sertifikat menilai kondisi batch pada saat sampling. VMS
          tidak menjual material dan tidak memegang transaksi. Cek status terkini di{" "}
          {verificationUrl(data.certificateCode)}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  const qrPng = await renderQrPng(data.certificateCode);
  const qrDataUrl = `data:image/png;base64,${qrPng.toString("base64")}`;
  return renderToBuffer(<CertificateDocument data={data} qrDataUrl={qrDataUrl} />);
}
