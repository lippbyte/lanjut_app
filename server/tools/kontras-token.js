// Menghitung rasio kontras token tema v2 dua mode (LANJUT_029 & LANJUT_031b) dari theme/v2 milik app,
// lalu mencetak tabel Markdown untuk docs/desain-token-v2.md. Hanya membaca.
//
//   node tools/kontras-token.js
//
// Keluar dengan kode 1 bila ada pasangan yang dipakai komponen tidak lolos ambangnya pada mode
// terang maupun mode gelap.

const { muatModulApp } = require('../tests/muat-ts-app');

const tema = muatModulApp('theme/v2/index');
const {
  warnaTerang,
  warnaGelap,
  palet,
  PASANGAN,
  PETA_TOKEN_SEMANTIK,
  OPSI_BIRU_TUA,
  OPSI_SUKSES,
  OPSI_GALAT,
  AMBANG,
  rasioTertulis,
  lolos,
} = tema;

const f = (n) => n.toFixed(2).replace('.', ',');
const tanda = (ok) => (ok ? 'lolos' : '**GAGAL**');

function tabelPasangan(setWarna = warnaTerang) {
  const baris = ['| Depan | Latar | Jenis (ambang) | Rasio | Hasil | Dipakai di |', '|---|---|---|---|---|---|'];
  let gagal = 0;
  for (const p of PASANGAN) {
    const a = setWarna[p.depan];
    const b = setWarna[p.latar];
    const ok = lolos(a, b, p.jenis);
    if (!ok) gagal += 1;
    baris.push(
      `| \`${p.depan}\` ${a} | \`${p.latar}\` ${b} | ${p.jenis} (${f(AMBANG[p.jenis])}) | ${f(rasioTertulis(a, b))}:1 | ${tanda(ok)} | ${p.dipakai} |`
    );
  }
  return { teks: baris.join('\n'), gagal };
}

/** Pasangan ringkas §3.B LANJUT_031b dengan nama token semantik dua mode. */
const PASANGAN_RINGKAS_031B = [
  { depan: 'text', latar: 'bg', jenis: 'teks', mode: 'keduanya' },
  { depan: 'text', latar: 'surface', jenis: 'teks', mode: 'keduanya' },
  { depan: 'text', latar: 'bagianBiru', jenis: 'teks', mode: 'keduanya' },
  { depan: 'muted', latar: 'bg', jenis: 'teks', mode: 'keduanya' },
  { depan: 'muted', latar: 'surface', jenis: 'teks', mode: 'keduanya' },
  { depan: 'accent', latar: 'bg', jenis: 'teks', mode: 'keduanya' },
  { depan: 'accent', latar: 'surface', jenis: 'teks', mode: 'keduanya' },
  { depan: 'onAccent', latar: 'accent', jenis: 'teks', mode: 'keduanya' },
  { depan: 'sukses', latar: 'bg', jenis: 'teks', mode: 'keduanya' },
  { depan: 'sukses', latar: 'surface', jenis: 'teks', mode: 'keduanya' },
  { depan: 'galat', latar: 'bg', jenis: 'teks', mode: 'keduanya' },
  { depan: 'galat', latar: 'surface', jenis: 'teks', mode: 'keduanya' },
  { depan: 'borderKontrol', latar: 'bg', jenis: 'kontrol', mode: 'keduanya' },
  { depan: 'borderKontrol', latar: 'surface', jenis: 'kontrol', mode: 'keduanya' },
];

function tabelRingkasDuaMode() {
  const baris = [
    '| Pasangan (ambang) | Terang (HEX & rasio) | Gelap (HEX & rasio) | Hasil |',
    '|---|---|---|---|',
  ];
  let gagal = 0;
  for (const p of PASANGAN_RINGKAS_031B) {
    const kd = PETA_TOKEN_SEMANTIK[p.depan];
    const kl = PETA_TOKEN_SEMANTIK[p.latar];
    const at = warnaTerang[kd];
    const bt = warnaTerang[kl];
    const ag = warnaGelap[kd];
    const bg = warnaGelap[kl];
    const okT = lolos(at, bt, p.jenis);
    const okG = lolos(ag, bg, p.jenis);
    if (!okT || !okG) gagal += 1;
    baris.push(
      `| \`${p.depan}\` / \`${p.latar}\` (${f(AMBANG[p.jenis])}:1) | ${at} / ${bt} — **${f(rasioTertulis(at, bt))}:1** | ${ag} / ${bg} — **${f(rasioTertulis(ag, bg))}:1** | ${tanda(okT && okG)} |`
    );
  }
  return { teks: baris.join('\n'), gagal };
}

