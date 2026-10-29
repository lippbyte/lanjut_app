// Membaca dan MEMVALIDASI variabel lingkungan. Gagal cepat (melempar dan
// menghentikan proses) bila ada variabel wajib yang kosong — lebih baik
// server menolak menyala daripada menyala lalu gagal di permintaan pertama.
// Lihat docs/SDD-Backend-Foundation.md §2.1 baris "Konfigurasi".

require('dotenv').config();

function wajib(nama) {
  const nilai = process.env[nama];
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') {
    throw new Error(
      `Variabel lingkungan wajib "${nama}" kosong. Salin server/.env.example ` +
        'menjadi server/.env dan isi nilainya sebelum menyalakan server.'
    );
  }
  return String(nilai).trim();
}

function opsional(nama, bawaan) {
  const nilai = process.env[nama];
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') {
    return bawaan;
  }
  return String(nilai).trim();
}

function angka(nama, bawaan) {
  const mentah = opsional(nama, null);
  if (mentah === null) return bawaan;
  const n = Number(mentah);
  if (!Number.isFinite(n)) {
    throw new Error(`Variabel lingkungan "${nama}" harus berupa angka, dapat: "${mentah}".`);
  }
  return n;
}

const NODE_ENV = opsional('NODE_ENV', 'development');

// CORS: dukung CORS_ORIGINS (nama standar LANJUT_061) atau ASAL_DIIZINKAN (nama awal).
const asalMentah = process.env.CORS_ORIGINS || process.env.ASAL_DIIZINKAN;
if (!asalMentah || String(asalMentah).trim() === '') {
  throw new Error(
    'Variabel lingkungan wajib "CORS_ORIGINS" (atau "ASAL_DIIZINKAN") kosong. Salin server/.env.example ' +
      'menjadi server/.env dan isi nilainya sebelum menyalakan server.'
  );
}
const corsOrigins = String(asalMentah)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS (atau ASAL_DIIZINKAN) tidak boleh kosong.');
}

if (corsOrigins.includes('*')) {
  throw new Error(
    'CORS_ORIGINS / ASAL_DIIZINKAN tidak boleh berisi "*" (docs/SDD-Backend-Foundation.md §8.5). ' +
      'Sebutkan asal secara eksplisit, dipisah koma.'
  );
}

// Pengerasan produksi (LANJUT_061): di produksi, asal CORS harus berupa https:// yang valid (atau localhost untuk uji)
if (NODE_ENV === 'production') {
  for (const origin of corsOrigins) {
    if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      throw new Error(
        `Di lingkungan produksi, setiap asal CORS harus berupa URL https:// yang valid (atau localhost untuk uji), dapat: "${origin}".`
      );
    }
  }
}

// TRUST_PROXY: dukung TRUST_PROXY (LANJUT_061) atau JUMLAH_PROXY (nama awal).
// Bisa berupa angka (jumlah lompatan proxy), boolean (true/false), atau string ('loopback', dsb.).
const proxyMentah = process.env.TRUST_PROXY ?? process.env.JUMLAH_PROXY;
let trustProxy = 0;
if (proxyMentah !== undefined && proxyMentah !== null && String(proxyMentah).trim() !== '') {
  const str = String(proxyMentah).trim();
  if (str.toLowerCase() === 'true') {
    trustProxy = true;
  } else if (str.toLowerCase() === 'false') {
    trustProxy = false;
  } else if (/^\d+$/.test(str)) {
    trustProxy = parseInt(str, 10);
  } else {
    trustProxy = str;
  }
}

// LANJUT_085: di produksi (Railway, atau VPS dengan nginx) server selalu di belakang proxy.
// TRUST_PROXY wajib ditentukan eksplisit (0 boleh, bila memang tanpa proxy), supaya batas laju
// per IP tidak diam-diam menjadi satu kuota bersama atas nama IP proxy. `true` memercayai semua
// lompatan sehingga X-Forwarded-For bisa dipalsukan klien; di produksi harus berupa angka.
if (NODE_ENV === 'production') {
  if (proxyMentah === undefined || proxyMentah === null || String(proxyMentah).trim() === '') {
    throw new Error(
      'Di lingkungan produksi, TRUST_PROXY (atau JUMLAH_PROXY) wajib diisi: jumlah proxy tepercaya ' +
        'di depan server (lihat server/.env.railway.contoh), atau 0 bila tanpa proxy.'
    );
  }
  if (trustProxy === true) {
    throw new Error('Di lingkungan produksi, TRUST_PROXY tidak boleh "true"; isi jumlah proxy tepercaya (angka).');
  }
}

