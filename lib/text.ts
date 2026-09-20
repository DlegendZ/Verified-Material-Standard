/**
 * Seluruh teks antarmuka dikumpulkan di sini (SRD Bab 11: jangan hard-code teks
 * di dalam komponen, supaya mudah diubah tanpa menyentuh logika).
 *
 * Bahasa: Indonesia. Istilah teknis domain dipertahankan seperti di
 * grading-system.md.
 */
import type { BatchStatus, CertificateStatus, GradeDb, UserRole, VerificationStatus } from "./types/db";

export const APP = {
  name: "VMS",
  longName: "Verified Material Standard",
  tagline: "Sertifikasi independen untuk batch limbah produksi",
  description:
    "VMS menilai batch limbah produksi pabrik lewat sampling 3 titik, lalu menerbitkan sertifikat grade digital yang bisa diverifikasi siapa saja lewat QR.",
  demoNotice: "Prototype demo — data di dalamnya bukan sertifikasi resmi.",
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  factory: "Pabrik",
  grader: "Grader",
  admin: "Admin",
};

export const GRADE_MEANING: Record<GradeDb, string> = {
  A: "Premium",
  B: "Standard",
  C: "Ekonomis",
  D: "Tidak lolos sertifikasi",
};

export const GRADE_DESCRIPTION: Record<GradeDb, string> = {
  A: "Kontaminasi minim, sangat konsisten. Cocok untuk produksi yang butuh material seragam dan stabil.",
  B: "Layak pakai. Variasi kecil masih bisa ditoleransi produksi umum.",
  C: "Banyak campuran atau variasi. Cocok untuk pembeli yang lebih sensitif harga daripada presisi kualitas.",
  D: "Tidak lolos sertifikasi. Pabrik disarankan menyortir atau memproses ulang sebelum mengajukan lagi.",
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: "Draft",
  submitted: "Menunggu penugasan",
  assigned: "Grader ditugaskan",
  gate_check: "Pemeriksaan gerbang wajib",
  grading: "Sedang dinilai",
  computed: "Menunggu penerbitan",
  certified: "Sertifikat terbit",
  rejected_gate: "Ditolak di gerbang wajib",
  not_certified: "Tidak lolos sertifikasi",
};

export const BATCH_STATUS_HINT: Record<BatchStatus, string> = {
  draft: "Batch belum dikirim. Lengkapi datanya lalu tekan Ajukan.",
  submitted: "Admin akan menugaskan grader untuk batch ini.",
  assigned: "Grader sudah ditugaskan dan akan datang mengambil sampel.",
  gate_check: "Grader sedang memeriksa tiga gerbang wajib.",
  grading: "Grader sedang menilai sampel di tiga titik.",
  computed: "Penilaian selesai. Admin sedang meninjau sebelum menerbitkan sertifikat.",
  certified: "Sertifikat sudah terbit dan bisa dibagikan.",
  rejected_gate: "Batch gagal di gerbang wajib, proses berhenti dan tidak ada skor.",
  not_certified: "Skor akhir di bawah 55 (grade D), jadi sertifikat tidak diterbitkan.",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  issued: "BERLAKU",
  revoked: "TIDAK BERLAKU",
  superseded: "DIGANTIKAN",
};

export const SAMPLE_POINT_LABELS = {
  top: "Atas",
  middle: "Tengah",
  bottom: "Bawah",
} as const;

export const ODOR_LEVELS = [
  {
    level: 1 as const,
    label: "Normal",
    hint: "Tidak ada bau signifikan. Skor dihitung proporsional.",
  },
  {
    level: 2 as const,
    label: "Agak berbau",
    hint: "Tercium tapi ringan, bukan indikasi kerusakan. Skor dihitung proporsional.",
  },
  {
    level: 3 as const,
    label: "Parah",
    hint: "Indikasi jamur/busuk (organik) atau kontaminasi kimia/oli (non-organik). Memicu override: skor kebersihan titik ini ditetapkan ke nilai cap dan sub-kriteria kebersihan lain diabaikan.",
  },
];

export const GATES = [
  {
    key: "nonB3Pass" as const,
    label: "Non-B3",
    hint: "Pastikan bukan limbah berbahaya — di luar cakupan legal VMS.",
  },
  {
    key: "originExistsPass" as const,
    label: "Asal-usul ada",
    hint: "Ada bukti dasar produksi resmi dari pabrik (nota/surat jalan).",
  },
  {
    key: "originAuthenticPass" as const,
    label: "Asal-usul asli",
    hint: "Dokumen diverifikasi bukan rekayasa: cek kop surat resmi, cocokkan ke data pabrik terdaftar.",
  },
];

