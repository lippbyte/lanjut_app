#!/usr/bin/env node
// tools/periksa-gerbang-rilis.js (LANJUT_014 seri v2). Dijalankan sebelum `eas build`, sengaja di luar
// `npm test`, supaya isian yang belum lengkap tidak mematahkan PR lain. Hanya membaca berkas.
//
//   npm run periksa-gerbang-rilis             keluar 1 bila masih ada masalah
//   npm run periksa-gerbang-rilis -- --sidik  mencetak sidik teks untuk docs/persetujuan-teks-rilis.json
//
// Gagal bila:
//   1. lib/kebijakan-privasi.json masih memuat penanda [ISI;
//   2. kebijakan masih menyatakan tidak mengumpulkan foto atau hapus akun belum ada, padahal saklarnya
//      menyala di salah satu profil eas.json;
//   3. teks bertanda draf dipakai profil yang menyalakan saklarnya dan belum disetujui. Persetujuan
//      terikat pada sidik teks, jadi gugur sendiri bila teksnya berubah sesudah disetujui;
//   4. kalimat foto yang sudah diganti (K29) muncul lagi, padahal Portofolio menyala.
//
// Teks lain yang berkomentar DRAF hanya dihitung sebagai peringatan, bukan kegagalan.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AKAR_BAWAAN = path.join(__dirname, '..', '..');
const BERKAS_KEBIJAKAN = 'lib/kebijakan-privasi.json';
const BERKAS_PERSETUJUAN = 'docs/persetujuan-teks-rilis.json';
const SAKLAR_PORTOFOLIO = 'EXPO_PUBLIC_PORTOFOLIO';
const SAKLAR_HAPUS_AKUN = 'EXPO_PUBLIC_KELOLA_DATA_AKUN';

// `saklar` null: tertanam di semua build, jadi berlaku bila ada saklar mana pun yang menyala.
const TEKS = [
  { id: 'kebijakan-privasi', nama: 'Kebijakan privasi', saklar: null, berkas: [BERKAS_KEBIJAKAN] },
  { id: 'portofolio', nama: 'Teks Portofolio', saklar: SAKLAR_PORTOFOLIO, berkas: ['lib/portofolio.ts', 'docs/draf-teks-portofolio.md'] },
  { id: 'hapus-akun', nama: 'Teks unduh data dan hapus akun', saklar: SAKLAR_HAPUS_AKUN, berkas: ['lib/dataAkun.ts', 'docs/draf-teks-hapus-akun.md'] },
];

const BERKAS_TEKS_FOTO = ['lib/portofolio.ts', 'lib/beranda.ts'];
const FOLDER_KODE = ['app', 'components', 'lib', 'hooks', 'providers', 'api'];
// Sudah diperiksa lewat TEKS, atau hanya pembungkus teks itu.
const SUDAH_DIGERBANG = new Set([...TEKS.flatMap((t) => t.berkas), 'lib/kebijakanPrivasi.ts', 'components/screens/KebijakanPrivasiScreen.tsx', 'components/screens/PortofolioScreens.tsx']);
const POLA_DRAF = /\bDRAF\b|belum disetujui/g;

const baca = (akar, rel) => fs.readFileSync(path.join(akar, rel), 'utf8').replace(/\r\n/g, '\n');

function profilMenyala(build, saklar) {
  return Object.entries(build)
    .filter(([, profil]) => profil.env && profil.env[saklar] === '1')
    .map(([nama]) => nama);
}

// Semua yang tampil ke siswa. `_catatan` hanya catatan pengembang, jadi tidak ikut.
function kalimatKebijakan(k) {
  return [
    { letak: 'Status', teks: k.status },
    ...k.ringkasan.map((teks, i) => ({ letak: `Ringkasan ${i + 1}`, teks })),
    ...k.isi.flatMap((b) => [b.judul, ...(b.paragraf ?? []), ...(b.butir ?? [])].map((teks) => ({ letak: b.judul, teks }))),
  ];
}

