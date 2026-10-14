/**
 * Seluruh teks antarmuka dikumpulkan di sini (SRD Bab 11: jangan hard-code teks
 * di dalam komponen, supaya mudah diubah tanpa menyentuh logika).
 *
 * Bahasa: Indonesia. Istilah teknis domain dipertahankan seperti di
 * grading-system.md.
 */
import type {
  BatchStatus,
  CertificateStatus,
  GradeDb,
  UserRole,
  VerificationStatus,
} from "./types/db";

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
  computed:
    "Penilaian selesai. Admin sedang meninjau sebelum menerbitkan sertifikat.",
  certified: "Sertifikat sudah terbit dan bisa dibagikan.",
  rejected_gate:
    "Batch gagal di gerbang wajib, proses berhenti dan tidak ada skor.",
  not_certified:
    "Skor akhir di bawah 55 (grade D), jadi sertifikat tidak diterbitkan.",
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
  {
    label: "Kemurnian/Komposisi",
    weight: 30,
    hint: "Kesesuaian jenis material dengan deklarasi pabrik.",
  },
  {
    label: "Kebersihan & Kontaminasi",
    weight: 25,
    hint: "Kotoran fisik, kerusakan struktural, dan indikasi bau.",
  },
  {
    label: "Konsistensi Batch",
    weight: 20,
    hint: "Dihitung dari sebaran skor antar titik Atas/Tengah/Bawah.",
  },
  {
    label: "Akurasi Kuantitas & Spesifikasi",
    weight: 15,
    hint: "Klaim pabrik dibanding kenyataan saat ditimbang ulang.",
  },
  {
    label: "Kelengkapan Dokumentasi",
    weight: 10,
    hint: "Tanggal produksi, foto multi-sudut, nomor lot, uji tambahan.",
  },
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
  noAssignments:
    "Belum ada penugasan. Antrian akan muncul di sini saat Admin menugaskanmu.",
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
  issueNotAllowed:
    "Sertifikat hanya bisa diterbitkan untuk batch yang penilaiannya selesai dan sedang menunggu penerbitan.",
  setupMissing:
    "Konfigurasi Supabase belum lengkap. Salin .env.example ke .env.local lalu isi nilainya.",
  validityNotSet:
    "Masa berlaku sertifikat untuk kategori ini belum ditetapkan, jadi sertifikat belum bisa diterbitkan.",
  profileRequired: "Pilih bentuk material.",
  profileMismatch: "Bentuk material tidak sesuai dengan kategori yang dipilih.",
  declarationRequired: "Wajib dicentang.",
  categoryNotLive: "Kategori itu belum bisa diajukan. Pilih kategori lain.",
  toleranceRequired: "Toleransi wajib diisi.",
  unitsNotFilled:
    "Isi jumlah unit lolos untuk semua sub-kriteria yang dihitung per unit.",
  methodRequired: "Pilih metode ukur kelembapan.",
  batchNotFound: "Batch tidak ditemukan.",
  gradingNotAllowed:
    "Batch ini gagal di gerbang wajib atau hasilnya sudah terkirim, penilaian tidak bisa dilanjutkan.",
} as const;