export const CRITERIA_EXPLAINER = [
  { label: "Kemurnian/Komposisi", weight: 30, hint: "Kesesuaian jenis material dengan deklarasi pabrik." },
  { label: "Kebersihan & Kontaminasi", weight: 25, hint: "Kotoran fisik, kerusakan struktural, dan indikasi bau." },
  { label: "Konsistensi Batch", weight: 20, hint: "Dihitung dari sebaran skor antar titik Atas/Tengah/Bawah." },
  { label: "Akurasi Kuantitas & Spesifikasi", weight: 15, hint: "Klaim pabrik dibanding kenyataan saat ditimbang ulang." },
  { label: "Kelengkapan Dokumentasi", weight: 10, hint: "Tanggal produksi, foto multi-sudut, nomor lot, uji tambahan." },
];

export const VERIFY_PAGE = {
  methodTitle: "Bagaimana VMS menilai",
  method:
    "Grader VMS mengambil sampel fisik di tiga titik berbeda dalam satu batch — Atas, Tengah, dan Bawah — lalu menilai kemurnian dan kebersihan di tiap titik. Skor akhir menggabungkan lima kriteria dengan bobot tetap, dan grade ditentukan dari skor akhir.",
  notGuaranteedTitle: "Yang tidak dijamin sertifikat ini",
  notGuaranteed:
    "Sertifikat ini menilai kondisi batch pada saat sampling, bukan menjamin setiap satuan barang di dalamnya. VMS tidak menjual material, tidak memegang transaksi, dan tidak menjamin kesepakatan harga antara penjual dan pembeli.",
  limitationTitle: "Known limitation",
  limitation:
    "Penilaian berbasis sampling 3 titik oleh grader manusia, bukan inspeksi 100% terhadap seluruh isi batch.",
  notFoundTitle: "Sertifikat tidak ditemukan",
  notFoundBody:
    "Kode sertifikat ini tidak terdaftar di VMS. Periksa kembali penulisannya, atau minta penjual mengirim ulang link/QR dari dashboard mereka.",
  expired: "KEDALUWARSA",
  revokedNotice:
    "Sertifikat ini dicabut. Jangan dijadikan dasar transaksi. Minta penjual mengajukan sampling ulang.",
  expiredNotice:
    "Masa berlaku sertifikat ini sudah lewat. Kondisi batch bisa berubah sejak disampling.",
} as const;

export const ACTIONS = {
  signIn: "Masuk",
  signUp: "Daftar",
  signOut: "Keluar",
  save: "Simpan",
  submit: "Ajukan",
  cancel: "Batal",
  next: "Lanjut",
  back: "Kembali",
  verify: "Verifikasi",
  reject: "Tolak",
  assign: "Tugaskan",
  issue: "Terbitkan sertifikat",
  revoke: "Cabut sertifikat",
  markNotCertified: "Tandai tidak lolos",
  copyListingText: "Salin teks siap-tempel",
  downloadPdf: "Unduh PDF sertifikat",
  downloadQr: "Unduh QR code",
} as const;

export const EMPTY_STATES = {
  noBatches: "Belum ada batch. Mulai dengan mengajukan batch pertama.",
  noAssignments: "Belum ada penugasan. Antrian akan muncul di sini saat Admin menugaskanmu.",
  noCertificates: "Belum ada sertifikat terbit.",
  noPendingFactories: "Tidak ada pabrik yang menunggu verifikasi.",
  noPendingBatches: "Tidak ada batch yang menunggu penugasan.",
  noPendingIssuance: "Tidak ada hasil penilaian yang menunggu penerbitan.",
} as const;

export const ERRORS = {
  generic: "Terjadi kesalahan. Coba lagi sebentar lagi.",
  unauthorized: "Kamu tidak punya akses untuk tindakan ini.",
  factoryNotVerified:
    "Pabrik kamu belum diverifikasi Admin. Kamu masih bisa menyiapkan draft, tapi belum bisa mengajukan batch.",
  gradeDNotCertifiable:
    "Grade D tidak bisa diterbitkan sertifikatnya. Pabrik disarankan menyortir atau memproses ulang.",
  setupMissing:
    "Konfigurasi Supabase belum lengkap. Salin .env.example ke .env.local lalu isi nilainya.",
} as const;