const menyatakanTanpaFoto = ({ letak, teks }) =>
  (/yang tidak kami kumpulkan/i.test(letak) && /\bfoto\b/i.test(teks) && !/kecuali foto/i.test(teks)) ||
  /tidak\s+(mengumpulkan|menyimpan)\b[^.]*\bfoto\b/i.test(teks);

// K29: janji tentang perilaku tim, dan kalimat yang terlalu mutlak.
const KALIMAT_FOTO_LAMA = [/tanpa keperluan/i, /hanya terlihat olehmu/i, /hanya kamu yang bisa melihat/i];
const memuatKalimatFotoLama = (teks) => KALIMAT_FOTO_LAMA.some((p) => p.test(teks));

const menyatakanHapusAkunBelumAda = ({ teks }) => /hapus akun[^.]*belum ada|belum ada[^.]*hapus akun/i.test(teks);

function sidikTeks(akar, id) {
  const { berkas } = TEKS.find((t) => t.id === id);
  const hash = crypto.createHash('sha256');
  for (const rel of berkas) hash.update(baca(akar, rel));
  return hash.digest('hex');
}

function bacaPersetujuan(akar) {
  if (!fs.existsSync(path.join(akar, BERKAS_PERSETUJUAN))) return [];
  return JSON.parse(baca(akar, BERKAS_PERSETUJUAN)).disetujui ?? [];
}

function periksaDraf(akar, build) {
  const persetujuan = bacaPersetujuan(akar);
  const adaSaklar = [SAKLAR_PORTOFOLIO, SAKLAR_HAPUS_AKUN].some((s) => profilMenyala(build, s).length > 0);
  const masalah = [];
  for (const t of TEKS) {
    const dipakai = t.saklar ? profilMenyala(build, t.saklar).length > 0 : adaSaklar;
    if (!dipakai || !t.berkas.some((rel) => /\bdraf\b/i.test(baca(akar, rel)))) continue;
    const milik = persetujuan.filter((p) => p.teks === t.id);
    const sidik = sidikTeks(akar, t.id);
    const sah = milik.some((p) => p.sidik === sidik && /^\d{4}-\d{2}-\d{2}$/.test(p.tanggal ?? '') && String(p.oleh ?? '').trim());
    if (sah) continue;
    masalah.push({
      jenis: 'draf',
      pesan: milik.some((p) => p.sidik !== sidik)
        ? `${t.nama}: persetujuannya gugur, karena teksnya berubah sesudah disetujui.`
        : `${t.nama}: masih draf dan belum disetujui.`,
    });
  }
  return masalah;
}

function berkasKode(akar, rel) {
  const penuh = path.join(akar, rel);
  if (!fs.existsSync(penuh)) return [];
  return fs.readdirSync(penuh, { withFileTypes: true }).flatMap((e) => {
    const anak = `${rel}/${e.name}`;
    if (e.isDirectory()) return berkasKode(akar, anak);
    return /\.tsx?$/.test(e.name) ? [anak] : [];
  });
}

/** Berkas di luar gerbang yang masih berkomentar DRAF. Hanya untuk peringatan. */
function teksDrafLain(akar = AKAR_BAWAAN) {
  return FOLDER_KODE.flatMap((d) => berkasKode(akar, d))
    .filter((rel) => !SUDAH_DIGERBANG.has(rel))
    .map((rel) => ({ berkas: rel, jumlah: (baca(akar, rel).match(POLA_DRAF) ?? []).length }))
    .filter((b) => b.jumlah > 0)
    .sort((a, b) => a.berkas.localeCompare(b.berkas));
}