export const CLAIM_TEXT = {
  declaredMaterialType: "Jenis kayu yang dideklarasikan",
  formProfile: "Bentuk material",
  category: "Kategori material",
  claimedWeightKg: "Berat total (kg)",
  bundleCount: "Jumlah ikat",
  unitsPerBundle: "Isi batang per ikat",
  crossSectionWidthCm: "Lebar penampang (cm)",
  crossSectionThicknessCm: "Tebal penampang (cm)",
  lengthCm: "Panjang (cm)",
  crossSectionToleranceCm: "Toleransi penampang (±cm)",
  lengthToleranceCm: "Toleransi panjang (±cm)",
  lengthMinCm: "Panjang minimum (cm)",
  lengthMaxCm: "Panjang maksimum (cm)",
  crossSectionNote: "Catatan penampang",
  woodExample: "Pinus, Jati, Mahoni",
  crossSectionExample: "tebal 2–4 cm",
  weightHint:
    "Grader akan menimbang ulang. Satuan lain (m³, truk) wajib dikonversi ke kg.",
  toleranceHint:
    "Toleransi wajib diisi: seberapa jauh ukuran boleh menyimpang dari klaim.",
  summary: "Ringkasan klaim",
  profileMismatch: ERRORS.profileMismatch,
  bundle: "ikat",
  units: "batang",
  crossSection: "penampang",
  length: "panjang",
  tolerance: "toleransi",
  total: "total",
  kg: "kg",
  cm: "cm",
} as const;
export const VALIDATION_TEXT = {
  required: (label: string) => `${label} wajib diisi.`,
  positive: (label: string) => `${label} harus lebih dari 0.`,
  nonnegative: (label: string) => `${label} tidak boleh negatif.`,
  max: (label: string, max: number) => `${label} maksimal ${max}.`,
  integer: "Jumlah unit wajib bilangan bulat.",
  countRange: "Unit lolos tidak boleh melebihi unit diperiksa.",
  lengthRange: "Panjang maksimum tidak boleh kurang dari panjang minimum.",
  date: "Tanggal harus berformat YYYY-MM-DD dan valid.",
  materialType: "Jenis kayu wajib diisi, minimal 2 karakter.",
  findingNotes: "Catatan temuan wajib minimal 10 karakter.",
} as const;
export const REVISION_TEXT = {
  samplingDraftNote:
    "Jumlah unit sampel per titik (10 batang / 20 potongan) masih usulan awal, belum divalidasi. Batch besar dipecah menjadi beberapa batch.",
  singleFormNote:
    "1 batch = 1 material = 1 bentuk. Batch campur diminta dipecah dulu. Serpihan/serbuk di luar cakupan pilot.",
  gradeMeaningNote:
    "Contoh arti praktis, belum divalidasi ke pembeli, bukan jaminan.",
  objectionLink: "Tidak setuju dengan grade? Lihat proses keberatan",
  comingSoon:
    "Segera hadir — kriteria penilaiannya masih divalidasi, jadi belum bisa diajukan.",
  declarationNote:
    "Deklarasi ini tidak menggantikan pemeriksaan gerbang wajib oleh grader.",
  declarations: {
    sourceIsProductionResidue:
      "Material ini sisa produksi dari pabrik atau kegiatan usaha saya — bukan hasil tambang langsung atau puing bongkaran bangunan.",
    noChemicalTreatment:
      "Kayu tidak diawetkan dengan bahan kimia dan tidak ada sisa cat, lem, pernis, pelarut, atau oli — sekecil apa pun. Kalau grader menemukannya di satu batang saja, seluruh batch ditolak. (Paku atau sekrup yang tertanam tidak membuat batch ditolak; itu dinilai grader.)",
    singleForm:
      "Batch ini hanya berisi satu bentuk material — tidak mencampur batang berikat dengan potongan lepas, serpihan, atau serbuk.",
  },
  gateInspectHint:
    "Sebelum mengisi gerbang: buka ikat (atau ambil segenggam potongan) di 3 titik dan periksa permukaan unit sampel. Satu unit saja yang bercat, berlem, berpernis, terkena pelarut/oli, berbau kimia, atau tampak diawetkan kimia = gagal Non-B3.",
  nonB3FindingButton: "Tolak batch — temuan Non-B3",
  nonB3FindingTitle: "Tolak batch karena temuan Non-B3?",
  nonB3FindingBody:
    "Pakai ini bila saat penilaian kamu menemukan sisa cat, lem, pernis, pelarut, atau oli, tanda pengawetan kimia, atau bau bahan kimia — sekecil apa pun. Batch akan ditolak di gerbang wajib, tanpa skor dan tanpa sertifikat. Isian penilaian yang belum terkirim akan dibuang.",
  nonB3FindingPlaceholder:
    "Contoh: Ikat titik Tengah, 2 batang ada sisa lem di satu sisi.",
  nonB3FindingConfirm: "Ya, tolak batch",
  nonB3FindingCancel: "Batal",
  nonB3FindingNotAllowed:
    "Batch ini tidak bisa ditolak dari sini karena hasil penilaiannya sudah terkirim atau statusnya sudah berubah. Hubungi Admin.",
  nonB3ReconfirmLabel:
    "Saya tidak menemukan sisa cat, lem, pernis, pelarut, atau oli, tanda pengawetan kimia, maupun bau bahan kimia pada unit sampel.",
  nonB3ReconfirmRequired:
    'Centang konfirmasi Non-B3 sebelum mengirim hasil. Kalau ada temuan, pakai tombol "Tolak batch — temuan Non-B3".',
  findingAuditPrefix: "Temuan saat penilaian:",
  gradeMeaningTitle: (category: string) => `Arti grade untuk ${category}`,
  currentGrade: "Grade batch ini",
  validity: (category: string, duration: string) =>
    `Masa berlaku ${category}: ${duration} sejak terbit.`,
} as const;
export const LISTING_TEXT = {
  header: (grade: string, label: string, score: number) =>
    `[TERVERIFIKASI VMS] Grade ${grade} — ${label} (skor ${score}/100)`,
  material: (name: string, form?: string) =>
    `Material: ${name}${form ? ` — ${form}` : ""}`,
  code: (code: string) => `Nomor sertifikat: ${code}`,
  verify: (url: string) => `Cek keaslian (tanpa akun/login): ${url}`,
  validUntil: (date: string) => `Berlaku sampai ${date}.`,
  disclaimer:
    "VMS (Verified Material Standard) adalah lembaga grading independen. VMS menilai kondisi batch lewat sampling 3 titik; tidak menjual material, tidak memegang transaksi, dan tidak menentukan harga.",
} as const;
export const BATCH_FORM_TEXT = {
  remainingDays: (days: number) => `${days} hari tersisa`,
  factoryNameHint: "Sesuai dokumen resmi, misalnya UD Mebel Contoh.",
  previewHint:
    "Lengkapi jenis kayu, berat, ukuran, dan toleransi untuk melihat ringkasan.",
  steps: ["Material", "Klaim", "Detail", "Deklarasi"],
  title: "Ajukan batch",
  save: "Simpan draft batch",
  saving: "Menyimpan…",
  categoryHint: "Sub-kriteria penilaian berbeda tiap kategori.",
  noCategories: "Belum ada kategori material yang bisa diajukan.",
  productionDate: "Tanggal produksi",
  lotNumber: "Nomor lot / traceability",
  description: "Catatan tambahan",
  documentationHint: "Menambah 25 poin pada kelengkapan dokumentasi.",
  afterSave:
    "Setelah draft tersimpan, unggah foto dan dokumen asal-usul di halaman batch, lalu tekan Ajukan.",
  declarations: "Deklarasi intake",
  dataTitle: "Data batch",
  profileExample: "UD Mebel Contoh",
} as const;
export const GRADER_TEXT = {
  claimedCount: (count: number) => `Klaim pabrik: ${count}`,
  countClaim: "Klaim",
  countObserved: "Aktual",
  deviation: "Selisih",
  applied: "Dipakai",
  quantityScore: "Skor akurasi kuantitas",
  dimensionScore: "Skor akurasi dimensi",
  decrease: (label: string) => `Kurangi unit lolos ${label}`,
  increase: (label: string) => `Tambah unit lolos ${label}`,
  pointPhoto: "Ambil / unggah foto titik ini",
  documentationHint:
    "Empat item, masing-masing 25 poin. Centang yang benar-benar ada pada batch ini.",
  overrideNotice: (cap: number) =>
    `Bau Level 3: kebersihan titik ditetapkan ${cap}. Isian kebersihan lain tidak wajib dan tidak ikut dihitung.`,
  scoreTitle: "Kenapa skornya sekian",
  pointScoreTitle: "Skor per titik",
  photoTitle: (point: string) => `Foto titik ${point}`,
  speciesPurity: "Kemurnian/Komposisi",
  cleanliness: "Kebersihan & Kontaminasi",
  documentationItems: [
    { key: "hasProductionDate", label: "Tanggal produksi tercantum" },
    { key: "hasMultiAnglePhotos", label: "Foto batch multi-sudut" },
    { key: "hasLotNumber", label: "Nomor lot / traceability" },
    { key: "hasLabTest", label: "Hasil uji tambahan (mis. uji lab)" },
  ],
  countChecksRequired:
    "Isi jumlah batang di ikat Atas, Tengah, dan Bawah masing-masing tepat satu kali.",
  gateNotes: "Catatan",
  gateNotesHint:
    "Wajib diisi minimal 10 karakter bila ada gate yang tidak lolos.",
  gateSave: "Simpan hasil gerbang wajib",
  gateSaving: "Menyimpan…",
  gateReminder:
    "Centang hanya gate yang benar-benar lolos. Gate yang gagal menghentikan proses — tidak ada skor, tidak ada grade, dan tidak ada sertifikat untuk batch ini.",
  gateNotAllowed:
    "Hasil gerbang tidak bisa diubah karena batch sudah masuk penilaian atau hasilnya sudah terkirim.",
  incompletePoint: "belum lengkap",
  completePoint: "lengkap",
  steps: ["Sampling", "Kuantitas", "Dokumentasi", "Pratinjau"],
  samplingGuide: "Panduan sampling",
  inspect: (count: number, unit: string) =>
    `Periksa ${count} ${unit} per titik`,
  unitsPassed: "Unit lolos",
  unitsChecked: "Unit diperiksa",
  notFilled: "Belum diisi",
  passed: "lolos",
  outOf: "dari",
  moistureMeter: "Moisture meter",
  touchEstimate: "Estimasi sentuh",
  method: "Metode ukur kelembapan",
  weighingMoistureNote: "Catatan kelembapan saat menimbang",
  weighingMoistureHint:
    "Berat kayu berubah mengikuti kadar air — catat kondisinya.",
  actualWeight: "Berat timbang ulang (kg)",
  dimensionUnits: "Unit sampel dalam toleransi dimensi",
  bundleObserved: (point: string) => `Jumlah batang di ikat ${point}`,
  bundleCountObserved: "Jumlah ikat yang dihitung (opsional)",
  previewError: "Lengkapi isian sampling dan kuantitas sebelum pratinjau.",
  calculationError: "Perhitungan gagal. Periksa kembali isian.",
  submit: "Kirim hasil penilaian",
  submitting: "Mengirim…",
  unitSummary: (passed: number, checked: number, pct: string, score: string) =>
    `${passed}/${checked} lolos (${pct}%) → ${score}`,
  notes: "Catatan titik",
  quantityNotes: "Catatan kuantitas",
  formulaVersion: "Versi rumus",
  weightDeviation: "Deviasi berat",
  countDeviation: "Deviasi hitungan",
  maxDeviation: "Selisih terbesar yang dipakai",
  quantityDetail: "Rincian kuantitas",
  overrideEmpty: "tidak diisi (override bau)",
} as const;
export const CATEGORY_ADMIN_TEXT = {
  title: "Kategori & bobot sub-kriteria",
  active: "Aktif",
  validity: "Masa berlaku sertifikat",
  days: (days: number) => `${days} hari`,
  profiles: "Profil bentuk",
  odorCap: "Cap override bau",
  noCategories: "Belum ada kategori aktif.",
  methods: "Metode penilaian",
  metadata: "Metadata kategori",
  description:
    "Bobot disimpan sebagai data, bukan konstanta di kode. Semua bobot masih draft kurasi dan belum divalidasi Domain Expert.",
  noCriteria:
    "Belum ada sub-kriteria dan bobot — sengaja, sampai divalidasi ahli (grading-system §11). Kategori ini belum bisa dinilai.",
  validityNotSet: "Belum ditetapkan",
  unitCount: "Hitung per unit",
  scale: "Skala 0–100",
  measurementRequired: "+ metode ukur wajib",
} as const;

