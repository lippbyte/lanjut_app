/**
 * Alur masuk dan onboarding v2 (LANJUT_030), di balik saklar EXPO_PUBLIC_ALUR_MASUK_V2 (mati
 * bawaan). Modul murni: teks dan aturan langkah dites langsung dari server/tests.
 *
 * TEKS DRAF — belum disetujui Khalifa. Daftarnya di docs/draf-teks-alur-masuk-v2.md, dan
 * periksa-gerbang-rilis menahan build yang menyalakan saklar ini sampai teksnya disetujui.
 * Pengecualian: kalimat yang disalin persis dari v1 (TEKS_V1 di bawah) dan teks kebijakan privasi
 * dari lib/kebijakan-privasi.json, yang tidak diubah sama sekali.
 */
import type { DataDaftar } from '../api/auth';
import { tanyaJenisSekolah, type JenisSekolahMenengah, type Kelas } from './jenjang';

/** Disalin persis dari components/screens/auth/RegisterScreen.tsx (dicocokkan tes). */
export const TEKS_V1 = {
  // Disetujui Khalifa 28 Sep 2026 (salinan-teks-lanjut.md §4.10).
  dataPribadi:
    'Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu untuk menjalankan LANJUT, yaitu menampilkan jalur dan kemajuanmu.',
  sudahBaca: 'Saya sudah membaca kebijakan privasi LANJUT.',
  belumCentang: 'Centang kotak kebijakan privasi di atas dulu supaya bisa mendaftar.',
  petunjukEmail: 'Kalau diisi, kami kirim kode ke email itu untuk memastikan email itu milikmu.',
  belumProdi: 'Belum, aku belum tahu',
} as const;

/** Nilai pilihan prodi "belum": sama dengan BELUM di AuthUI.tsx, tidak pernah dikirim. */
export const BELUM_PRODI = 'belum';

// ---------- Teks DRAF ----------

export const TEKS_PENGANTAR = {
  kartu: [
    { judul: 'Selamat datang di LANJUT', isi: 'Teman menyusun langkah sesudah lulus, sedikit demi sedikit, sesuai keadaanmu.' },
    { judul: 'Tiga jalur', isi: 'Melanjutkan, Bekerja, atau Wirausaha. Boleh lebih dari satu. Belum tahu juga tidak apa-apa.' },
    { judul: 'Pilihanmu', isi: 'Email boleh kosong. Kebijakan privasi bisa dibaca lengkap. Tetap masuk di HP ini, kamu yang memilih.' },
  ],
  // Hanya ditampilkan bila unduh data dan hapus akun menyala (EXPO_PUBLIC_KELOLA_DATA_AKUN).
  kelolaData: 'Data bisa diunduh atau dihapus di Akun & Privasi.',
  lewati: 'Lewati',
  berikutnya: 'Berikutnya',
  mulai: 'Mulai',
  sudahPunyaAkun: 'Saya sudah punya akun',
  kartuKe: (n: number, total: number) => `Kartu ${n} dari ${total}`,
} as const;

export const TEKS_MASUK = {
  judul: 'Masuk',
  ringkasanSandi: 'Lanjutkan dengan akun yang sudah kamu buat.',
  ringkasanKode: 'Kami kirim kode masuk ke email akunmu.',
  namaPengguna: 'Nama pengguna',
  kataSandi: 'Kata sandi',
  isiDulu: 'Isi nama pengguna dan kata sandi dulu.',
  tetapMasuk: 'Tetap masuk di HP ini',
  tetapMasukKet: 'Matikan bila HP ini dipakai bersama.',
  masuk: 'Masuk',
  denganKode: 'Masuk dengan kode email',
  denganSandi: 'Masuk dengan kata sandi',
  belumPunya: 'Belum punya akun? Daftar',
  email: 'Email',
  emailKet: 'Email yang tersimpan di akun LANJUT-mu.',
  isiEmail: 'Isi email dulu.',
  emailSalah: 'Email belum benar.',
  kirimKode: 'Kirim kode',
  kodeMasuk: 'Kode masuk',
  kodeTerkirim: (email: string) => `Kalau ${email} terdaftar di LANJUT, kode masuk sudah kami kirim ke sana. Kode berlaku 5 menit.`,
  kodeEnamAngka: 'Kode terdiri dari 6 angka.',
  periksaKode: 'Periksa lagi kodenya.',
  kirimUlang: 'Kirim ulang kode',
  gantiEmail: 'Ganti email',
} as const;

