// Ngobrol sebagai penghubung fitur (LANJUT_078). Tanpa SQL, tanpa jaringan.
//
// Dari pesan terbaru siswa, server memilih SATU konteks utama dari daftar tetap
// (KONTEKS) — itulah satu-satunya ringkasan fitur yang ikut dikirim ke AI:
//   1. pertanyaan materi (aturan materi.json) yang masih punya kata isi
//      setelah kata fitur & kata umum dibuang       → 'modul'
//   2. ada kata ujian/ulangan (kata_event)           → 'event'
//   3. ada kata latihan/saran (kata_saran)           → 'saran'
//   4. pertanyaan materi lain                        → 'modul'
//   selain itu → null (konteks kosong).
// Kata yang sama juga dipakai untuk KARTU TAUTAN (paling banyak satu per jenis,
// tiga total). Kartu disusun server dari data akun sendiri dan TIDAK dikirim ke AI.
//
// Ringkasan sengaja terbatas (tanpa data akun mentah):
//   modul: judul + SATU potongan terbaik, dipotong RINGKASAN_MODUL_MAKS huruf;
//   saran: nama mapel + jenis saran (bukan riwayat jawaban);
//   event: jenis, tanggal, sisa hari, dan nama mapel SATU event terdekat (materi
//          bebas, kartu, dan id tidak dikirim).
// Semua teks dari data siswa disamarkan dulu (samarkan.js): email, NIK, nomor
// telepon, tanggal lahir, alamat, dan nama sekolah.

const fs = require('fs');
const path = require('path');
const { rapikan, bentuk } = require('./materi');
const { samarkan } = require('./samarkan');

const KONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config', 'konteks-ngobrol.json'), 'utf8'));
for (const k of ['kata_event', 'kata_saran', 'kata_umum_fitur']) {
  if (!Array.isArray(KONFIG[k]) || KONFIG[k].length === 0) throw new Error(`server/config/konteks-ngobrol.json tidak sah: ${k} harus daftar berisi`);
}

/** Daftar tetap konteks. Urutan = urutan kartu tautan. */
const KONTEKS = ['modul', 'saran', 'event'];
const TAUTAN_MAKS = 3;
const RINGKASAN_MODUL_MAKS = 600;
const JUDUL_MAKS = 120;

// Kata satu-kata dicocokkan lewat bentuk dasarnya (pemotong imbuhan materi.js);
// frasa (lebih dari satu kata) dicocokkan utuh.
const pisah = (daftar) => {
  const r = daftar.map(rapikan);
  return { kata: new Set(r.filter((f) => !f.includes(' '))), frasa: r.filter((f) => f.includes(' ')) };
};
const DAFTAR = { event: pisah(KONFIG.kata_event), saran: pisah(KONFIG.kata_saran) };
const UMUM = new Set(KONFIG.kata_umum_fitur.map(rapikan));
const memuat = (t, frasa) => ` ${t} `.includes(` ${frasa} `);
const cocokKata = (k, himpunan) => [...bentuk(k)].some((b) => himpunan.has(b));

/** Fitur yang disebut pesan (selain materi): Set berisi 'event' dan/atau 'saran'. */
function fiturDisebut(teks) {
  const t = rapikan(teks);
  const token = t.split(' ').filter(Boolean);
  return new Set(
    ['event', 'saran'].filter((j) => DAFTAR[j].frasa.some((f) => memuat(t, f)) || token.some((k) => cocokKata(k, DAFTAR[j].kata)))
  );
}

/** Kata kunci materi tanpa kata fitur (ujian, latihan, …) dan kata umum yang menyertainya (besok, jadwal, …). */
function kataKonten(kata) {
  return (kata || []).filter((k) => !cocokKata(k, DAFTAR.event.kata) && !cocokKata(k, DAFTAR.saran.kata) && !cocokKata(k, UMUM));
}

/**
 * Konteks utama: 'modul' | 'event' | 'saran' | null.
 * `jenisMateri` dan `kata` dari materi.jenisPesan(). Pertanyaan materi yang masih
 * punya kata isi → modul; lalu event; lalu saran; pertanyaan materi lain → modul.
 */
function pilihKonteks(teks, jenisMateri, kata = []) {
  if (jenisMateri === 'materi' && kataKonten(kata).length) return 'modul';
  const disebut = fiturDisebut(teks);
  if (disebut.has('event')) return 'event';
  if (disebut.has('saran')) return 'saran';
  if (jenisMateri === 'materi') return 'modul';
  return null;
}

const potong = (teks, maks) => {
  const s = String(teks).replace(/\s+/g, ' ').trim();
  return s.length > maks ? `${s.slice(0, maks - 1).trimEnd()}…` : s;
};
const aman = (teks, maks) => samarkan(potong(teks, maks)).teks;

const ARTI_SARAN = {
  saran: 'sering yakin tetapi jawabannya salah di mapel ini',
  belum_cukup_data: 'data latihan di mapel ini belum cukup',
  pengguna_baru: 'belum pernah latihan dengan keyakinan',
  kalibrasi_selaras: 'keyakinan sudah pas dengan hasil latihan',
  arsip_kosong: 'belum punya kartu untuk dilatih',
};

/**
 * Ringkasan satu konteks untuk AI. `data` = bentuk yang disiapkan layanan:
 *   modul: { judul, isi }                       (SATU potongan)
 *   saran: { jenis, namaMapel }
 *   event: { jenis, tanggal, hariLagi, namaMapel }
 * Jenis di luar KONTEKS, atau data kosong → null (konteks kosong).
 */
function ringkasanKonteks(jenis, data) {
  if (!KONTEKS.includes(jenis) || !data) return null;
  if (jenis === 'modul') return { judul: aman(data.judul, JUDUL_MAKS), ringkasan: aman(data.isi, RINGKASAN_MODUL_MAKS) };
  if (jenis === 'saran') {
    return { mapel: data.namaMapel ? aman(data.namaMapel, JUDUL_MAKS) : null, jenis_saran: ARTI_SARAN[data.jenis] || null };
  }
  return {
    jenis: String(data.jenis),
    tanggal: String(data.tanggal),
    hari_lagi: Number.isInteger(data.hariLagi) ? data.hariLagi : null,
    mapel: data.namaMapel ? aman(data.namaMapel, JUDUL_MAKS) : null,
  };
}

/**
 * Kartu tautan untuk app: paling banyak satu per jenis, TAUTAN_MAKS total,
 * urut KONTEKS. Hanya id dan nama yang dibutuhkan tombolnya — tidak dikirim ke AI.
 */
function susunTautan(calon) {
  const hasil = [];
  for (const jenis of KONTEKS) {
    const t = calon.find((c) => c && c.jenis === jenis);
    if (t) hasil.push(t);
  }
  return hasil.slice(0, TAUTAN_MAKS);
}

module.exports = { KONTEKS, TAUTAN_MAKS, RINGKASAN_MODUL_MAKS, fiturDisebut, kataKonten, pilihKonteks, ringkasanKonteks, susunTautan, ARTI_SARAN };
