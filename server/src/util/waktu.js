// Waktu selalu UTC (docs/SDD-Backend-Foundation.md §4.1, §6.6). Server yang
// menentukan nilai waktu untuk kolom seperti `dibuat_pada`/`dijawab_pada` —
// tidak pernah mengandalkan fungsi bawaan MySQL (NOW(), UTC_TIMESTAMP())
// sebagai DEFAULT kolom, supaya satu tempat saja yang tahu "sekarang" itu apa.

/** Waktu sekarang, format DATETIME MySQL (UTC, tanpa offset), utk parameter `?`. */
function sekarangUntukDb() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Waktu sekarang sebagai ISO-8601 UTC, utk badan respons API. */
function sekarangIso() {
  return new Date().toISOString();
}

/** Ubah nilai DATETIME dari MySQL (string/Date) menjadi ISO-8601 UTC untuk respons. */
function keIso(nilai) {
  if (nilai === null || nilai === undefined) return null;
  if (nilai instanceof Date) return nilai.toISOString();
  // mysql2 dengan opsi timezone:'Z' mengembalikan Date untuk kolom DATETIME;
  // jaga-jaga bila suatu saat menerima string mentah.
  const d = new Date(String(nilai).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Tambah N hari ke waktu sekarang (untuk kedaluwarsa sesi). */
function tambahHariDb(jumlahHari) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + jumlahHari);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Ubah string waktu KIRIMAN KLIEN (ISO-8601, mis. dari `dimulai_pada`,
 * `waktu`/`dijawab_pada`, `selesai_pada`) menjadi format DATETIME MySQL.
 * Bila tidak bisa diuraikan, ATAU selisihnya > 24 jam dari jam server, server
 * yang menentukan waktunya sendiri (§6.6 — "jam perangkat salah") — supaya
 * satu HP berjam salah tidak bisa mengacak urutan riwayat siapa pun.
 */
function keDbDariKlien(waktuIsoDariKlien) {
  const sekarang = new Date();
  const diuraikan = waktuIsoDariKlien ? new Date(waktuIsoDariKlien) : null;
  const validDanDekat =
    diuraikan &&
    !Number.isNaN(diuraikan.getTime()) &&
    Math.abs(sekarang.getTime() - diuraikan.getTime()) <= 24 * 60 * 60 * 1000;
  const dipakai = validDanDekat ? diuraikan : sekarang;
  return dipakai.toISOString().slice(0, 19).replace('T', ' ');
}

/** Ubah kolom DATE MySQL (Date/null) menjadi string "YYYY-MM-DD" untuk respons. */
function keTanggal(nilai) {
  if (nilai === null || nilai === undefined) return null;
  const d = nilai instanceof Date ? nilai : new Date(nilai);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Tanggal kalender WIB (UTC+7) "YYYY-MM-DD": batas hari kuota web (LANJUT_055) dan pemakaian AI (LANJUT_060). */
function tanggalWib(ms = Date.now()) {
  return new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = {
  sekarangUntukDb,
  sekarangIso,
  keIso,
  tambahHariDb,
  keTanggal,
  keDbDariKlien,
  tanggalWib,
};
