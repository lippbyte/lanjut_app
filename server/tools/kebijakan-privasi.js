// Dokumen kebijakan privasi untuk review ahli hukum (LANJUT_047).
//
// Teks kebijakan hanya ada di SATU tempat: LANJUT_App/lib/kebijakan-privasi.json
// (dipakai app untuk ringkasan di layar Daftar dan halaman lengkap). Alat ini
// menulis teks yang sama ke docs/kebijakan-privasi-DRAF.md, di antara penanda
// <!-- KEBIJAKAN:MULAI/SELESAI --> dan <!-- ISI:MULAI/SELESAI -->. Bagian lain
// dokumen (catatan untuk peninjau, inventaris data) ditulis tangan dan tidak
// disentuh. tests/kebijakan-privasi.test.js memastikan keduanya tidak menyimpang.
//
// Hanya membaca JSON; satu-satunya yang ditulis adalah berkas dokumen.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run dokumen-kebijakan            → perbarui docs/kebijakan-privasi-DRAF.md
//   npm run dokumen-kebijakan -- --periksa → hanya periksa, keluar 1 bila basi

const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..', '..', '..');
const SUMBER = path.join(AKAR, 'LANJUT_App', 'lib', 'kebijakan-privasi.json');
const DOKUMEN = path.join(AKAR, 'docs', 'kebijakan-privasi-DRAF.md');

const bacaSumber = () => JSON.parse(fs.readFileSync(SUMBER, 'utf8'));

/** Isi kebijakan (ringkasan + bagian lengkap) sebagai Markdown, teks apa adanya. */
function renderKebijakan(k) {
  const out = [`**${k.status}**`, '', `**Versi ${k.versi}**`, '', '### Ringkasan (tampil di layar Daftar)', ''];
  for (const t of k.ringkasan) out.push(`- ${t}`);
  out.push('');
  for (const b of k.isi) {
    out.push(`### ${b.judul}`, '');
    for (const p of b.paragraf ?? []) out.push(p, '');
    if (b.butir) {
      for (const t of b.butir) out.push(`- ${t}`);
      out.push('');
    }
  }
  return out.join('\n').trimEnd();
}

/** Semua [ISI: ...] beserta letaknya, urut dokumen. */
function daftarIsi(k) {
  const hasil = [];
  const ambil = (teks, letak) => {
    for (const m of teks.matchAll(/\[ISI: ([^\]]+)\]/g)) hasil.push({ letak, isi: m[1] });
  };
  k.ringkasan.forEach((t, i) => ambil(t, `Ringkasan ${i + 1}`));
  for (const b of k.isi) for (const t of [...(b.paragraf ?? []), ...(b.butir ?? [])]) ambil(t, b.judul);
  return hasil;
}

function renderDaftarIsi(k) {
  const isi = daftarIsi(k);
  return [`${isi.length} bagian menunggu keputusan Khalifa:`, '', ...isi.map((x, i) => `${i + 1}. **${x.letak}** — ${x.isi}`)].join('\n');
}

function ganti(dok, penanda, isi) {
  const pola = new RegExp(`(<!-- ${penanda}:MULAI -->)[\\s\\S]*?(<!-- ${penanda}:SELESAI -->)`);
  if (!pola.test(dok)) throw new Error(`Penanda ${penanda}:MULAI/SELESAI tidak ada di ${DOKUMEN}.`);
  return dok.replace(pola, (_, a, b) => `${a}\n${isi}\n${b}`);
}

/** Dokumen dengan bagian yang dihasilkan sudah diperbarui (tanpa menulis). */
function susunDokumen(dok = fs.readFileSync(DOKUMEN, 'utf8').replace(/\r\n/g, '\n'), k = bacaSumber()) {
  return ganti(ganti(dok, 'KEBIJAKAN', renderKebijakan(k)), 'ISI', renderDaftarIsi(k));
}

function jalankan(argv) {
  const periksa = argv.includes('--periksa');
  const lain = argv.filter((a) => a !== '--periksa');
  if (lain.length) throw new Error(`Argumen "${lain[0]}" tidak dikenal. Pilihan: --periksa`);
  const lama = fs.readFileSync(DOKUMEN, 'utf8').replace(/\r\n/g, '\n');
  const baru = susunDokumen(lama);
  if (periksa) {
    if (baru !== lama) throw new Error('docs/kebijakan-privasi-DRAF.md tidak sama dengan lib/kebijakan-privasi.json. Jalankan npm run dokumen-kebijakan.');
    console.log('[dokumen-kebijakan] sesuai.');
    return false;
  }
  fs.writeFileSync(DOKUMEN, baru, 'utf8');
  console.log(`[dokumen-kebijakan] ${baru === lama ? 'tidak berubah' : 'diperbarui'} → ${DOKUMEN}`);
  return baru !== lama;
}

if (require.main === module) {
  try {
    jalankan(process.argv.slice(2));
  } catch (galat) {
    console.error(`[dokumen-kebijakan] ${galat.message}`);
    process.exit(1);
  }
}

module.exports = { renderKebijakan, daftarIsi, susunDokumen, jalankan, SUMBER, DOKUMEN };
