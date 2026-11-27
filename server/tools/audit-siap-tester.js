#!/usr/bin/env node
// tools/audit-siap-tester.js (LANJUT_038 — Audit Siap-Tester, HANYA BACA).
// Mengukur secara dapat diulang tanpa mengubah berkas aplikasi, server, atau basis data:
//   1. Kontras token v2 diperluas (terang & gelap) termasuk pasangan nyata di layar v2 & modal kebijakan
//   2. Penggunaan animasi & kepatuhan "Kurangi gerakan" (useKurangiGerak / gerakBoleh)
//   3. Hitungan kata tetap per keadaan layar v2, kata terlarang, warna ungu EDILAKSO, dan istilah v1 bocor (AST)
//   4. Kesiapan konten di basis data pengembangan (jalur_minat, kartu_discover, tahapan_linimasa, event_sekolah)
//   5. Status gerbang rilis & seluruh berkas docs/draf-teks-*.md
//
// Cara jalankan (dari LANJUT_App/server):
//   node tools/audit-siap-tester.js
//   node tools/audit-siap-tester.js --tanpa-db    (bila hanya ingin audit statis tanpa koneksi MySQL)

const fs = require('fs');
const path = require('path');
const { muatModulApp } = require('../tests/muat-ts-app');
const gerbang = require('./periksa-gerbang-rilis');
const kontrasToken = require('./kontras-token');

const AKAR_APP = path.join(__dirname, '..', '..');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');

const tema = muatModulApp('theme/v2/index');
const { warnaTerang, warnaGelap, PASANGAN, AMBANG, rasioTertulis, lolos } = tema;
const jejakWaktu = muatModulApp('lib/jejakWaktuV2');

function daftarBerkas(dirRel, ekst = /\.tsx?$/) {
  const hasil = [];
  const jalan = (rel) => {
    const penuh = path.join(AKAR_APP, rel);
    if (!fs.existsSync(penuh)) return;
    for (const e of fs.readdirSync(penuh, { withFileTypes: true })) {
      const anak = `${rel}/${e.name}`;
      if (e.isDirectory()) jalan(anak);
      else if (ekst.test(e.name)) hasil.push(anak);
    }
  };
  jalan(dirRel);
  return hasil.sort();
}

function kumpulkanLiteralTeks(rel) {
  const isi = baca(rel);
  const sf = ts.createSourceFile(rel, isi, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const hasil = [];
  const jalan = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      // Abaikan path import / require / tipe key style
      if (!ts.isImportDeclaration(p) && !ts.isExportDeclaration(p)) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        hasil.push({ berkas: rel, baris: line + 1, teks: n.text });
      }
    } else if (ts.isJsxText(n)) {
      const t = n.text.trim();
      if (t) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        hasil.push({ berkas: rel, baris: line + 1, teks: t });
      }
    }
    ts.forEachChild(n, jalan);
  };
  jalan(sf);
  return hasil;
}