function tabelInti() {
  const latar = ['putih', 'tinta050', 'biru100', 'biruMuda', 'biruSedang', 'biruBaja'];
  const depan = ['putih', 'tinta', 'tinta700', 'tinta500'];
  const baris = [`| Teks \\ Latar | ${latar.map((l) => `${l} ${palet[l]}`).join(' | ')} |`, `|---|${latar.map(() => '---').join('|')}|`];
  for (const d of depan) {
    baris.push(`| ${d} ${palet[d]} | ${latar.map((l) => (d === l ? '–' : `${f(rasioTertulis(palet[d], palet[l]))}`)).join(' | ')} |`);
  }
  return baris.join('\n');
}

function tabelBiruTua() {
  const baris = [
    '| Opsi | HEX | Teks putih di atasnya (tombol) | Sebagai teks di putih | di surface #F4F7FB | di biru100 #E4F3F7 | di biru muda #B4E1EB |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const o of OPSI_BIRU_TUA) {
    const r = (l) => `${f(rasioTertulis(o.hex, l))}${rasioTertulis(o.hex, l) >= 4.5 ? '' : ' (di bawah 4,5)'}`;
    baris.push(`| ${o.kode}. ${o.nama} | ${o.hex} | ${r(palet.putih)} | ${r(palet.putih)} | ${r(warnaTerang.permukaan)} | ${r(palet.biru100)} | ${r(palet.biruMuda)} |`);
  }
  return baris.join('\n');
}

function tabelStatus(opsi) {
  const baris = ['| Opsi | HEX / latar | Teks di putih | Teks di latarnya sendiri | Teks #0C1B33 di latarnya | Teks putih di atasnya |', '|---|---|---|---|---|---|'];
  for (const o of opsi) {
    baris.push(
      `| ${o.kode}. ${o.nama} | ${o.hex} / ${o.latar} | ${f(rasioTertulis(o.hex, palet.putih))} | ${f(rasioTertulis(o.hex, o.latar))} | ${f(rasioTertulis(warnaTerang.teks, o.latar))} | ${f(rasioTertulis(palet.putih, o.hex))} |`
    );
  }
  return baris.join('\n');
}

if (require.main === module) {
  const r = tabelRingkasDuaMode();
  const pt = tabelPasangan(warnaTerang);
  const pg = tabelPasangan(warnaGelap);
  console.log('## Ringkasan pasangan dua mode (LANJUT_031b)\n');
  console.log(r.teks);
  console.log('\n## Pasangan komponen v2 — Mode terang\n');
  console.log(pt.teks);
  console.log('\n## Pasangan komponen v2 — Mode gelap\n');
  console.log(pg.teks);
  console.log('\n## Palet inti dan netral\n');
  console.log(tabelInti());
  console.log('\n## Opsi biru tua (mode terang)\n');
  console.log(tabelBiruTua());
  console.log('\n## Opsi sukses (mode terang)\n');
  console.log(tabelStatus(OPSI_SUKSES));
  console.log('\n## Opsi galat (mode terang)\n');
  console.log(tabelStatus(OPSI_GALAT));
  console.log(`\nMode terang: ${PASANGAN.length} pasangan, ${pt.gagal} gagal.`);
  console.log(`Mode gelap: ${PASANGAN.length} pasangan, ${pg.gagal} gagal.`);
  const totalGagal = r.gagal + pt.gagal + pg.gagal;
  process.exit(totalGagal ? 1 : 0);
}

module.exports = { tabelPasangan, tabelRingkasDuaMode, PASANGAN_RINGKAS_031B };