export const TEKS_DAFTAR = {
  langkahKe: (n: number, total: number) => `Langkah ${n} dari ${total}`,
  kembali: 'Kembali',
  lanjut: 'Lanjut',
  sudahPunya: 'Sudah punya akun? Masuk',
  // LANJUT_041 (TEKS DRAF — belum disetujui Khalifa, batas 40 kata per keadaan layar).
  usia: {
    judul: 'Umurmu sudah 18 tahun atau lebih?',
    ringkasan: 'Jawaban ini tidak disimpan.',
    ya: 'Ya',
    belum: 'Belum',
    pilihDulu: 'Pilih Ya atau Belum dulu.',
  },
  orangTua: {
    judul: 'Persetujuan orang tua atau wali',
    ringkasan: 'Minta izin orang tua atau walimu dulu.',
    setuju: 'Orang tua atau wali saya sudah tahu dan setuju saya memakai LANJUT.',
    belumCentang: 'Centang kotak di atas dulu.',
    kembaliMasuk: 'Kembali ke Masuk',
  },
  akun: {
    judul: 'Buat akun',
    ringkasan: 'Pilih nama pengguna dan kata sandi.',
    namaPengguna: 'Nama pengguna',
    namaKet: '3–32 karakter: huruf kecil, angka, titik, atau garis bawah.',
    namaSalah: '3–32 karakter, hanya huruf kecil, angka, titik, dan garis bawah.',
    kataSandi: 'Kata sandi',
    sandiKet: 'Minimal 8 karakter.',
    sandiSalah: 'Kata sandi minimal 8 karakter.',
  },
  email: { judul: 'Email', ringkasan: 'Boleh dikosongkan.', label: 'Email (boleh dikosongkan)' },
  persetujuan: { judul: 'Privasimu', bacaLengkap: 'Baca lengkap', tutup: 'Tutup', judulLengkap: 'Kebijakan Privasi' },
  jenjang: { judul: 'Kamu sekarang di jenjang apa?', smp: 'SMP', menengah: 'SMA, SMK, atau MA', pilihDulu: 'Pilih jenjangmu.' },
  kelas: { judul: 'Kelas berapa?', opsi: (k: string) => `Kelas ${k}` },
  jenis: { judul: 'Sekolahmu yang mana?' },
  prodi: { judul: 'Sudah punya prodi impian?', ringkasan: 'Boleh dijawab belum.', gagal: 'Daftar prodi belum bisa dimuat. Kamu tetap bisa memilih belum.' },
  siap: {
    judul: 'Siap membuat akun',
    ringkasan: 'Periksa lagi, lalu buat akun.',
    labelNama: 'Nama pengguna',
    labelEmail: 'Email',
    tanpaEmail: 'Tanpa email',
    labelKelas: 'Kelas',
    labelSekolah: 'Sekolah',
    labelProdi: 'Prodi impian',
    buatAkun: 'Buat akun',
    pilihDulu: 'Ada langkah yang belum diisi.',
  },
  kode: {
    judul: 'Masukkan kode',
    ringkasan: (email: string) => `Kami kirim kode ke ${email}. Kode berlaku 5 menit.`,
    label: 'Kode dari email',
    buatAkun: 'Buat akun',
    kirimUlang: 'Kirim ulang kode',
    terkirimUlang: 'Kode baru sudah dikirim. Kode sebelumnya tidak berlaku lagi.',
    ubahData: 'Ubah data',
    tidakTersedia: 'Daftar dengan email belum bisa dipakai sekarang. Kosongkan email untuk daftar tanpa email.',
  },
} as const;

export const TEKS_ARAH = {
  judul: 'Ke mana setelah lulus?',
  ringkasan: 'Boleh pilih lebih dari satu.',
  belumTahu: 'Belum tahu',
  simpan: 'Simpan dan lanjut',
  galatSimpan: 'Pilihanmu belum tersimpan. Coba lagi.',
  kosongJudul: 'Pilihan jalur sedang disiapkan',
  kosongTeks: 'Kamu bisa lanjut dulu.',
  lanjut: 'Lanjut',
  galatJudul: 'Pilihan jalur belum bisa dimuat',
  galatTeks: 'Kamu bisa lanjut dulu. Pertanyaan ini muncul lagi nanti.',
  lanjutDulu: 'Lanjut dulu',
} as const;

