#!/usr/bin/env node
// tools/benih-persetujuan-dummy.js (LANJUT_025 seri v2). HANYA untuk basis data dev di komputer ini.
//
// Kartu Discover dan jalur minat di data konten masih draf, jadi layar Discover dan Jalur & Tujuan
// kosong di dev (K37). Skrip ini menandai SATU kartu Discover dan SATU jalur minat sebagai
// `disetujui` DI BASIS DATA, dengan judul, teks, dan sumber yang terbaca palsu, supaya layarnya bisa
// dicoba. Isi aslinya tidak dipakai: teks dummy bukan penjelasan tentang bidang, profesi, atau jalur
// apa pun.
//
// Berkas di server/data-konten TIDAK pernah ditulis, hanya dibaca saat --cabut. Status draf di sana
// tetap draf.
//
//   npm run benih-persetujuan-dummy               tandai
//   npm run benih-persetujuan-dummy -- --cabut    kembalikan kedua baris persis seperti isi berkas
//                                                 konten (sama dengan yang ditulis `npm run benih`)
//
// Menolak, tanpa flag pengecualian: NODE_ENV=production, host yang bukan lokal, dan basis data yang
// namanya tidak diawali lanjut_dev. Setiap perubahan dicetak dan dicatat (sebelum dan sesudah) di
// server/benih-persetujuan-dummy.log. `npm run benih` juga mengembalikan kedua baris dari berkas
// konten, jadi ikut membatalkan tanda ini.

const fs = require('fs');
const path = require('path');
const { hostLokal, teksTujuan } = require('../src/db/pagar-tujuan');

const NAMA = 'benih-persetujuan-dummy';
const TANDA = '[DUMMY – bukan sumber nyata]';
const BERKAS_LOG = path.join(__dirname, '..', 'benih-persetujuan-dummy.log');
const POLA_DB_DEV = /^lanjut_dev($|_)/i;

/** Baris yang ditandai. Keduanya ada di data konten dan masih draf di sana. */
const TARGET = { kartu: 'bidang-kesehatan', jalur: 'melanjutkan' };

/** Isi dummy. Judul asli hanya dipakai sebagai label, diberi awalan [DUMMY]. */
function isiDummy(asli) {
  return {
    kartu: {
      judul: `[DUMMY] ${asli.kartu.judul}`,
      ringkasan: `${TANDA} Teks contoh untuk memeriksa layar Discover di komputer pengembang. Bukan penjelasan tentang bidang, profesi, atau usaha apa pun, dan belum disetujui.`,
      status_teks: 'disetujui',
      url_sumber: TANDA,
    },
    jalur: {
      nama: `[DUMMY] ${asli.jalur.nama}`,
      deskripsi_singkat: `${TANDA} Teks contoh untuk memeriksa layar Jalur & Tujuan di komputer pengembang. Belum disetujui.`,
      status_teks: 'disetujui',
      url_sumber: TANDA,
    },
  };
}

/** Alasan menolak, atau null bila boleh jalan. Tidak ada flag yang bisa melewatinya. */
function alasanTolak(env) {
  if (env.NODE_ENV === 'production') return 'NODE_ENV=production. Persetujuan dummy tidak boleh masuk ke basis data produksi.';
  if (!hostLokal(env.DB_HOST)) return `Host ${env.DB_HOST} bukan lokal. Persetujuan dummy hanya untuk basis data dev di komputer ini.`;
  if (!POLA_DB_DEV.test(String(env.DB_NAME ?? ''))) return `Basis data ${env.DB_NAME} bukan basis data dev. Namanya harus diawali lanjut_dev.`;
  return null;
}

function pilihAksi(argv) {
  const lain = argv.filter((a) => a !== '--cabut');
  if (lain.length) throw new Error(`Argumen tidak dikenal: ${lain.join(' ')}. Yang dikenal hanya --cabut.`);
  return argv.includes('--cabut') ? 'cabut' : 'tandai';
}

const penandaIsi = (nilai) => typeof nilai === 'string' && nilai.trim().startsWith('[ISI');

/** Isi kedua baris menurut berkas konten, dengan aturan yang sama seperti benih. Hanya membaca. */
function isiDariBerkas(dirData, target) {
  const baca = (nama) => JSON.parse(fs.readFileSync(path.join(dirData, nama), 'utf8'));
  const discover = baca('discover.json');
  const jalurMinat = baca('jalur-minat.json');
  const k = discover.data.find((x) => x.id === target.kartu);
  const j = jalurMinat.data.find((x) => x.id === target.jalur);
  if (!k) throw new Error(`Kartu ${target.kartu} tidak ada di discover.json.`);
  if (!j) throw new Error(`Jalur ${target.jalur} tidak ada di jalur-minat.json.`);
  return {
    kartu: { judul: k.judul, ringkasan: k.ringkasan, status_teks: k.status_teks, url_sumber: penandaIsi(k.url_sumber) ? null : k.url_sumber || null },
    jalur: { nama: j.nama, deskripsi_singkat: j.deskripsi_singkat, status_teks: j.status_teks, url_sumber: jalurMinat.url_sumber || null },
  };
}

const tanggal = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ?? null);

