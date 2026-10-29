// Pemotong teks modul (LANJUT_049). Fungsi murni, tanpa SQL.
//
// Potongan sekitar 800–1.200 karakter, dibelah di batas paragraf; paragraf
// yang terlalu panjang dibelah di batas kalimat; kalimat yang terlalu
// panjang dibelah di spasi terakhir sebelum batas (atau dipotong keras bila
// tidak ada spasi). Potongan terakhir boleh lebih pendek dari 800. Potongan
// dipakai untuk pencarian FULLTEXT sekarang, dan nanti untuk konteks AI.

const MIN = 800;
const MAKS = 1200;

/** Satu satuan (paragraf/kalimat) yang lebih panjang dari MAKS → beberapa bagian ≤ MAKS. */
function belahKeras(teks, maks) {
  const hasil = [];
  let sisa = teks;
  while (sisa.length > maks) {
    let potong = sisa.lastIndexOf(' ', maks);
    if (potong < maks / 2) potong = maks; // tanpa spasi yang wajar → potong keras
    hasil.push(sisa.slice(0, potong).trim());
    sisa = sisa.slice(potong).trim();
  }
  if (sisa) hasil.push(sisa);
  return hasil;
}

/** Paragraf → kalimat (titik/tanda tanya/seru diikuti spasi), masing-masing ≤ MAKS. */
function satuanDariParagraf(paragraf, maks) {
  if (paragraf.length <= maks) return [paragraf];
  return paragraf
    .split(/(?<=[.!?…])\s+/)
    .flatMap((k) => (k.length > maks ? belahKeras(k, maks) : [k]))
    .filter(Boolean);
}

/**
 * Teks (sudah dirapikan) → larik potongan. Satuan digabung sampai panjangnya
 * ≥ MIN, tanpa pernah melewati MAKS.
 */
function potongTeks(teks, { min = MIN, maks = MAKS } = {}) {
  const satuan = teks
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => satuanDariParagraf(p, maks));

  const potongan = [];
  let kini = '';
  for (const s of satuan) {
    const gabung = kini ? `${kini}\n\n${s}` : s;
    if (gabung.length <= maks) {
      kini = gabung;
      if (kini.length >= min) {
        potongan.push(kini);
        kini = '';
      }
    } else {
      if (kini) potongan.push(kini);
      kini = s;
    }
  }
  if (kini) potongan.push(kini);
  return potongan;
}

module.exports = { potongTeks, MIN_POTONGAN: MIN, MAKS_POTONGAN: MAKS };
