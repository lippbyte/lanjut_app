#!/usr/bin/env node
// tools/benih-dummy.js (LANJUT_022 seri v2). Mengisi basis data LOKAL dengan akun contoh berawalan
// `uji_` atau `demo_`, beserta persetujuan kebijakan, kartu, latihan, jalur minat, dan tujuan.
// Menolak NODE_ENV=production dan host yang bukan lokal, tanpa pengecualian. Akun yang sudah ada
// dilewati, jadi aman diulang. Butuh migrasi dan benih lokal yang sudah dijalankan.
//
//   npm run benih-dummy
//   npm run benih-dummy -- --akhiran=a1   nama akun diberi akhiran, mis. demo_kelas12_a1
//
// Kata sandi semua akun: DUMMY_KATA_SANDI bila diisi, selain itu dibuat acak dan dicetak sekali.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { hostLokal, teksTujuan } = require('../src/db/pagar-tujuan');

const DOMAIN_EMAIL = 'contoh.test';
const AWALAN_SAH = /^(uji|demo)_/;
const AKUN = [
  { nama: 'demo_kelas12', tampilan: 'Demo Kelas 12', kelas: '12', jenisSekolah: 'SMK', jalur: ['melanjutkan'], tujuan: 'Diterima di prodi incaran' },
  { nama: 'demo_kelas10', tampilan: 'Demo Kelas 10', kelas: '10', jenisSekolah: 'SMA', jalur: ['bekerja', 'wirausaha'], tujuan: 'Menyelesaikan satu proyek kecil' },
  { nama: 'uji_smp', tampilan: 'Uji SMP', kelas: '8', jenisSekolah: 'SMP', jalur: ['melanjutkan'], tujuan: 'Naik kelas dengan nilai baik' },
];

/** Alasan menolak, atau null bila boleh jalan. Tidak ada flag yang bisa melewatinya. */
function alasanTolakDummy(env) {
  if (env.NODE_ENV === 'production') return 'NODE_ENV=production. Data dummy tidak boleh masuk ke basis data produksi.';
  if (!hostLokal(env.DB_HOST)) return `Host ${env.DB_HOST} bukan lokal. Data dummy hanya untuk basis data di komputer ini.`;
  if (String(env.DB_NAME).toLowerCase().startsWith('lanjut_db')) return `DB_NAME ${env.DB_NAME} memakai nama produksi.`;
  return null;
}

function namaAkun(dasar, akhiran) {
  if (akhiran && !/^[a-z0-9]{1,8}$/.test(akhiran)) throw new Error('--akhiran hanya boleh huruf kecil dan angka, paling panjang 8.');
  const nama = akhiran ? `${dasar}_${akhiran}` : dasar;
  if (!AWALAN_SAH.test(nama)) throw new Error(`Nama akun dummy harus berawalan uji_ atau demo_: ${nama}`);
  return nama;
}

