// Pertanyaan materi (LANJUT_055): pengenal jenis pesan, kata kunci, pemotong
// imbuhan sederhana, dan penyaring relevansi TAHAP 1 untuk potongan modul.
// Tanpa SQL, tanpa jaringan. Aturan kata ada di server/config/materi.json
// (dibaca & diperiksa saat server menyala).
//
// Penyaring tahap 1 berjalan DI SERVER, sebelum apa pun dikirim keluar:
// potongan lolos hanya bila skor FULLTEXT ≥ ambang DAN jumlah kata kunci
// bermakna yang sama (setelah imbuhan dipotong) ≥ minimum. Tahap 2 (menilai
// apakah potongan benar-benar menjawab) dilakukan model lewat instruksi sistem.

const fs = require('fs');
const path = require('path');

const KONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config', 'materi.json'), 'utf8'));
for (const k of ['kata_tanya', 'kata_jalur_masuk', 'kata_rencana', 'kata_obrolan', 'kata_henti']) {
  if (!Array.isArray(KONFIG[k]) || KONFIG[k].length === 0) throw new Error(`server/config/materi.json tidak sah: ${k} harus daftar berisi`);
}
if (!KONFIG.mapel || typeof KONFIG.mapel !== 'object') throw new Error('server/config/materi.json tidak sah: mapel harus objek');