// ---------- Aturan ----------

/** Aturan nama pengguna dari server/src/modul/auth/auth.skema.js (sama dengan v1). */
export const NAMA_PENGGUNA_REGEX = /^[a-z0-9._]{3,32}$/;

export type Jenjang = 'smp' | 'menengah';
export type StatusUsia = 'ya' | 'belum';
export const KELAS_PER_JENJANG: Readonly<Record<Jenjang, readonly Kelas[]>> = { smp: ['7', '8', '9'], menengah: ['10', '11', '12'] };

export type LangkahDaftar =
  | 'usia'
  | 'orang_tua'
  | 'akun'
  | 'email'
  | 'persetujuan'
  | 'jenjang'
  | 'kelas'
  | 'jenis'
  | 'prodi'
  | 'siap';

/**
 * Urutan langkah daftar (LANJUT_030, diperbarui LANJUT_041):
 * - Gerbang usia (`usia`, diikuti `orang_tua` bila "Belum") ada PALING AWAL sebelum pertanyaan
 *   identitas, preferensi, kebijakan, dan pembuatan akun di server.
 * - Persetujuan kebijakan ada SEBELUM akun dibuat, sama dengan v1.
 * - Jenis sekolah hanya untuk kelas 10–12.
 */
export function langkahDaftar(kelas: Kelas | null, usia?: StatusUsia | null): LangkahDaftar[] {
  return [
    'usia',
    ...(usia === 'belum' ? (['orang_tua'] as const) : []),
    'akun',
    'email',
    'persetujuan',
    'jenjang',
    'kelas',
    ...(tanyaJenisSekolah(kelas) ? (['jenis'] as const) : []),
    'prodi',
    'siap',
  ];
}

/** Galat medan dari server atau validasi lokal → langkah tempat medan itu diisi. */
export const LANGKAH_MEDAN: Readonly<Record<string, LangkahDaftar>> = {
  usia: 'usia',
  orang_tua: 'orang_tua',
  nama_pengguna: 'akun',
  kata_sandi: 'akun',
  email: 'email',
  versi_kebijakan: 'persetujuan',
  kelas: 'kelas',
  jenis_sekolah: 'jenis',
  prodi_impian: 'prodi',
};

export type IsianDaftar = {
  usia: StatusUsia | null;
  orangTuaSetuju: boolean;
  namaPengguna: string;
  kataSandi: string;
  email: string;
  sudahBaca: boolean;
  kelas: Kelas | null;
  jenis: JenisSekolahMenengah | null;
  prodi: string | null;
};

/**
 * Gerbang usia dan konfirmasi orang tua/wali di klien (LANJUT_041, opsi a).
 * Hanya boleh lewat bila siswa menyatakan >= 18 tahun ("ya"), atau menyatakan "belum"
 * DAN mencentang konfirmasi persetujuan orang tua/wali secara eksplisit.
 * Nilai ini hanya di memori layar; tidak disimpan ke perangkat atau dikirim ke server.
 */
export function gerbangUsiaTerpenuhi(i: Pick<IsianDaftar, 'usia' | 'orangTuaSetuju'>): boolean {
  if (i.usia === 'ya') return true;
  if (i.usia === 'belum') return i.orangTuaSetuju === true;
  return false;
}

/**
 * Menjaga indeks langkah agar tidak pernah meloncati gerbang usia atau konfirmasi orang tua/wali
 * (tidak dapat dilewati lewat tombol kembali, muat ulang, galat medan, atau loncatan indeks).
 */
export function indeksLangkahAman(
  indeksDiminta: number,
  i: Pick<IsianDaftar, 'kelas' | 'usia' | 'orangTuaSetuju'>
): number {
  const daftar = langkahDaftar(i.kelas, i.usia);
  const terjepit = Math.max(0, Math.min(indeksDiminta, daftar.length - 1));
  if (!i.usia) return 0;
  if (i.usia === 'belum' && !i.orangTuaSetuju) return Math.min(terjepit, 1);
  return terjepit;
}