async function jalankan({ env = require('../src/config/env'), akhiran = '', kataSandi = process.env.DUMMY_KATA_SANDI, log = console.log } = {}) {
  const alasan = alasanTolakDummy(env);
  if (alasan) throw new Error(alasan);

  const pool = require('../src/db/koneksi');
  const penggunaRepo = require('../src/modul/pengguna/pengguna.repo');
  const persetujuanRepo = require('../src/modul/persetujuan/persetujuan.repo');
  const kartuRepo = require('../src/modul/kartu/kartu.repo');
  const levelinRepo = require('../src/modul/levelin/levelin.repo');
  const tujuanRepo = require('../src/modul/tujuan/tujuan.repo');
  const penggunaJalurMinatRepo = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
  const { buatUuid } = require('../src/util/id');
  const { sekarangUntukDb } = require('../src/util/waktu');

  const [[mapel]] = await pool.query('SELECT id FROM mapel ORDER BY id LIMIT 1');
  if (!mapel) throw new Error('Tabel mapel kosong. Jalankan migrasi dan benih lokal dulu (docs/lingkungan-dev.md).');
  const [[versi]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  if (!versi) throw new Error('Versi kebijakan belum ada. Jalankan migrasi lokal dulu.');
  const [jalurAda] = await pool.query('SELECT id FROM jalur_minat WHERE aktif = 1');
  const jalurSah = new Set(jalurAda.map((b) => b.id));

  const sandi = kataSandi || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(sandi, 12);
  const hasil = { dibuat: [], dilewati: [], kataSandiDibuat: kataSandi ? null : sandi };

  for (const a of AKUN) {
    const nama = namaAkun(a.nama, akhiran);
    const [[ada]] = await pool.query('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama]);
    if (ada) {
      hasil.dilewati.push(nama);
      continue;
    }
    const waktu = sekarangUntukDb();
    const id = buatUuid();
    await penggunaRepo.buatPengguna({
      id,
      namaPengguna: nama,
      namaTampilan: a.tampilan,
      email: `${nama}@${DOMAIN_EMAIL}`,
      emailTerverifikasi: true,
      kataSandiHash: hash,
      kelas: a.kelas,
      jenisSekolah: a.jenisSekolah,
      prodiTujuan: null,
      dibuatPada: waktu,
    });
    await persetujuanRepo.tambah({ penggunaId: id, jenis: 'kebijakan_privasi', versi: Number(versi.nilai), status: 'setuju', sumber: 'mandiri', catatan: 'Data dummy LANJUT_022', dicatatPada: waktu });
    const kartuId = buatUuid();
    await kartuRepo.buatKartu({ id: kartuId, pemilikId: id, mapelId: mapel.id, judul: 'Kartu contoh', isi: 'Contoh pertanyaan latihan.', jawaban: 'Contoh jawaban.', waktu });
    const sesiId = buatUuid();
    await levelinRepo.buatSesiLatihan({ id: sesiId, penggunaId: id, dimulaiPada: waktu, jumlahKartuDirencanakan: 1, mapelFokusId: mapel.id, asalMula: 'arsip' });
    await levelinRepo.simpanSatuRiwayat(id, { id: buatUuid(), kartuId, benar: true, dijawabPada: waktu, sesiId, keyakinan: 4, mapelId: mapel.id });
    await levelinRepo.tutupSesiLatihan(id, sesiId, waktu);
    const jalur = a.jalur.filter((j) => jalurSah.has(j));
    for (const j of jalur) await penggunaJalurMinatRepo.buat({ id: buatUuid(), penggunaId: id, jalurMinatId: j, waktu });
    await tujuanRepo.buat({ id: buatUuid(), penggunaId: id, jalurMinatId: jalur[0] ?? null, judul: a.tujuan, waktu });
    hasil.dibuat.push(nama);
  }
  log(`[benih-dummy] dibuat: ${hasil.dibuat.join(', ') || '-'}; dilewati karena sudah ada: ${hasil.dilewati.join(', ') || '-'}`);
  return hasil;
}

async function cli(argv) {
  let akhiran = '';
  for (const a of argv) {
    if (a.startsWith('--akhiran=')) akhiran = a.slice('--akhiran='.length);
    else throw new Error(`Argumen "${a}" tidak dikenal. Pilihan: --akhiran=<huruf dan angka>`);
  }
  const env = require('../src/config/env');
  console.log(`[benih-dummy] Tujuan: ${teksTujuan(env)}`);
  const alasan = alasanTolakDummy(env);
  if (alasan) {
    console.error(`[benih-dummy] DIHENTIKAN. ${alasan}`);
    return 1;
  }
  try {
    const hasil = await jalankan({ env, akhiran });
    if (hasil.kataSandiDibuat && hasil.dibuat.length) {
      console.log(`[benih-dummy] Kata sandi semua akun baru: ${hasil.kataSandiDibuat} (hanya dicetak sekali, tidak disimpan di mana pun).`);
    }
    return 0;
  } finally {
    await require('../src/db/koneksi').end();
  }
}

if (require.main === module) {
  cli(process.argv.slice(2))
    .then((kode) => process.exit(kode))
    .catch((galat) => {
      console.error(`[benih-dummy] GAGAL: ${galat.message}`);
      process.exit(1);
    });
}

module.exports = { jalankan, alasanTolakDummy, namaAkun, AKUN, DOMAIN_EMAIL };
