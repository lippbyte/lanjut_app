// Menghitung rasio kontras token tema v2 (LANJUT_029) dari theme/v2 milik app, lalu mencetak
// tabel Markdown untuk docs/desain-token-v2.md. Hanya membaca.
//
//   node tools/kontras-token.js
//
// Keluar dengan kode 1 bila ada pasangan yang dipakai komponen tidak lolos ambangnya.

const { muatModulApp } = require('../tests/muat-ts-app');

const tema = muatModulApp('theme/v2/index');
const { warna, palet, PASANGAN, OPSI_BIRU_TUA, OPSI_SUKSES, OPSI_GALAT, AMBANG, rasioTertulis, lolos } = tema;

const f = (n) => n.toFixed(2).replace('.', ',');
const tanda = (ok) => (ok ? 'lolos' : '**GAGAL**');

function tabelPasangan() {
  const baris = ['| Depan | Latar | Jenis (ambang) | Rasio | Hasil | Dipakai di |', '|---|---|---|---|---|---|'];
  let gagal = 0;
  for (const p of PASANGAN) {
    const a = warna[p.depan];
    const b = warna[p.latar];
    const ok = lolos(a, b, p.jenis);
    if (!ok) gagal += 1;
    baris.push(`| \`${p.depan}\` ${a} | \`${p.latar}\` ${b} | ${p.jenis} (${f(AMBANG[p.jenis])}) | ${f(rasioTertulis(a, b))}:1 | ${tanda(ok)} | ${p.dipakai} |`);
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
    '| Opsi | HEX | Teks putih di atasnya (tombol) | Sebagai teks di putih | di halaman #F5F7F9 | di biru100 #E4F3F7 | di biru muda #B4E1EB |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const o of OPSI_BIRU_TUA) {
    const r = (l) => `${f(rasioTertulis(o.hex, l))}${rasioTertulis(o.hex, l) >= 4.5 ? '' : ' (di bawah 4,5)'}`;
    baris.push(`| ${o.kode}. ${o.nama} | ${o.hex} | ${r(palet.putih)} | ${r(palet.putih)} | ${r(palet.tinta050)} | ${r(palet.biru100)} | ${r(palet.biruMuda)} |`);
  }
  return baris.join('\n');
}

function tabelStatus(opsi) {
  const baris = ['| Opsi | HEX / latar | Teks di putih | Teks di latarnya sendiri | Teks #1A1A1A di latarnya | Teks putih di atasnya |', '|---|---|---|---|---|---|'];
  for (const o of opsi) {
    baris.push(`| ${o.kode}. ${o.nama} | ${o.hex} / ${o.latar} | ${f(rasioTertulis(o.hex, palet.putih))} | ${f(rasioTertulis(o.hex, o.latar))} | ${f(rasioTertulis(palet.tinta, o.latar))} | ${f(rasioTertulis(palet.putih, o.hex))} |`);
  }
  return baris.join('\n');
}

if (require.main === module) {
  const p = tabelPasangan();
  console.log('## Pasangan yang dipakai komponen v2 (opsi pertama)\n');
  console.log(p.teks);
  console.log('\n## Palet inti dan netral\n');
  console.log(tabelInti());
  console.log('\n## Opsi biru tua\n');
  console.log(tabelBiruTua());
  console.log('\n## Opsi sukses\n');
  console.log(tabelStatus(OPSI_SUKSES));
  console.log('\n## Opsi galat\n');
  console.log(tabelStatus(OPSI_GALAT));
  console.log(`\n${PASANGAN.length} pasangan, ${p.gagal} gagal.`);
  process.exit(p.gagal ? 1 : 0);
}

module.exports = { tabelPasangan };