// 1. KONTRAS DIPERLUAS (semua pasangan PASANGAN + pasangan nyata tambahan di layar v2)
function auditKontras() {
  const pasanganTambahan = [
    { depan: 'teksSekunder', latar: 'brand', jenis: 'teks', dipakai: 'pemeriksaan larangan muted di atas bagianBiru (terang gagal, maka Kartu brand wajib pakai teks)' },
    { depan: 'aksen', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'pilihan aktif Tampilan, tombol ditekan, chip aktif' },
    { depan: 'garisKontrol', latar: 'permukaanLembut', jenis: 'kontrol', dipakai: 'tepi kontrol di atas permukaanLembut' },
    { depan: 'galat', latar: 'halaman', jenis: 'kontrol', dipakai: 'tepi kartu/tombol galat di atas halaman' },
    { depan: 'aksen', latar: 'halaman', jenis: 'kontrol', dipakai: 'garis fokus & tombol sekunder di atas halaman' },
    { depan: 'aksen', latar: 'permukaan', jenis: 'kontrol', dipakai: 'garis tombol sekunder & radio aktif di atas kartu' },
    { depan: 'teks', latar: 'latarMaskot', jenis: 'teks', dipakai: 'kontras tinta gelap di lingkaran maskot #B4E1EB' },
  ];

  const gagalKomponen = [];
  for (const [namaMode, setWarna] of [['terang', warnaTerang], ['gelap', warnaGelap]]) {
    for (const p of PASANGAN) {
      const a = setWarna[p.depan];
      const b = setWarna[p.latar];
      const r = rasioTertulis(a, b);
      if (!lolos(a, b, p.jenis)) gagalKomponen.push({ mode: namaMode, ...p, hexDepan: a, hexLatar: b, rasio: r });
    }
  }

  const hasilTambahan = [];
  for (const p of pasanganTambahan) {
    const rt = rasioTertulis(warnaTerang[p.depan], warnaTerang[p.latar]);
    const rg = rasioTertulis(warnaGelap[p.depan], warnaGelap[p.latar]);
    hasilTambahan.push({
      pasangan: `${p.depan} / ${p.latar}`,
      jenis: p.jenis,
      ambang: AMBANG[p.jenis],
      terang: { hex: `${warnaTerang[p.depan]} / ${warnaTerang[p.latar]}`, rasio: rt, lolos: lolos(warnaTerang[p.depan], warnaTerang[p.latar], p.jenis) },
      gelap: { hex: `${warnaGelap[p.depan]} / ${warnaGelap[p.latar]}`, rasio: rg, lolos: lolos(warnaGelap[p.depan], warnaGelap[p.latar], p.jenis) },
      dipakai: p.dipakai,
    });
  }

  // Pemeriksaan nyata kebocoran warna v1 pada modal v2 di mode gelap (DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan v1)
  const modalKebijakanGelap = [
    {
      komponen: 'DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan (v1)',
      pasangan: 'color.textBody (#1A1A1A) di atas warnaGelap.halaman (#0C1B33)',
      rasio: rasioTertulis('#1A1A1A', warnaGelap.halaman),
      lolos: lolos('#1A1A1A', warnaGelap.halaman, 'teks'),
    },
    {
      komponen: 'DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan (v1)',
      pasangan: 'color.ink700 (#3D4450) di atas warnaGelap.halaman (#0C1B33)',
      rasio: rasioTertulis('#3D4450', warnaGelap.halaman),
      lolos: lolos('#3D4450', warnaGelap.halaman, 'teks'),
    },
    {
      komponen: 'DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan (v1)',
      pasangan: 'color.textMuted (#6B7480) di atas warnaGelap.halaman (#0C1B33)',
      rasio: rasioTertulis('#6B7480', warnaGelap.halaman),
      lolos: lolos('#6B7480', warnaGelap.halaman, 'teks'),
    },
  ];

  const ringkas = kontrasToken.tabelRingkasDuaMode();
  return {
    ringkas031bGagal: ringkas.gagal,
    pasanganKomponenTotal: PASANGAN.length,
    pasanganKomponenGagal: gagalKomponen,
    pasanganTambahan: hasilTambahan,
    kebocoranV1DiModalGelap: modalKebijakanGelap,
  };
}

