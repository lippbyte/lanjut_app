// Cabut sesi akun bertenggat (LANJUT_086, keputusan PM 26 Okt 2026).
//
// Mengambil akun yang tenggat verifikasinya (batas_verifikasi, LANJUT_084) SUDAH lewat DAN
// emailnya belum terverifikasi, lalu mencabut semua sesinya. Mencabut = mengisi
// sesi_pengguna.dicabut_pada, mekanisme yang sama dengan "keluar dari semua perangkat" dan
// ambil alih LANJUT_083d: sesi itu langsung tidak berlaku. Kolom akun (email, kata sandi,
// tenggat, status) tidak diubah, akun tidak dihapus, dan tidak ada email yang dikirim.
//
// Bawaan: --simulasi (hanya menghitung, tidak mengubah apa pun). Mencabut sungguhan HANYA
// dengan --jalankan. Keluaran hanya jumlah akun dan sesi, tanpa ID akun.
//
// Pemakaian (folder LANJUT_App/server; basis data dari .env atau variabel DB_*):
//   npm run cabut-sesi-tenggat                  → simulasi
//   npm run cabut-sesi-tenggat -- --jalankan    → cabut sungguhan

const penggunaRepo = require('../src/modul/pengguna/pengguna.repo');
const sesiRepo = require('../src/modul/auth/sesi.repo');

const keDb = (tanggal) => tanggal.toISOString().slice(0, 19).replace('T', ' ');

function bacaArgumen(argv) {
  for (const a of argv) {
    if (a !== '--simulasi' && a !== '--jalankan') throw new Error(`argumen tidak dikenal: ${a}`);
  }
  if (argv.includes('--simulasi') && argv.includes('--jalankan')) {
    throw new Error('pilih salah satu: --simulasi atau --jalankan');
  }
  return { jalankan: argv.includes('--jalankan') };
}

/**
 * Hitung (simulasi) atau cabut (jalankan) sesi akun lewat tenggat pada `sekarang`.
 * Mengembalikan { mode, akun, sesi }: jumlah akun dan jumlah sesi yang (akan) dicabut.
 */
async function cabutSesiTenggat({ jalankan = false, sekarang = new Date() } = {}) {
  const akun = await penggunaRepo.cariAkunLewatTenggat(keDb(sekarang));
  let sesi = 0;
  for (const id of akun) {
    sesi += jalankan ? await sesiRepo.cabutSemuaSesiPengguna(id) : await sesiRepo.hitungSesiBelumDicabut(id);
  }
  return { mode: jalankan ? 'jalankan' : 'simulasi', akun: akun.length, sesi };
}

async function utama(argv) {
  const env = require('../src/config/env');
  const opsi = bacaArgumen(argv);
  const h = await cabutSesiTenggat(opsi);
  console.log(`[cabut-sesi-tenggat] basis data: ${env.DB_NAME} · mode: ${h.mode}`);
  console.log(`[cabut-sesi-tenggat] akun lewat tenggat dengan email belum terverifikasi: ${h.akun}`);
  if (h.mode === 'jalankan') {
    console.log(`[cabut-sesi-tenggat] sesi dicabut: ${h.sesi}`);
  } else {
    console.log(`[cabut-sesi-tenggat] sesi yang akan dicabut: ${h.sesi} (simulasi: tidak ada yang diubah; cabut sungguhan dengan --jalankan)`);
  }
}

if (require.main === module) {
  const pool = require('../src/db/koneksi');
  utama(process.argv.slice(2))
    .catch((galat) => {
      console.error(`[cabut-sesi-tenggat] GAGAL: ${galat.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { cabutSesiTenggat, bacaArgumen };
