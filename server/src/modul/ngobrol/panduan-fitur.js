// Panduan fitur LANJUT untuk chatbot Ngobrol (optimasi chatbot, 15 Okt 2026 — pilihan percakapan,
// belum disetujui PM). Isi di config/panduan-fitur.json (DRAF), dibaca & diperiksa SAAT SERVER MENYALA:
// berkas rusak membuat server gagal menyala, sama seperti teks keselamatan.
//
// Hanya fitur yang benar-benar ada untuk jenjang siswa yang dikirim ke penyedia AI, supaya
// chatbot tidak menyebut menu yang tidak ada (mis. Jalur Saya untuk SMP). Bukan data akun:
// hanya kelompok jenjang yang dipakai untuk memilih baris.

const fs = require('fs');
const path = require('path');
const { KELAS_SMP } = require('../../util/kelas');

const BERKAS = path.join(__dirname, '..', '..', '..', 'config', 'panduan-fitur.json');
const KELOMPOK = ['smp', 'kelas10_11', 'kelas12', 'umum'];

function muat(berkas = BERKAS) {
  const data = JSON.parse(fs.readFileSync(berkas, 'utf8'));
  if (!data || !Array.isArray(data.fitur) || !data.jenjang) throw new Error(`[panduan-fitur] isi ${berkas} tidak sah`);
  for (const k of KELOMPOK) {
    if (typeof data.jenjang[k] !== 'string' || !data.jenjang[k].trim()) throw new Error(`[panduan-fitur] label jenjang "${k}" kosong`);
  }
  for (const [i, f] of data.fitur.entries()) {
    for (const medan of ['nama', 'letak', 'guna']) {
      if (typeof f[medan] !== 'string' || !f[medan].trim()) throw new Error(`[panduan-fitur] fitur ke-${i + 1}: "${medan}" kosong`);
    }
    if (!Array.isArray(f.untuk) || !f.untuk.length || f.untuk.some((k) => !KELOMPOK.includes(k))) {
      throw new Error(`[panduan-fitur] fitur "${f.nama}": "untuk" harus berisi ${KELOMPOK.join('/')}`);
    }
    if (/[\r\n]/.test(f.nama + f.letak + f.guna)) throw new Error(`[panduan-fitur] fitur "${f.nama}": tanpa baris baru`);
  }
  return data;
}

const DATA = muat();

/** Kelompok jenjang dari kelas akun: 7–9 → smp, 10–11 → kelas10_11, 12 → kelas12, lainnya → umum. */
function kelompokKelas(kelas) {
  const k = kelas == null ? '' : String(kelas);
  if (KELAS_SMP.has(k)) return 'smp';
  if (k === '10' || k === '11') return 'kelas10_11';
  if (k === '12') return 'kelas12';
  return 'umum';
}

/** Fitur untuk satu kelas, urut berkas. */
function fiturUntuk(kelas, data = DATA) {
  const kelompok = kelompokKelas(kelas);
  return data.fitur.filter((f) => f.untuk.includes(kelompok));
}

/** Bagian instruksi sistem: judul + satu baris per fitur ("- Nama (letak): guna"). */
function bagianPanduan(kelas, data = DATA) {
  const kelompok = kelompokKelas(kelas);
  return [
    `PANDUAN FITUR LANJUT untuk siswa ini (${data.jenjang[kelompok]}); hanya fitur ini yang ada untuknya:`,
    ...fiturUntuk(kelas, data).map((f) => `- ${f.nama} (${f.letak}): ${f.guna}`),
  ].join('\n');
}

module.exports = { muat, kelompokKelas, fiturUntuk, bagianPanduan, KELOMPOK, BERKAS };