/** Huruf kecil, tanpa diakritik dan tanda baca, satu spasi. */
function rapikan(teks) {
  return String(teks)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const himpunan = (daftar) => new Set(daftar.map(rapikan));
const KATA_TANYA = himpunan(KONFIG.kata_tanya);
const KATA_HENTI = himpunan([...KONFIG.kata_henti, ...KONFIG.kata_obrolan, ...KONFIG.kata_tanya]);
const FRASA_JALUR = KONFIG.kata_jalur_masuk.map(rapikan);
const FRASA_RENCANA = KONFIG.kata_rencana.map(rapikan);
const FRASA_OBROLAN = himpunan(KONFIG.kata_obrolan);
const MAPEL = Object.entries(KONFIG.mapel).flatMap(([id, alias]) => alias.map((a) => ({ id, frasa: rapikan(a) })));

const memuatFrasa = (t, frasa) => ` ${t} `.includes(` ${frasa} `);

// --- pemotong imbuhan sederhana ---------------------------------------------------------------
// Menghasilkan HIMPUNAN bentuk (kata asli + kandidat kata dasar), karena
// peluluhan awalan (meny- → s, mem- → p, men- → t, meng- → k) tidak bisa
// dipastikan tanpa kamus. Dua kata dianggap sama bila himpunan bentuknya beririsan.

const AKHIRAN_PARTIKEL = ['lah', 'kah', 'tah', 'pun'];
const AKHIRAN_MILIK = ['nya', 'ku', 'mu'];
const AKHIRAN = ['kan', 'an', 'i'];
const AWALAN = [
  ['meny', ['s']], ['peny', ['s']],
  ['meng', ['', 'k']], ['peng', ['', 'k']],
  ['mem', ['', 'p']], ['pem', ['', 'p']],
  ['men', ['', 't']], ['pen', ['', 't']],
  ['memper', ['']], ['diper', ['']],
  ['ber', ['']], ['ter', ['']], ['per', ['']],
  ['me', ['']], ['pe', ['']], ['be', ['']],
  ['di', ['']], ['ke', ['']], ['se', ['']],
];
const PANJANG_MIN = 3; // kata kunci asli
const PANJANG_MIN_DASAR = 4; // kandidat kata dasar hasil pemotongan (mengurangi bentuk sampah)

function lepasAkhiran(k, daftar) {
  for (const a of daftar) if (k.length - a.length >= PANJANG_MIN_DASAR && k.endsWith(a)) return k.slice(0, -a.length);
  return k;
}

/** Himpunan bentuk satu kata: asli + kandidat kata dasar. */
function bentuk(kata) {
  const hasil = new Set([kata]);
  const tanpaPartikel = lepasAkhiran(lepasAkhiran(kata, AKHIRAN_PARTIKEL), AKHIRAN_MILIK);
  const dasarAkhiran = [tanpaPartikel, lepasAkhiran(tanpaPartikel, AKHIRAN)];
  for (const d of dasarAkhiran) {
    if (d.length >= PANJANG_MIN_DASAR) hasil.add(d);
    for (const [awalan, ganti] of AWALAN) {
      if (!d.startsWith(awalan)) continue;
      const sisa = d.slice(awalan.length);
      for (const g of ganti) {
        const dasar = g + sisa;
        if (dasar.length >= PANJANG_MIN_DASAR) {
          hasil.add(dasar);
          const lagi = lepasAkhiran(dasar, AKHIRAN); // konfiks: ke-an, pe-an, ber-an, me-kan, di-i
          if (lagi.length >= PANJANG_MIN_DASAR) hasil.add(lagi);
        }
      }
    }
  }
  return hasil;
}

/** Kata kunci bermakna: bukan kata henti/tanya/obrolan, minimal 3 huruf, bukan angka murni. */
function kataKunci(teks) {
  const unik = new Set(
    rapikan(teks)
      .split(' ')
      .filter((k) => k.length >= PANJANG_MIN && !/^\d+$/.test(k) && !KATA_HENTI.has(k))
  );
  return [...unik];
}

/**
 * Jenis pesan: { jenis: 'materi' | 'jalur_masuk' | 'obrolan', mapelId, kata }.
 * jalur_masuk dan obrolan: tanpa modul dan tanpa web.
 */
function jenisPesan(teks) {
  const t = rapikan(teks);
  const kata = kataKunci(teks);
  if (FRASA_JALUR.some((f) => memuatFrasa(t, f))) return { jenis: 'jalur_masuk', mapelId: null, kata };
  const mapel = MAPEL.find(({ frasa }) => memuatFrasa(t, frasa));
  const kataTanpaMapel = mapel ? kata.filter((k) => !memuatFrasa(mapel.frasa, k)) : kata;
  if (mapel && kataTanpaMapel.length) return { jenis: 'materi', mapelId: mapel.id, kata: kataTanpaMapel };
  if (FRASA_RENCANA.some((f) => memuatFrasa(t, f))) return { jenis: 'obrolan', mapelId: null, kata };
  const bertanya = String(teks).includes('?') || t.split(' ').some((k) => KATA_TANYA.has(k));
  const bermakna = kata.filter((k) => !FRASA_OBROLAN.has(k));
  if (bertanya && bermakna.length) return { jenis: 'materi', mapelId: null, kata: bermakna };
  return { jenis: 'obrolan', mapelId: null, kata };
}

/** Kueri FULLTEXT yang diperluas: kata kunci + semua kandidat kata dasarnya. */
function kueriFulltext(kata) {
  return [...new Set(kata.flatMap((k) => [...bentuk(k)]))].join(' ');
}

/** Jumlah kata kunci yang punya padanan (setelah imbuhan dipotong) di teks. */
function kataSama(kata, teks) {
  const bentukTeks = new Set(rapikan(teks).split(' ').filter(Boolean).flatMap((k) => [...bentuk(k)]));
  return kata.filter((k) => [...bentuk(k)].some((b) => bentukTeks.has(b))).length;
}

/**
 * Penyaring tahap 1. `kandidat` = [{ ..., isi, skor }] dari FULLTEXT (sudah
 * difilter pemilik). Lolos bila skor ≥ skorMin DAN kata sama ≥ min(kataMin,
 * jumlah kata kunci). Maksimal `maks` potongan, urut skor.
 */
function saring(kandidat, kata, { skorMin, kataMin, maks }) {
  const syaratKata = Math.min(kataMin, kata.length);
  return kandidat
    .map((p) => ({ ...p, kata_sama: kataSama(kata, p.isi) }))
    .filter((p) => Number(p.skor) >= skorMin && p.kata_sama >= syaratKata && p.kata_sama > 0)
    .sort((a, b) => Number(b.skor) - Number(a.skor))
    .slice(0, maks);
}

module.exports = { jenisPesan, kataKunci, bentuk, kueriFulltext, kataSama, saring, rapikan };
