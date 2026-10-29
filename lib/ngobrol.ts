import { ApiError } from '../api/client';

// Ngobrol Bareng LANJUT dengan AI (LANJUT_051).
// Salinan teks §4.15 — DRAF belum disetujui Khalifa.
export const TEKS_NGOBROL = {
  catatanAi: 'Dijawab AI, jadi bisa keliru. Cek lagi info penting ke sumber resmi. LANJUT tidak menyimpan obrolan ini; obrolan hilang saat aplikasi ditutup.',
  terkunciJudul: 'Fitur AI belum aktif untuk akunmu',
  terkunciIsi:
    'Ngobrol Bareng LANJUT dijawab AI dari penyedia pihak ketiga. Fitur ini baru aktif setelah kamu menerima kebijakan privasi dan orang tua atau walimu menyatakan persetujuan, di aplikasi ini atau lewat sekolah.',
  ajakOrtu: 'Orang tua atau wali perlu menyatakan persetujuan dulu supaya fitur AI bisa dipakai.',
  tautanOrtu: 'Minta orang tua atau wali menyetujui',
  belumBisaDimuat: 'Status fitur AI belum bisa dimuat. Coba lagi sebentar lagi.',
  cobaLagi: 'Coba lagi',
  placeholder: 'Tulis pesanmu…',
  // Salinan teks §4.16 (LANJUT_053) — DRAF belum disetujui Khalifa.
  labelUjiCoba: 'Uji coba, bukan jawaban AI',
  peringatanDataPribadi: 'Jangan tulis nama lengkap, nomor HP, alamat, atau data pribadi lain di sini.',
  tautanBantuan: 'Butuh bicara dengan orang?',
  sembunyikanBantuan: 'Sembunyikan',
  dataDisamarkan: 'Data pribadi di pesanmu disamarkan sebelum dikirim ke AI.',
  kartuGagalDimuat: 'Kartu bantuan belum bisa dimuat. Kalau kamu dalam bahaya, hubungi 112 atau orang dewasa yang kamu percaya.',
  // Salinan teks §4.17 (LANJUT_055) — DRAF belum disetujui Khalifa.
  catatanMateri: 'Kalau kamu bertanya soal materi pelajaran, pertanyaanmu dan potongan modul yang berkaitan dari Arsip Belajarmu ikut dikirim ke penyedia AI.',
  dariModul: 'Dari modulmu',
  dariWeb: 'Dari web',
  webHabis: 'Kuota pencarian web hari ini sudah habis, jadi jawaban ini tanpa pencarian web.',
  // Salinan teks LANJUT_074 (tombol mikrofon) — DRAF belum disetujui Khalifa.
  ucapkanPesan: 'Ucapkan pesan',
  mendengarkan: 'Mendengarkan…',
  // Salinan teks LANJUT_078 (penghubung fitur) — DRAF belum disetujui Khalifa. Hanya tampil
  // bila GET /ngobrol/status menyatakan AI aktif; saat saklar mati layar tetap seperti 077b.
  petunjukAi: 'Tanya apa saja tentang materi di modulmu, latihanmu, atau persiapan ujianmu.',
  catatanKonteks:
    'Kalau pertanyaanmu tentang latihan atau ujian, ringkasan singkatnya (nama mapel, jenis ujian, dan tanggalnya) ikut dikirim ke penyedia AI. Catatan materi ujianmu tidak ikut dikirim.',
};

// Batas di app = batas server (ngobrol.skema.js). LANJUT_078: 500 (sebelumnya 1000);
// teks hasil suara dipotong di batas yang sama (gabungDraf).
export const PANJANG_PESAN_MAKS = 500;
export const RIWAYAT_MAKS = 20;

/** Pesan ramah per kode galat server. Pesan mentah server tidak pernah ditampilkan. */
export function pesanGalatNgobrol(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kode) {
      case 'AI_BELUM_DIIZINKAN':
        return 'Fitur AI belum aktif untuk akunmu.';
      case 'AI_TIDAK_TERSEDIA':
        return 'Fitur AI sedang belum bisa dipakai. Coba lagi nanti.';
      case 'AI_GAGAL':
      case 'AI_SEMENTARA_GAGAL': // LANJUT_078: 503, penyedia gagal atau lewat 20 detik
        return 'Maaf, aku belum bisa menjawab sekarang. Coba kirim lagi sebentar lagi.';
      case 'TERLALU_SERING':
        return 'Pesanmu sudah banyak. Istirahat sebentar, lalu coba lagi.';
      case 'JARINGAN':
        return 'Pesanmu belum terkirim karena tidak tersambung. Coba lagi.';
    }
  }
  return 'Ada yang tidak beres. Coba kirim lagi.';
}
