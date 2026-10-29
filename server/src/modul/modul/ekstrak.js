// Ekstraksi & pemeriksaan berkas modul (LANJUT_049). Tidak ada SQL di sini.
//
// - Tipe dicek dari ISI berkas, bukan hanya ekstensi: PDF wajib diawali
//   "%PDF-"; .txt/.md wajib UTF-8 sah tanpa byte NUL (bukan berkas biner) dan
//   tidak boleh berupa PDF yang diganti nama.
// - Berkas asli hanya ada di memori selama permintaan (multer memoryStorage);
//   tidak pernah ditulis ke disk, dieksekusi, atau disajikan ulang. Yang
//   disimpan hanya teks hasil ekstraksi.
// - PDF diekstrak di worker_thread dengan batas waktu & memori
//   (ekstrak-pdf.worker.mjs). PDF terenkripsi ditolak sebelum dibuka.

const path = require('path');
const { Worker } = require('worker_threads');

const BATAS_WAKTU_PDF_MS = 15000;
const MEMORI_WORKER_MB = 256;
const EKSTENSI = { '.txt': 'txt', '.md': 'md', '.pdf': 'pdf' };

/** Galat penolakan untuk siswa: `kode` dipetakan ke pesan ramah oleh layanan. */
class TolakModul extends Error {
  constructor(kode, rincian) {
    super(rincian || kode);
    this.kode = kode;
  }
}

const ekstensiDari = (nama) => EKSTENSI[path.extname(String(nama || '')).toLowerCase()] || null;
const awalanPdf = (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';

/** Rapikan teks: baris baru seragam, buang karakter kendali (kecuali tab & baris baru), maks. 2 baris kosong. */
function rapikanTeks(teks) {
  return teks
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const jumlahKarakter = (teks) => [...teks].length;

/** Teks polos dari .txt/.md: UTF-8 sah dan bukan biner. */
function teksDariBerkasTeks(buf) {
  if (awalanPdf(buf) || buf.includes(0)) throw new TolakModul('TIPE_BERKAS', 'isi berkas bukan teks');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    throw new TolakModul('TIPE_BERKAS', 'bukan UTF-8 yang sah');
  }
}

function jalankanWorkerPdf(buf, batasKarakter) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'ekstrak-pdf.worker.mjs'), {
      workerData: { data: new Uint8Array(buf), batasKarakter },
      resourceLimits: { maxOldGenerationSizeMb: MEMORI_WORKER_MB },
      stdout: true,
      stderr: true, // peringatan pdf.js tidak dicetak ke log server
    });
    let selesai = false;
    const akhiri = (fn) => {
      if (selesai) return;
      selesai = true;
      clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = setTimeout(() => akhiri(() => reject(new TolakModul('PDF_GAGAL', 'lewat batas waktu'))), BATAS_WAKTU_PDF_MS);
    worker.once('message', (m) => akhiri(() => resolve(m)));
    worker.once('error', (e) => akhiri(() => reject(new TolakModul('PDF_GAGAL', e.message))));
    worker.once('exit', (kode) => akhiri(() => reject(new TolakModul('PDF_GAGAL', `worker berhenti (${kode})`))));
  });
}

async function teksDariPdf(buf, batasKarakter) {
  if (!awalanPdf(buf)) throw new TolakModul('TIPE_BERKAS', 'berekstensi .pdf tetapi isinya bukan PDF');
  // Kamus /Encrypt di trailer = PDF terenkripsi (dengan atau tanpa sandi pembuka).
  if (buf.includes('/Encrypt', 0, 'latin1')) throw new TolakModul('PDF_TERENKRIPSI');
  const hasil = await jalankanWorkerPdf(buf, batasKarakter);
  if (!hasil.ok) {
    throw new TolakModul(hasil.kode === 'TERENKRIPSI' ? 'PDF_TERENKRIPSI' : 'PDF_GAGAL', hasil.pesan);
  }
  return hasil.teks;
}

/**
 * Berkas → teks rapi. `berkas` = { buffer, originalname } dari multer.
 * Melempar TolakModul (TIPE_BERKAS | PDF_TERENKRIPSI | PDF_TANPA_TEKS | PDF_GAGAL).
 */
async function ekstrakBerkas(berkas, batasKarakter) {
  const jenis = ekstensiDari(berkas.originalname);
  if (!jenis) throw new TolakModul('TIPE_BERKAS', 'ekstensi tidak didukung');
  const mentah = jenis === 'pdf' ? await teksDariPdf(berkas.buffer, batasKarakter) : teksDariBerkasTeks(berkas.buffer);
  const teks = rapikanTeks(mentah);
  // PDF hasil pindai/foto: tidak ada (atau hampir tidak ada) teks yang bisa diambil.
  if (jenis === 'pdf' && teks.replace(/\s/g, '').length < 20) throw new TolakModul('PDF_TANPA_TEKS');
  return { teks, jenis };
}

module.exports = { ekstrakBerkas, rapikanTeks, jumlahKarakter, ekstensiDari, TolakModul, BATAS_WAKTU_PDF_MS };
