// Menulis tabel skenario uji AI (LANJUT_054) ke docs/skenario-ai.md, di antara
// penanda <!-- SKENARIO:MULAI --> dan <!-- SKENARIO:SELESAI -->, dari satu
// sumber: server/tests/skenario-ai/skenario.json. Bagian lain dokumen tidak
// disentuh. Dijaga tests/skenario-ai.test.js.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run dokumen-skenario-ai               → tulis ulang tabel
//   npm run dokumen-skenario-ai -- --periksa  → gagal bila belum sesuai

const fs = require('fs');
const path = require('path');

const SUMBER = path.join(__dirname, '..', 'tests', 'skenario-ai', 'skenario.json');
const TEKS = path.join(__dirname, '..', 'config', 'ngobrol-teks.json');
const DOKUMEN = path.join(__dirname, '..', '..', '..', 'docs', 'skenario-ai.md');
const MULAI = '<!-- SKENARIO:MULAI -->';
const SELESAI = '<!-- SKENARIO:SELESAI -->';

const sel = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const JENIS = {
  kartu: 'kartu bantuan dari server, tanpa AI',
  stub: 'balasan uji coba, tanpa AI',
  ai: 'AI menjawab',
  ai_dengan_kartu: 'AI menjawab + kartu (penanda model)',
  galat: 'ditolak',
};

/** Ringkasan "apa yang diuji" satu skenario, dari harapan server. */
function yangDiuji(sk) {
  const h = sk.harapan_server;
  const bagian = [JENIS[h.jenis_balasan] + (h.status && h.status !== 200 ? ` (${h.status} ${h.kode_galat})` : '')];
  if (sk.kondisi && sk.kondisi.length) bagian.push(`kondisi: ${sk.kondisi.join(', ').replace(/_/g, ' ')}`);
  if (h.data_pribadi_disamarkan) bagian.push('data pribadi disamarkan');
  if (sk.data_terverifikasi) bagian.push('fixture DATA TERVERIFIKASI (lapis 2)');
  if (sk.riwayat) bagian.push('dengan riwayat');
  return bagian.join('; ');
}

function tabel(berkas) {
  const teks = JSON.parse(fs.readFileSync(TEKS, 'utf8'));
  const isi = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (_, k) => teks[k]);
  const s = berkas.skenario;
  const perKategori = {};
  for (const sk of s) perKategori[sk.kategori] = (perKategori[sk.kategori] || 0) + 1;
  const gagal = s.filter((sk) => sk.diketahui_gagal);
  return [
    `${s.length} skenario di ${Object.keys(perKategori).length} kategori: ${Object.entries(perKategori).map(([k, n]) => `${k.split('.')[0]} ${n}`).join(', ')}.`,
    `${gagal.length} skenario ditandai **diketahui gagal** (${gagal.map((sk) => sk.id).join(', ')}); lihat kolom Catatan.`,
    '',
    '| ID | Kategori | Judul | Yang diuji (lapis 1) | Catatan |',
    '|---|---|---|---|---|',
    ...s.map((sk) =>
      `| ${sk.id} | ${sel(sk.kategori.replace(/^\w\. /, ''))} | ${sel(sk.judul)} | ${sel(yangDiuji(sk))} | ${sel(sk.diketahui_gagal ? `**Diketahui gagal.** ${sk.diketahui_gagal}` : sk.catatan || '')} |`
    ),
    '',
    '### Rubrik lapis 2 (dinilai manusia)',
    '',
    ...s.flatMap((sk) => [
      `- **${sk.id} ${sel(sk.judul)}**`,
      ...sk.rubrik.harus.map((r) => `  - Harus: ${isi(r)}`),
      ...sk.rubrik.tidak_boleh.map((r) => `  - Tidak boleh: ${isi(r)}`),
    ]),
  ].join('\n');
}

/** Dokumen dengan tabel terbaru di antara penanda. */
function susunDokumen(dok) {
  const i = dok.indexOf(MULAI);
  const j = dok.indexOf(SELESAI);
  if (i < 0 || j < i) throw new Error(`Penanda ${MULAI} / ${SELESAI} tidak ada di ${DOKUMEN}`);
  const berkas = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));
  return `${dok.slice(0, i + MULAI.length)}\n${tabel(berkas)}\n${dok.slice(j)}`;
}

if (require.main === module) {
  const dok = fs.readFileSync(DOKUMEN, 'utf8').replace(/\r\n/g, '\n');
  const baru = susunDokumen(dok);
  if (process.argv.includes('--periksa')) {
    if (baru !== dok) {
      console.error('[dokumen-skenario-ai] docs/skenario-ai.md belum sesuai. Jalankan: npm run dokumen-skenario-ai');
      process.exit(1);
    }
    console.log('[dokumen-skenario-ai] sesuai.');
  } else {
    fs.writeFileSync(DOKUMEN, baru, 'utf8');
    console.log(`[dokumen-skenario-ai] tabel ditulis ke ${DOKUMEN}`);
  }
}

module.exports = { susunDokumen, DOKUMEN, SUMBER };