export const CERTIFICATE_PDF_TEXT = {
  footer:
    "Penilaian berbasis sampling 3 titik (Atas, Tengah, Bawah) oleh grader VMS, bukan inspeksi 100% terhadap seluruh isi batch. Sertifikat menilai kondisi batch pada saat sampling. VMS tidak menjual material, tidak memegang transaksi, dan tidak menentukan harga.",
  verify: "Cek status terkini di",
} as const;

export const GRADE_TABLE_TEXT = {
  grade: "Grade",
  meaning: "Arti praktis",
} as const;
export const EFFECTIVE_CERTIFICATE_LABELS = {
  valid: "BERLAKU",
  expired: "KEDALUWARSA",
  revoked: "TIDAK BERLAKU",
} as const;

export const PUBLIC_TEXT = {
  heroDescription:
    "Bukti nyata di balik setiap batch sisa produksi. VMS memeriksa sampel di tiga titik dan mengubah hasilnya menjadi grade yang bisa diverifikasi siapa saja. Pilot saat ini: Kayu Solid.",
  materialNav: "Material",
  aboutNav: "Tentang & FAQ",
  objectionNav: "Proses keberatan",
  aboutLink: "Pelajari cara kerja & FAQ",
  workflow: [
    {
      title: "Daftarkan batch",
      body: "Pabrik atau bengkel mengajukan satu lot sisa kayu: bentuk, jenis kayu, berat, ukuran, foto, dan bukti asal-usul.",
    },
    {
      title: "Uji di 3 titik",
      body: "Grader membuka ikat atau mengambil segenggam potongan dari lapisan atas, tengah, dan dasar tumpukan, lalu memeriksa tiap batangnya.",
    },
    {
      title: "Bagikan hasilnya",
      body: "Admin menerbitkan sertifikat ber-QR setelah meninjau penilaian. Pembeli bisa mengeceknya tanpa akun.",
    },
  ],
  materialEyebrow: "CAKUPAN MATERIAL / 02",
  materialTitle: "Material yang kami nilai.",
  materialDescription:
    "Kami mulai dari satu material dan menilainya dengan teliti sebelum memperluas cakupan.",
  pilotBadge: "Pilot · bisa diajukan sekarang",
  comingSoonBadge: "Segera hadir",
  categoryValidity: (duration: string) =>
    `Sertifikat berlaku ${duration} sejak terbit.`,
  materialBoundary:
    "Hanya sisa produksi pabrik atau kegiatan usaha. Limbah B3, hasil tambang langsung, dan puing bongkaran tidak diterima.",
  woodGradeTitle: "Untuk Kayu Solid",
  whoTitle: "Siapa yang menilai",
  whoBody:
    "Grader VMS mengambil sampel fisik di tiga titik dan memberi skor. Sertifikat diterbitkan Admin VMS setelah meninjau hasilnya — kontrol berlapis, bukan satu orang dari awal sampai akhir.",
  withoutAccount:
    "Cek tanpa akun: siapa pun yang memegang link atau QR sertifikat ini bisa memverifikasinya tanpa daftar atau login.",
  noPrice: "VMS menilai kondisi material, bukan menentukan harga.",
  accuracyTitle: "Catatan akurasi",
  identityTitle: "Identitas batch",
  declaredMaterial: "Jenis yang dideklarasikan",
  form: "Bentuk material",
  quantitySummary: (
    deviation: string,
    weightScore: string,
    pct: string,
    specScore: string,
  ) =>
    `Selisih kuantitas terbesar ${deviation}% → skor ${weightScore}; ${pct}% unit dalam toleransi dimensi → skor ${specScore}`,
} as const;
export const ABOUT_TEXT = {
  title: "Tentang VMS & FAQ",
  summary:
    "VMS (Verified Material Standard) adalah jasa sertifikasi independen untuk batch sisa produksi dari pabrik dan kegiatan usaha. Kami menilai kondisi satu batch lewat sampling fisik di tiga titik, lalu menerbitkan sertifikat grade digital yang bisa dicek siapa saja lewat link atau QR. VMS tidak menjual material, tidak memegang transaksi, dan tidak menentukan harga. Saat ini VMS menjalankan pilot untuk Kayu Solid.",
  faqTitle: "Pertanyaan yang sering ditanyakan",
  objectionLink: "Lihat proses keberatan",
} as const;
export function faqItems(duration: string) {
  return [
    {
      question: "Siapa yang memverifikasi kualitas material?",
      answer:
        "Grader VMS datang ke lokasi, mengambil sampel fisik di tiga titik (lapisan atas, tengah, dan dasar tumpukan), lalu memberi skor. Sertifikat diterbitkan Admin VMS setelah meninjau hasil penilaian itu. Jadi tidak ada satu orang yang memegang keputusan dari awal sampai akhir.",
    },
    {
      question: "Perlu akun untuk mengecek sertifikat?",
      answer:
        "Tidak. Siapa pun yang memegang link atau QR sertifikat bisa membuka halaman verifikasinya langsung, tanpa daftar atau login. Kamu juga bisa mengetik nomor sertifikat di beranda.",
    },
    {
      question: "Bagaimana memakai sertifikat di listing marketplace?",
      answer:
        "Penjual menyalin teks siap-tempel (grade, nomor sertifikat, dan link verifikasi) atau memasang QR-nya di deskripsi listing, misalnya di Tokopedia. VMS tidak terhubung lewat API ke marketplace mana pun; pembeli cukup membuka link atau memindai QR.",
    },
    {
      question: "Apa beda Grade A, B, C, dan D?",
      answer:
        "Grade ditentukan dari skor akhir 0–100: A 85–100 (Premium), B 70–84 (Standard), C 55–69 (Ekonomis), D di bawah 55 (tidak lolos sertifikasi). Untuk Kayu Solid, artinya:",
      gradeTable: true,
    },
    {
      question: "Berapa lama sertifikat berlaku?",
      answer: `Untuk Kayu Solid, ${duration} sejak sertifikat terbit. Angka ini berdasar literatur penyimpanan kayu (pada kelembapan tinggi, jamur bisa mulai terlihat dalam 6–9 minggu) dan sengaja dipilih konservatif untuk gudang beriklim tropis. Ini masih estimasi awal yang akan divalidasi saat pilot. Kalau kondisi batch berubah signifikan sebelum masa berlaku habis — misalnya kena hujan atau tercampur material lain — sertifikat dicabut dan batch wajib disampling ulang.`,
    },
    {
      question: "Kenapa VMS tidak memberi rekomendasi harga?",
      answer:
        "VMS sengaja fokus menilai kondisi material, bukan menentukan harga. Dengan begitu laporan kami tetap menjadi bukti kualitas yang independen, bukan penentu harga yang netralitasnya bisa dipertanyakan. Harga tetap kesepakatan penjual dan pembeli. Terima kasih untuk masukan ini — kami mencatatnya.",
    },
    {
      question: "Bagaimana kalau pabrik tidak setuju dengan grade?",
      answer:
        "Ada proses keberatan: satu kali sampling ulang gratis dalam 3 hari kerja sejak sertifikat terbit, oleh grader yang berbeda.",
      objectionLink: true,
    },
    {
      question: "Berapa lama prosesnya?",
      answer:
        "Target kami maksimal 1×24 jam dari sampling sampai sertifikat terbit, karena pabrik butuh arus kas yang cepat.",
    },
    {
      question: "Material apa saja yang bisa dinilai?",
      answer:
        "Saat ini pilot Kayu Solid dalam dua bentuk: batang berikat dan potongan pendek lepas (serpihan dan serbuk belum). Segera hadir: Besi & Logam, Kaca, dan Keramik. Yang diterima hanya sisa produksi dari pabrik atau kegiatan usaha; limbah B3, hasil tambang langsung, dan puing bongkaran tidak diterima. Untuk pilot, kayu yang diawetkan kimia atau masih ada sisa cat, lem, pernis, pelarut, atau oli — sekecil apa pun — juga belum diterima, sampai status hukumnya jelas.",
    },
    {
      question: "Seberapa akurat penilaian cacatnya?",
      answer:
        "Kami ingin jujur: ambang penilaian cacat kayu dan toleransi ukuran masih draft awal dan belum divalidasi ahli perkayuan. Penilaian berbasis sampling di tiga titik, bukan pemeriksaan 100% isi batch. Grade VMS menilai kondisi dan kesesuaian klaim, bukan uji kekuatan struktural.",
    },
  ];
}
export const OBJECTION_TEXT = {
  title: "Proses keberatan & reverifikasi",
  badge: "Konsep — belum bisa diajukan lewat aplikasi",
  introduction: "Kalau pabrik tidak setuju dengan grade, begini prosesnya.",
  steps: [
    {
      title: "Ajukan keberatan",
      body: "Pabrik bisa mengajukan satu kali sampling ulang gratis dalam 3 hari kerja sejak sertifikat terbit, selama kondisi fisik batch belum berubah signifikan.",
    },
    {
      title: "Sampling ulang oleh grader berbeda",
      body: "Sampling ulang dilakukan grader yang berbeda dari penilaian pertama, di titik sampel yang berbeda pula.",
    },
    {
      title: "Hasil kedua bersifat final",
      body: "Tidak ada keberatan kedua untuk batch yang sama. Kedua hasil disimpan sebagai jejak audit.",
    },
    {
      title: "Kalau kondisi batch berubah",
      body: "Bila batch berubah signifikan setelah sertifikat terbit (mis. kena hujan atau tercampur material lain) sebelum terjual, sertifikat lama otomatis tidak berlaku dan batch wajib disampling ulang dari awal.",
    },
  ],
  previewTitle: "Pratinjau formulir (konsep)",
  reason: "Alasan keberatan",
  confirmation: "Kondisi fisik batch belum berubah sejak sampling",
  submit: "Ajukan sampling ulang (segera hadir)",
  closing: "Untuk saat ini, sampaikan keberatan langsung ke Admin VMS.",
} as const;