// 2. GERAK / REDUCE MOTION
function auditGerak() {
  const berkasV2 = [...daftarBerkas('components/v2'), ...daftarBerkas('components/screens/v2')];
  const temuan = [];
  for (const rel of berkasV2) {
    const isi = baca(rel);
    const pakaiAnimasi = /\b(Animated\.|LayoutAnimation|animationType|animated\s*:)/.test(isi);
    const pakaiInterval = /\bsetInterval\s*\(/.test(isi);
    if (!pakaiAnimasi && !pakaiInterval) continue;
    const hormatiKurangiGerak = /useKurangiGerak|gerakBoleh|kurangiGerak/.test(isi);
    temuan.push({ berkas: rel, pakaiAnimasi, pakaiInterval, hormatiKurangiGerak });
  }
  return temuan;
}

// 3. BAHASA, BATAS KATA, KATA TERLARANG, DAN ISTILAH V1 BOCOR
function auditBahasaDanTeks() {
  const hitungKata = (teks) => teks.trim().split(/\s+/).filter(Boolean).length;
  const arahSaya = muatModulApp('lib/arahSaya');
  const langkahSaya = muatModulApp('lib/langkahSayaV2');
  const jalurSaya = muatModulApp('lib/jalurSayaV2');
  const jelajah = muatModulApp('lib/jelajahV2');
  const rekamJejak = muatModulApp('lib/rekamJejakV2');
  const akunPrivasi = muatModulApp('lib/akunPrivasiV2');
  const alurMasuk = muatModulApp('lib/alurMasukV2');

  const laporanKata = [];
  const catat = (layar, keadaan, daftar, batas = 40) => {
    const jml = hitungKata(Array.isArray(daftar) ? daftar.join(' ') : String(daftar));
    laporanKata.push({ layar, keadaan, kata: jml, batas, lolos: jml <= batas });
  };

  for (const [k, v] of Object.entries(jejakWaktu.teksTetapJejakWaktu ?? {})) catat('Jejak Waktu', k, v, 40);
  for (const [k, v] of Object.entries(langkahSaya.teksTetapLangkahSaya ?? {})) catat('Langkah Saya', k, v, 40);
  for (const [k, v] of Object.entries(jalurSaya.teksTetapJalurSaya ?? {})) catat('Jalur Saya', k, v, 40);
  for (const [k, v] of Object.entries(jelajah.teksTetapJelajahV2 ?? {})) catat('Jelajah & Profil', k, v, 40);
  for (const [k, v] of Object.entries(rekamJejak.teksTetapRekamJejakV2 ?? {})) catat('Rekam Jejak', k, v, 40);
  for (const [k, v] of Object.entries(akunPrivasi.teksTetapAkunPrivasiV2 ?? {})) catat('Akun & Privasi', k, v, 40);
  if (typeof alurMasuk.teksPerLayar === 'function') {
    for (const [k, v] of Object.entries(alurMasuk.teksPerLayar(true))) catat('Alur Masuk v2 (batas 60)', k, v, 60);
  }
  if (typeof arahSaya.kataTetapArahSaya === 'function') {
    const contohArah = arahSaya.kataTetapArahSaya({
      punyaJalur: true,
      belumTahu: false,
      adaLangkah: true,
      saklar: { portofolio: true, discover: true, jalurTujuan: true },
    });
    laporanKata.push({ layar: 'Arah Saya', keadaan: 'saklarPenuh', kata: contohArah, batas: 40, lolos: contohArah <= 40 });
  }

  // Scan istilah v1 yang bocor ke berkas v2 (hanya literal string yang tampil, bukan komentar)
  const berkasTeksV2 = [
    'lib/alurMasukV2.ts',
    'lib/arahSaya.ts',
    'lib/navigasiV2.ts',
    'lib/modeTampilan.ts',
    'lib/jejakWaktuV2.ts',
    'lib/langkahSayaV2.ts',
    'lib/jalurSayaV2.ts',
    'lib/jelajahV2.ts',
    'lib/rekamJejakV2.ts',
    'lib/akunPrivasiV2.ts',
    ...daftarBerkas('components/screens/v2'),
    ...daftarBerkas('components/v2'),
  ];

  const POLA_V1_BOCOR = /\b(Sedang dikejar|Portofolio|Discover|Linimasa|Data Akun|Daftar Periksa)\b/i;
  const POLA_TERLARANG = /\b(bagikan|peringkat|ranking|skor|lomba|leaderboard|enkripsi end-to-end|hanya kamu yang bisa melihat)\b/i;
  const POLA_UNGU = new RegExp('#' + '6a3dff', 'i');

  const istilahV1Bocor = [];
  const kataTerlarang = [];
  const unguDitemukan = [];

  for (const rel of berkasTeksV2) {
    if (POLA_UNGU.test(baca(rel))) unguDitemukan.push(rel);
    for (const lit of kumpulkanLiteralTeks(rel)) {
      // Abaikan path rute URL (mis. '/portofolio', '/discover', '/linimasa', '/daftar-periksa') dan kunci cache
      if (/^\/[a-z0-9-]+$/i.test(lit.teks) || /^[a-z_]+$/i.test(lit.teks)) continue;
      if (POLA_V1_BOCOR.test(lit.teks)) {
        istilahV1Bocor.push({ berkas: lit.berkas, baris: lit.baris, cocok: lit.teks.match(POLA_V1_BOCOR)[0], teks: lit.teks });
      }
      if (POLA_TERLARANG.test(lit.teks)) {
        kataTerlarang.push({ berkas: lit.berkas, baris: lit.baris, cocok: lit.teks.match(POLA_TERLARANG)[0], teks: lit.teks });
      }
    }
  }

  return {
    batasKataGagal: laporanKata.filter((x) => !x.lolos),
    totalKeadaanDiukur: laporanKata.length,
    ringkasKataTertinggi: [...laporanKata].sort((a, b) => b.kata - a.kata).slice(0, 8),
    istilahV1Bocor,
    kataTerlarang,
    unguDitemukan,
  };
}

// 4. PETA SELURUH RUTE DI app/
function auditRute() {
  const semua = daftarBerkas('app', /\.tsx$/).filter((r) => !/\/(_layout|\+html)\.tsx$/.test(r) && !/^app\/(_layout|\+html)\.tsx$/.test(r));
  return semua.map((rel) => {
    const isi = baca(rel);
    const rute =
      '/' +
      rel
        .replace(/^app\//, '')
        .replace(/^\((app|auth)\)\//, '')
        .replace(/\.tsx$/, '')
        .replace(/^index$/, '');
    const pakaiV2 = /components\/screens\/v2\/|navigasiV2Aktif|alurMasukV2Aktif|galeriKomponen/.test(isi);
    return { rute: rute === '/' ? '/' : rute, berkas: rel, punyaCabangV2: pakaiV2 };
  });
}

// 5. GERBANG RILIS & DOKUMEN DRAF
function auditGerbangRilis() {
  const masalah = gerbang.periksa(AKAR_APP);
  const lain = gerbang.teksDrafLain(AKAR_APP);
  const persetujuan = JSON.parse(baca('docs/persetujuan-teks-rilis.json'));
  const dokDraf = fs
    .readdirSync(path.join(AKAR_APP, 'docs'))
    .filter((f) => /^draf-teks-.*\.md$/.test(f))
    .sort();
  return {
    totalMasalah: masalah.length,
    isianKebijakanKosong: masalah.filter((m) => m.jenis === 'isian').length,
    teksBelumDisetujui: masalah.filter((m) => m.jenis === 'draf').map((m) => m.pesan),
    berkasDrafLainJumlah: lain.length,
    tandaDrafLainJumlah: lain.reduce((n, b) => n + b.jumlah, 0),
    disetujuiDiJson: (persetujuan.disetujui ?? []).length,
    daftarDokumenDraf: dokDraf,
  };
}

// 6. KESIAPAN KONTEN DI BASIS DATA DEV (HANYA SELECT)
async function auditKontenDb() {
  process.chdir(path.join(AKAR_APP, 'server'));
  const pool = require('../src/db/koneksi');
  try {
    const [[{ db }]] = await pool.query('SELECT DATABASE() AS db');
    const [jalur] = await pool.query('SELECT id, nama, status_teks, urutan FROM jalur_minat ORDER BY urutan');
    const [kartu] = await pool.query('SELECT id, jenis, judul, status_teks, status_verifikasi, url_sumber, asal FROM kartu_discover ORDER BY urutan');
    const [tahapan] = await pool.query(
      'SELECT id, judul, DATE_FORMAT(tanggal_mulai, "%Y-%m-%d") AS tanggal_mulai, DATE_FORMAT(tanggal_selesai, "%Y-%m-%d") AS tanggal_selesai, jalur_seleksi, status_verifikasi, asal, url_sumber, DATE_FORMAT(diperiksa_pada, "%Y-%m-%d") AS diperiksa_pada FROM tahapan_linimasa ORDER BY tanggal_mulai'
    );
    const [konfig] = await pool.query("SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN ('ai_aktif', 'event_sekolah_aktif')");
    const [[evCount]] = await pool.query('SELECT COUNT(*) AS n FROM event_sekolah');

    const tahapanTerverifikasi = tahapan.filter((t) => t.status_verifikasi === 'terverifikasi');
    const sekarang = new Date();
    const simulasiKelas = {};
    for (const kelas of ['12', '11', '10', '9']) {
      const hasil = jejakWaktu.susunJejakWaktu({
        kelas,
        tahapanLinimasa: kelas === '12' ? tahapanTerverifikasi : [],
        eventSekolah: [],
        sekarangMs: sekarang.getTime(),
      });
      simulasiKelas[`kelas_${kelas}`] = {
        segera: hasil.segera.length,
        berikutnya: hasil.berikutnya.length,
        sudahLewat: hasil.sudahLewat.length,
        total: hasil.total,
        butirSegera: hasil.segera.map((b) => `${b.judul} (${b.jarakTeks}${b.catatanRincian ? ', ' + b.catatanRincian : ''})`),
        butirSudahLewat: hasil.sudahLewat.map((b) => b.judul),
      };
    }

    return {
      database: db,
      tanggalAudit: sekarang.toISOString().slice(0, 10),
      konfigurasi: Object.fromEntries(konfig.map((k) => [k.kunci, k.nilai])),
      jalurMinat: {
        total: jalur.length,
        disetujui: jalur.filter((j) => j.status_teks === 'disetujui').length,
        draf: jalur.filter((j) => j.status_teks === 'draf').length,
        rincian: jalur,
      },
      kartuDiscover: {
        total: kartu.length,
        disetujui: kartu.filter((k) => k.status_teks === 'disetujui').length,
        terverifikasi: kartu.filter((k) => k.status_verifikasi === 'terverifikasi').length,
        bersumberUrl: kartu.filter((k) => Boolean(k.url_sumber)).length,
        draf: kartu.filter((k) => k.status_teks === 'draf').length,
      },
      tahapanLinimasa: {
        total: tahapan.length,
        terverifikasi: tahapanTerverifikasi.length,
        belumDiverifikasi: tahapan.length - tahapanTerverifikasi.length,
        rincian: tahapan,
      },
      eventSekolahTotal: evCount.n,
      simulasiJejakWaktuHariIni: simulasiKelas,
    };
  } finally {
    await pool.end();
  }
}

async function main() {
  const tanpaDb = process.argv.includes('--tanpa-db');
  const hasil = {
    kontras: auditKontras(),
    gerak: auditGerak(),
    bahasaDanTeks: auditBahasaDanTeks(),
    rute: auditRute(),
    gerbangRilis: auditGerbangRilis(),
    kontenDb: tanpaDb ? null : await auditKontenDb(),
  };
  console.log(JSON.stringify(hasil, null, 2));
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { auditKontras, auditGerak, auditBahasaDanTeks, auditRute, auditGerbangRilis, auditKontenDb };