async function ambilBaris(db, target) {
  const [[kartu]] = await db.query(
    'SELECT judul, ringkasan, status_teks, url_sumber, status_verifikasi, diperiksa_pada FROM kartu_discover WHERE id = ?',
    [target.kartu]
  );
  const [[jalur]] = await db.query(
    'SELECT nama, deskripsi_singkat, status_teks, url_sumber, status_verifikasi, diperiksa_pada FROM jalur_minat WHERE id = ?',
    [target.jalur]
  );
  if (!kartu || !jalur) {
    throw new Error(`Baris ${!kartu ? `kartu_discover ${target.kartu}` : `jalur_minat ${target.jalur}`} tidak ada. Jalankan npm run migrasi dan npm run benih dulu.`);
  }
  return {
    kartu: { ...kartu, diperiksa_pada: tanggal(kartu.diperiksa_pada) },
    jalur: { ...jalur, diperiksa_pada: tanggal(jalur.diperiksa_pada) },
  };
}

function ringkasPerubahan(sebelum, sesudah) {
  return Object.keys(sesudah)
    .filter((k) => sebelum[k] !== sesudah[k])
    .map((k) => `${k}: ${JSON.stringify(sebelum[k])} -> ${JSON.stringify(sesudah[k])}`);
}

/**
 * Menandai (bawaan) atau mencabut (--cabut). `db`, `target`, `dirData`, dan `berkasLog` hanya
 * diganti tes. Pagar diperiksa lebih dulu, sebelum menyentuh basis data.
 */
async function jalankan({ env = require('../src/config/env'), argv = [], db, target = TARGET, dirData, berkasLog = BERKAS_LOG, log = console.log } = {}) {
  const alasan = alasanTolak(env);
  if (alasan) throw new Error(alasan);
  const aksi = pilihAksi(argv);
  db ??= require('../src/db/koneksi');
  dirData ??= require('../src/db/benih/benih').DIR_DATA;

  const dariBerkas = isiDariBerkas(dirData, target);
  const koneksi = await db.getConnection();
  let sebelum;
  let sesudah;
  try {
    await koneksi.beginTransaction();
    sebelum = await ambilBaris(koneksi, target);
    if (aksi === 'tandai') {
      const d = isiDummy(dariBerkas);
      await koneksi.query(
        "UPDATE kartu_discover SET judul = ?, ringkasan = ?, status_teks = 'disetujui', url_sumber = ?, status_verifikasi = 'belum_diverifikasi', diperiksa_pada = NULL WHERE id = ?",
        [d.kartu.judul, d.kartu.ringkasan, d.kartu.url_sumber, target.kartu]
      );
      await koneksi.query(
        "UPDATE jalur_minat SET nama = ?, deskripsi_singkat = ?, status_teks = 'disetujui', url_sumber = ?, status_verifikasi = 'belum_diverifikasi', diperiksa_pada = NULL WHERE id = ?",
        [d.jalur.nama, d.jalur.deskripsi_singkat, d.jalur.url_sumber, target.jalur]
      );
    } else {
      const b = dariBerkas;
      await koneksi.query('UPDATE kartu_discover SET judul = ?, ringkasan = ?, status_teks = ?, url_sumber = ? WHERE id = ?', [
        b.kartu.judul,
        b.kartu.ringkasan,
        b.kartu.status_teks,
        b.kartu.url_sumber,
        target.kartu,
      ]);
      await koneksi.query('UPDATE jalur_minat SET nama = ?, deskripsi_singkat = ?, status_teks = ?, url_sumber = ? WHERE id = ?', [
        b.jalur.nama,
        b.jalur.deskripsi_singkat,
        b.jalur.status_teks,
        b.jalur.url_sumber,
        target.jalur,
      ]);
    }
    sesudah = await ambilBaris(koneksi, target);
    await koneksi.commit();
  } catch (galat) {
    await koneksi.rollback();
    throw galat;
  } finally {
    koneksi.release();
  }

  const waktu = new Date().toISOString();
  const perubahan = [
    { tabel: 'kartu_discover', id: target.kartu, sebelum: sebelum.kartu, sesudah: sesudah.kartu },
    { tabel: 'jalur_minat', id: target.jalur, sebelum: sebelum.jalur, sesudah: sesudah.jalur },
  ];
  const baris = perubahan.map((p) => JSON.stringify({ waktu, aksi, tujuan: teksTujuan(env), ...p }));
  fs.appendFileSync(berkasLog, `${baris.join('\n')}\n`, 'utf8');

  log(`[${NAMA}] ${aksi === 'tandai' ? 'Ditandai disetujui (DUMMY, hanya di basis data ini)' : 'Dicabut, isi dikembalikan dari berkas konten'}:`);
  for (const p of perubahan) {
    const beda = ringkasPerubahan(p.sebelum, p.sesudah);
    log(`  ${p.tabel} ${p.id}: ${beda.length ? '' : 'tidak ada yang berubah'}`);
    for (const b of beda) log(`    ${b}`);
  }
  log(`[${NAMA}] Dicatat di ${berkasLog}`);
  return { aksi, perubahan };
}

if (require.main === module) {
  const env = require('../src/config/env');
  console.log(`[${NAMA}] Tujuan: ${teksTujuan(env)}`);
  const alasan = alasanTolak(env);
  if (alasan) {
    console.error(`[${NAMA}] DIHENTIKAN. ${alasan}`);
    process.exit(1);
  }
  let kode = 0;
  jalankan({ env, argv: process.argv.slice(2) })
    .catch((galat) => {
      console.error(`[${NAMA}] GAGAL: ${galat.message}`);
      kode = 1;
    })
    .finally(async () => {
      await require('../src/db/koneksi').end();
      process.exit(kode);
    });
}

module.exports = { jalankan, alasanTolak, pilihAksi, isiDummy, isiDariBerkas, TARGET, TANDA, BERKAS_LOG };