/** Fallback publik statis saat RPC tidak terjangkau (A25). */
export const PUBLIC_CATEGORY_FALLBACK: import("./types/db").PublicCategory[] = [
  {
    code: "solid_wood",
    name: "Kayu Solid",
    status: "live",
    short_description:
      "Pilot — sisa produksi kayu solid dari pabrik atau bengkel: batang berikat atau potongan pendek lepas.",
    certificate_validity_days: 42,
    grade_meanings: {
      A: "Unit relatif utuh, hampir tanpa kerusakan biologis/kontaminan, konsisten. Cocok pemakaian ulang bernilai lebih tinggi (mis. bahan kerajinan/furnitur kecil).",
      B: "Layak pakai ulang dengan penyortiran ringan (buang unit cacat, cabut paku).",
      C: "Banyak penyortiran atau bagian terpakai kecil; cenderung untuk pemakaian bernilai lebih rendah.",
      D: "Tidak lolos sertifikasi; disarankan disortir/diproses ulang.",
    },
    profiles: [
      {
        code: "bundled_sticks",
        name: "Batang berikat",
        description: "Batang kayu sisa produksi yang diikat per ikat.",
      },
      {
        code: "loose_offcuts",
        name: "Potongan pendek lepas",
        description: "Potongan pendek kayu solid yang tidak diikat.",
      },
    ],
  },
  {
    code: "metal",
    name: "Besi & Logam",
    status: "coming_soon",
    short_description: "Roadmap — kriteria masih draft, belum bisa diajukan.",
    certificate_validity_days: null,
    grade_meanings: null,
    profiles: [],
  },
  {
    code: "glass",
    name: "Kaca",
    status: "coming_soon",
    short_description:
      "Roadmap — kriteria belum dirancang, belum bisa diajukan.",
    certificate_validity_days: null,
    grade_meanings: null,
    profiles: [],
  },
  {
    code: "ceramic",
    name: "Keramik",
    status: "coming_soon",
    short_description:
      "Roadmap — kriteria belum dirancang, belum bisa diajukan.",
    certificate_validity_days: null,
    grade_meanings: null,
    profiles: [],
  },
];