/** Daftar masalah. Kosong berarti lolos. */
function periksa(akar = AKAR_BAWAAN) {
  const kebijakan = JSON.parse(baca(akar, BERKAS_KEBIJAKAN));
  const { build } = JSON.parse(baca(akar, 'eas.json'));
  const kalimat = kalimatKebijakan(kebijakan);
  const masalah = [];

  for (const { letak, teks } of kalimat) {
    for (const m of teks.matchAll(/\[ISI[^\]]*\]?/g)) {
      masalah.push({ jenis: 'isian', pesan: `${letak}: ${m[0].replace(/^\[ISI:?\s*/, '').replace(/\]$/, '')}` });
    }
  }

  const portofolio = profilMenyala(build, SAKLAR_PORTOFOLIO);
  if (portofolio.length) {
    for (const k of kalimat.filter(menyatakanTanpaFoto)) {
      masalah.push({ jenis: 'kalimat', pesan: `${k.letak}: masih menyatakan tidak mengumpulkan foto, padahal Portofolio menyala di profil ${portofolio.join(', ')}.` });
    }
    for (const k of kalimat.filter(({ teks }) => memuatKalimatFotoLama(teks))) {
      masalah.push({ jenis: 'kalimat', pesan: `${k.letak}: masih memuat kalimat foto yang sudah diganti (K29).` });
    }
    for (const rel of BERKAS_TEKS_FOTO.filter((r) => fs.existsSync(path.join(akar, r)) && memuatKalimatFotoLama(baca(akar, r)))) {
      masalah.push({ jenis: 'kalimat', pesan: `${rel}: masih memuat kalimat foto yang sudah diganti (K29).` });
    }
  }
  const hapusAkun = profilMenyala(build, SAKLAR_HAPUS_AKUN);
  if (hapusAkun.length) {
    for (const k of kalimat.filter(menyatakanHapusAkunBelumAda)) {
      masalah.push({ jenis: 'kalimat', pesan: `${k.letak}: masih menyatakan hapus akun belum ada, padahal fiturnya menyala di profil ${hapusAkun.join(', ')}.` });
    }
  }

  return [...masalah, ...periksaDraf(akar, build)];
}

const JUDUL = {
  isian: 'Isian kebijakan yang masih kosong',
  kalimat: 'Kalimat kebijakan yang tidak sesuai dengan fitur yang menyala',
  draf: 'Teks yang belum disetujui',
};

function jalankan(argv) {
  let akar = AKAR_BAWAAN;
  let cetakSidik = false;
  for (const a of argv) {
    if (a === '--sidik') cetakSidik = true;
    else if (a.startsWith('--akar=')) akar = path.resolve(a.slice('--akar='.length));
    else throw new Error(`Argumen "${a}" tidak dikenal. Pilihan: --sidik, --akar=<folder>`);
  }

  if (cetakSidik) {
    console.log(`Salin ke ${BERKAS_PERSETUJUAN} bagian "disetujui", untuk teks yang sudah kamu baca dan setujui:`);
    for (const t of TEKS) console.log(JSON.stringify({ teks: t.id, sidik: sidikTeks(akar, t.id), tanggal: 'YYYY-MM-DD', oleh: 'Khalifa' }));
    return 0;
  }

  const masalah = periksa(akar);
  const lain = teksDrafLain(akar);
  const peringatan = () => {
    if (!lain.length) return;
    const jumlah = lain.reduce((n, b) => n + b.jumlah, 0);
    console.log(`\nPeringatan, bukan kegagalan: ${lain.length} berkas lain masih memuat ${jumlah} tanda DRAF. Rinciannya di docs/audit-teks-kebijakan-aplikasi.md.`);
  };
  if (masalah.length === 0) {
    console.log('[periksa-gerbang-rilis] LOLOS. Semua syarat teks sudah terpenuhi.');
    peringatan();
    return 0;
  }
  console.log(`[periksa-gerbang-rilis] BELUM BOLEH BUILD. Ada ${masalah.length} hal yang harus dibereskan.`);
  for (const jenis of Object.keys(JUDUL)) {
    const bagian = masalah.filter((m) => m.jenis === jenis);
    if (!bagian.length) continue;
    console.log(`\n${JUDUL[jenis]} (${bagian.length}):`);
    bagian.forEach((m, i) => console.log(`  ${i + 1}. ${m.pesan}`));
  }
  peringatan();
  return 1;
}

if (require.main === module) {
  try {
    process.exitCode = jalankan(process.argv.slice(2));
  } catch (galat) {
    console.error(`[periksa-gerbang-rilis] ${galat.message}`);
    process.exitCode = 2;
  }
}

module.exports = { periksa, sidikTeks, teksDrafLain, TEKS };