/** Galat per medan (kosong = boleh lanjut). Aturannya sama dengan RegisterScreen v1 + gerbang usia 041. */
export function periksaLangkah(langkah: LangkahDaftar, i: IsianDaftar): Record<string, string> {
  const g: Record<string, string> = {};
  if ((langkah === 'usia' || langkah === 'siap') && !i.usia) g.usia = TEKS_DAFTAR.usia.pilihDulu;
  if ((langkah === 'orang_tua' || langkah === 'siap') && i.usia === 'belum' && !i.orangTuaSetuju) {
    g.orang_tua = TEKS_DAFTAR.orangTua.belumCentang;
  }
  if (langkah === 'akun' || langkah === 'siap') {
    if (!NAMA_PENGGUNA_REGEX.test(i.namaPengguna.trim().toLowerCase())) g.nama_pengguna = TEKS_DAFTAR.akun.namaSalah;
    if (i.kataSandi.length < 8) g.kata_sandi = TEKS_DAFTAR.akun.sandiSalah;
  }
  if ((langkah === 'persetujuan' || langkah === 'siap') && !i.sudahBaca) g.versi_kebijakan = TEKS_V1.belumCentang;
  if ((langkah === 'kelas' || langkah === 'siap') && !i.kelas) g.kelas = 'Pilih kelasmu.';
  if ((langkah === 'jenis' || langkah === 'siap') && tanyaJenisSekolah(i.kelas) && !i.jenis) g.jenis_sekolah = 'Pilih jenis sekolahmu.';
  if ((langkah === 'prodi' || langkah === 'siap') && !i.prodi) g.prodi_impian = 'Pilih prodi, atau "Belum, aku belum tahu".';
  return g;
}

export type KirimanDaftar = { jalur: 'langsung'; data: DataDaftar } | { jalur: 'kode'; data: DataDaftar & { email: string } };

/**
 * Payload pendaftaran. HARUS sama persis dengan RegisterScreen v1 (kontrak APK 1.0.0); tes kontrak
 * menjalankan potongan kode v1 dan membandingkannya dengan fungsi ini. `versiKebijakan` diisi
 * VERSI_KEBIJAKAN oleh layar (lib/kebijakanPrivasi.ts). Usia dan konfirmasi orang tua/wali tidak
 * pernah dimasukkan ke payload.
 */
export function bentukKirimanDaftar(i: IsianDaftar, versiKebijakan: number): KirimanDaftar | null {
  if (!gerbangUsiaTerpenuhi(i) || !i.sudahBaca || !i.kelas) return null;
  const data: DataDaftar = { nama_pengguna: i.namaPengguna.trim().toLowerCase(), kata_sandi: i.kataSandi, kelas: i.kelas, versi_kebijakan: versiKebijakan };
  if (tanyaJenisSekolah(i.kelas) && i.jenis) data.jenis_sekolah = i.jenis;
  if (i.prodi && i.prodi !== BELUM_PRODI) data.prodi_impian = i.prodi;
  const emailBersih = i.email.trim();
  return emailBersih ? { jalur: 'kode', data: { ...data, email: emailBersih } } : { jalur: 'langsung', data };
}

export const hitungKata = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length;

/** Label bawaan komponen Pilihan (components/v2/Pilihan.tsx) yang ikut tampil di layar. */
export const LABEL_PILIHAN = { satu: 'Pilih satu', banyak: 'Boleh pilih lebih dari satu', belumAda: 'Belum ada yang dipilih' } as const;
const statusPilihan = (mode: 'satu' | 'banyak') => `${mode === 'satu' ? LABEL_PILIHAN.satu : LABEL_PILIHAN.banyak} · ${LABEL_PILIHAN.belumAda}`;

/**
 * Semua teks yang tampil per layar alur v2, untuk batas 60 kata per layar (LANJUT_030 §4.B) dan
 * docs/draf-teks-alur-masuk-v2.md. TIDAK termasuk teks kebijakan privasi dari JSON (ringkasan dan
 * isi lengkap, tidak boleh diubah) dan data dari server (nama prodi, nama dan keterangan jalur).
 * Total langkah daftar terpanjang = 8 (kelas 10–12).
 */