// LANJUT_085: header berisi IP klien asli yang DITULIS proxy tepercaya (Railway mendokumentasikan
// X-Real-IP). Bila diisi, batas laju memakai header ini (src/util/ipKlien.js); kosong = req.ip.
// Hanya isi bila proxy di depan server memang menulis header itu: tanpanya klien bisa memalsukan.
const headerIpKlien = opsional('HEADER_IP_KLIEN', null);
if (headerIpKlien !== null && !/^[A-Za-z0-9-]+$/.test(headerIpKlien)) {
  throw new Error(`HEADER_IP_KLIEN harus nama header HTTP (huruf, angka, tanda minus), dapat: "${headerIpKlien}".`);
}

const env = {
  NODE_ENV,
  PORT: angka('PORT', 3000),
  DB_HOST: wajib('DB_HOST'),
  DB_PORT: angka('DB_PORT', 3306),
  DB_USER: wajib('DB_USER'),
  // Kata sandi basis data BOLEH kosong hanya di lingkungan lokal tanpa sandi
  // root — tetap wajib didefinisikan (walau string kosong) agar tidak
  // tersandung `undefined`.
  DB_PASSWORD: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  DB_NAME: wajib('DB_NAME'),
  CORS_ORIGINS: corsOrigins,
  ASAL_DIIZINKAN: corsOrigins, // alias kompatibilitas
  SESI_UMUR_HARI: angka('SESI_UMUR_HARI', 90),
  TRUST_PROXY: trustProxy,
  JUMLAH_PROXY: typeof trustProxy === 'number' ? trustProxy : (trustProxy ? 1 : 0), // alias kompatibilitas
  HEADER_IP_KLIEN: headerIpKlien ? headerIpKlien.toLowerCase() : null,
  // Folder berisi *.json konten untuk `npm run benih` (LANJUT_023). Kosong =
  // bawaan ../../MVP-PWA/data dari folder server/. Absolut, atau relatif
  // terhadap folder server/. Hanya dipakai benih, bukan oleh API.
  LOKASI_DATA_KONTEN: opsional('LOKASI_DATA_KONTEN', null),
  // Ngobrol Bareng LANJUT (LANJUT_051): AI lewat OpenRouter. Kunci KOSONG =
  // fitur AI mati (503 AI_TIDAK_TERSEDIA), server tetap menyala. Kunci hanya
  // ada di server: tidak pernah dikirim ke app dan tidak dicatat di log.
  // Model & pengaturan penyedia ada di tabel konfigurasi (ai_*, LANJUT_053).
  OPENROUTER_API_KEY: opsional('OPENROUTER_API_KEY', null),
  // Hanya diganti untuk uji (server tiruan di localhost).
  OPENROUTER_BASE_URL: opsional('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  // Masuk dengan kode email (LANJUT_083). SMTP_HOST atau SMTP_FROM kosong = fitur
  // mati (503 OTP_TIDAK_TERSEDIA), server tetap menyala. Sandi SMTP tidak pernah
  // dicatat di log. SMTP_SECURE=true untuk TLS langsung (port 465); selain itu
  // STARTTLS wajib, kecuali ke server tiruan di localhost.
  SMTP_HOST: opsional('SMTP_HOST', null),
  SMTP_PORT: angka('SMTP_PORT', 587),
  SMTP_SECURE: ['1', 'true'].includes(String(opsional('SMTP_SECURE', '')).toLowerCase()),
  SMTP_USER: opsional('SMTP_USER', null),
  SMTP_PASSWORD: opsional('SMTP_PASSWORD', null),
  SMTP_FROM: opsional('SMTP_FROM', null),
  // Masuk dengan Google (LANJUT_083). Client ID OAuth (publik), boleh beberapa
  // dipisah koma (mis. klien web dan Android). Kosong = 503 GOOGLE_TIDAK_TERSEDIA.
  GOOGLE_CLIENT_ID: opsional('GOOGLE_CLIENT_ID', null),
};

// Kunci API tidak boleh terkirim lewat HTTP polos, kecuali ke server tiruan lokal.
if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(env.OPENROUTER_BASE_URL)) {
  throw new Error(`OPENROUTER_BASE_URL harus https:// (atau http://localhost untuk uji), dapat: "${env.OPENROUTER_BASE_URL}".`);
}

module.exports = env;
