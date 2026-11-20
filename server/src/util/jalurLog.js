// Jalur permintaan untuk log server (LANJUT_030b, keputusan Khalifa 20 Nov 2026).
//
// Kata yang diketik siswa di pencarian Arsip Belajar (GET /api/v1/modul/cari?q=...) tidak boleh
// masuk log dalam bentuk apa pun: jalur itu dicatat TANPA string kueri, hanya metode dan path.
// Perubahan sengaja sempit: jalur lain dicatat seperti sebelumnya (req.originalUrl).
//
// Express mencocokkan rute tanpa membedakan huruf besar-kecil dan mengabaikan garis miring di
// akhir, jadi perbandingan di sini melakukan hal yang sama. Dengan begitu /API/v1/Modul/cari/?q=
// juga tidak tercatat isinya. Berlaku juga untuk permintaan yang gagal sebelum sampai ke rute
// (401, 429, 400).

// Jalur yang string kuerinya berisi masukan bebas siswa.
const JALUR_TANPA_KUERI = new Set(['/api/v1/modul/cari']);

function normalkan(jalur) {
  let hasil = jalur;
  try {
    hasil = decodeURIComponent(jalur);
  } catch {
    // Persen rusak: bandingkan apa adanya.
  }
  return hasil.toLowerCase().replace(/\/+$/, '') || '/';
}

/** Jalur untuk dicatat: tanpa string kueri bila jalurnya membawa masukan bebas siswa. */
function jalurUntukLog(req) {
  const url = String(req.originalUrl ?? req.url ?? '');
  const jalur = url.split('?')[0];
  return JALUR_TANPA_KUERI.has(normalkan(jalur)) ? jalur : url;
}

module.exports = { jalurUntukLog, JALUR_TANPA_KUERI };
