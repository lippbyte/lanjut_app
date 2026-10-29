// Bantuan bersama untuk tests/*.test.js. Uji ini adalah uji INTEGRASI —
// butuh MySQL nyata (bukan mock) sesuai server/.env, dengan migrasi §3.6
// sudah dijalankan. Lihat server/README.md bagian "Menjalankan test".

const app = require('../src/app');
const pool = require('../src/db/koneksi');
const pengirimOtp = require('../src/modul/auth/pengirimOtp');

// LANJUT_083/083c: SEMUA tes yang memakai bantuan ini memakai pengirim email TIRUAN. Kode yang
// "terkirim" hanya dicatat di larik ini — tidak ada email sungguhan dari tes, walau SMTP diisi.
const suratTiruan = [];
pengirimOtp.siap = () => true;
pengirimOtp.kirim = async (email, kode, tujuan = 'masuk') => {
  suratTiruan.push({ email: String(email).toLowerCase(), kode, tujuan });
};

/** Kode terakhir yang "terkirim" ke email ini untuk tujuan itu; null bila tidak ada (setelah ±1 detik). */
async function kodeTerakhir(email, tujuan = 'masuk') {
  const alamat = String(email).trim().toLowerCase();
  for (let i = 0; i < 50; i += 1) {
    const ada = suratTiruan.filter((s) => s.email === alamat && s.tujuan === tujuan);
    if (ada.length > 0) return ada[ada.length - 1].kode;
    await new Promise((r) => setTimeout(r, 20));
  }
  return null;
}

async function kirimJson(baseUrl, jalur, body, token) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

function acak() {
  return Math.random().toString(36).slice(2, 10);
}

async function nyalakanServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function urlDari(server) {
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

async function daftarPenggunaBaru(baseUrl, override) {
  const namaPengguna = `uji_${acak()}`;
  const body = Object.assign(
    { nama_pengguna: namaPengguna, kata_sandi: 'sandiujiaman1' },
    override || {}
  );
  // LANJUT_083c: akun dengan email hanya dibuat lewat kode email (kirim-kode → verifikasi),
  // memakai pengirim tiruan di atas. Bentuk hasilnya sama dengan daftar langsung (201 + sesi).
  if (body.email) {
    const kirim = await kirimJson(baseUrl, '/auth/daftar/kirim-kode', body);
    if (kirim.status !== 200) return { status: kirim.status, json: kirim.json, namaPengguna, kataSandi: body.kata_sandi };
    const kode = await kodeTerakhir(body.email, 'daftar');
    const { status, json } = await kirimJson(baseUrl, '/auth/daftar/verifikasi', { email: body.email, kode });
    return { status, json, namaPengguna, kataSandi: body.kata_sandi };
  }
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json, namaPengguna, kataSandi: body.kata_sandi };
}

/**
 * Kunci lintas proses (MySQL GET_LOCK) untuk berkas tes yang MENGUBAH atau
 * BERGANTUNG pada konfigurasi global: persetujuan_*, ngobrol_*, ai_*
 * (LANJUT_054) dan modul_* (LANJUT_055: tes AI ikut mengunggah modul).
 * `node --test` menjalankan berkas secara paralel, jadi
 * tanpa kunci ini, mis. persetujuan.test.js yang sementara menaikkan versi
 * kebijakan bisa membuat tes Ngobrol di proses lain gagal acak.
 * Pakai di before() dan lepaskan di after(). Mengembalikan fungsi pelepas.
 */
async function kunciKonfigurasiGlobal() {
  const koneksi = await pool.getConnection();
  const [[{ dapat }]] = await koneksi.query("SELECT GET_LOCK('lanjut_tes_konfigurasi_ai', 600) AS dapat");
  if (dapat !== 1) {
    koneksi.release();
    throw new Error('Tidak mendapat kunci konfigurasi tes dalam 10 menit.');
  }
  return async () => {
    await koneksi.query("SELECT RELEASE_LOCK('lanjut_tes_konfigurasi_ai')");
    koneksi.release();
  };
}

module.exports = {
  acak,
  nyalakanServer,
  urlDari,
  daftarPenggunaBaru,
  kunciKonfigurasiGlobal,
  pool,
  suratTiruan,
  kodeTerakhir,
  kirimJson,
};