export function teksPerLayar(kelolaData: boolean): Record<string, string[]> {
  const p = TEKS_PENGANTAR;
  const m = TEKS_MASUK;
  const d = TEKS_DAFTAR;
  const a = TEKS_ARAH;
  const ke = d.langkahKe(10, 10);
  const kartu = (i: number) => {
    const k = p.kartu[i];
    const isi = i === p.kartu.length - 1 && kelolaData ? `${k.isi} ${p.kelolaData}` : k.isi;
    return [p.lewati, k.judul, isi, p.kartuKe(i + 1, p.kartu.length), ...(i < p.kartu.length - 1 ? [p.berikutnya] : []), p.mulai, p.sudahPunyaAkun];
  };
  return {
    'pengantar-1': kartu(0),
    'pengantar-2': kartu(1),
    'pengantar-3': kartu(2),
    'masuk-sandi': [m.judul, m.ringkasanSandi, m.namaPengguna, m.kataSandi, m.tetapMasuk, m.tetapMasukKet, m.masuk, m.denganKode, m.belumPunya],
    'masuk-email': [m.judul, m.ringkasanKode, m.email, m.emailKet, m.tetapMasuk, m.tetapMasukKet, m.kirimKode, m.denganSandi, m.belumPunya],
    'masuk-kode': [m.judul, m.ringkasanKode, m.kodeTerkirim('nama@contoh.com'), m.kodeMasuk, m.tetapMasuk, m.tetapMasukKet, m.masuk, m.kirimUlang, m.gantiEmail, m.belumPunya],
    'daftar-usia': [ke, d.usia.judul, d.usia.ringkasan, statusPilihan('satu'), d.usia.ya, d.usia.belum, d.lanjut, d.sudahPunya],
    'daftar-orang-tua': [ke, d.kembali, d.orangTua.judul, d.orangTua.ringkasan, d.orangTua.setuju, d.lanjut, d.orangTua.kembaliMasuk],
    'daftar-akun': [ke, d.kembali, d.akun.judul, d.akun.ringkasan, d.akun.namaPengguna, d.akun.namaKet, d.akun.kataSandi, d.akun.sandiKet, d.lanjut],
    'daftar-email': [ke, d.kembali, d.email.judul, d.email.ringkasan, d.email.label, TEKS_V1.petunjukEmail, d.lanjut],
    'daftar-persetujuan': [ke, d.kembali, d.persetujuan.judul, d.persetujuan.bacaLengkap, TEKS_V1.dataPribadi, TEKS_V1.sudahBaca, d.lanjut],
    'daftar-jenjang': [ke, d.kembali, d.jenjang.judul, statusPilihan('satu'), d.jenjang.smp, d.jenjang.menengah, d.lanjut],
    'daftar-kelas': [ke, d.kembali, d.kelas.judul, statusPilihan('satu'), ...['10', '11', '12'].map(d.kelas.opsi), d.lanjut],
    'daftar-jenis': [ke, d.kembali, d.jenis.judul, statusPilihan('satu'), 'SMA', 'SMK', 'MA (Madrasah Aliyah)', d.lanjut],
    'daftar-prodi': [ke, d.kembali, d.prodi.judul, d.prodi.ringkasan, statusPilihan('satu'), TEKS_V1.belumProdi, d.lanjut],
    'daftar-siap': [ke, d.kembali, d.siap.judul, d.siap.ringkasan, d.siap.labelNama, d.siap.labelEmail, d.siap.labelKelas, d.siap.labelSekolah, d.siap.labelProdi, m.tetapMasuk, m.tetapMasukKet, d.siap.buatAkun],
    'daftar-kode': [d.kode.judul, d.kode.ringkasan('nama@contoh.com'), d.kode.label, d.kode.buatAkun, d.kode.kirimUlang, d.kode.ubahData],
    'arah-pilih': [a.judul, a.ringkasan, statusPilihan('banyak'), a.belumTahu, a.simpan],
    'arah-kosong': [a.kosongJudul, a.kosongTeks, a.lanjut],
    'arah-galat': [a.galatJudul, a.galatTeks, 'Coba lagi', a.lanjutDulu],
  };
}

export const BATAS_KATA_LAYAR = 60;
/** Batas kata khusus layar baru gerbang usia & konfirmasi orang tua/wali (LANJUT_041 §3.5). */
export const BATAS_KATA_GERBANG_USIA = 40;
