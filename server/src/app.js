// Merakit Express: helmet, cors, rate limit, rute, galat.
// docs/SDD-Backend-Foundation.md §9.2.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const { pingBasisData } = require('./db/ping');
const autentikasi = require('./middleware/autentikasi');
const { batasGlobal } = require('./middleware/batasLaju');
const penangananGalat = require('./middleware/penangananGalat');
const { sukses } = require('./util/respons');

const authRute = require('./modul/auth/auth.rute');
const penggunaRute = require('./modul/pengguna/pengguna.rute');
const eventSekolahRute = require('./modul/event-sekolah/event-sekolah.rute');
const kontenRute = require('./modul/konten/konten.rute');
const kemajuanRute = require('./modul/kemajuan/kemajuan.rute');
const butirPribadiRute = require('./modul/butir-pribadi/butir-pribadi.rute');
const kartuRute = require('./modul/kartu/kartu.rute');
const levelinRute = require('./modul/levelin/levelin.rute');
const sinkronRute = require('./modul/sinkron/sinkron.rute');
const persetujuanRute = require('./modul/persetujuan/persetujuan.rute');
const modulRute = require('./modul/modul/modul.rute');
const ngobrolRute = require('./modul/ngobrol/ngobrol.rute');

const app = express();

app.disable('x-powered-by');
// Di belakang reverse proxy, req.ip diambil sesuai TRUST_PROXY (lihat config/env.js).
// 0 / false = perilaku bawaan Express (hanya soket langsung).
if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== false && env.TRUST_PROXY !== 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // melarang skrip sebaris (§5.3), bundel web dari 'self'
        styleSrc: ["'self'", "'unsafe-inline'"], // React Native Web membutuhkan gaya sebaris untuk reset & stylesheet runtime
        fontSrc: ["'self'", 'data:'], // berkas font Poppins yang dibundel
        imgSrc: ["'self'", 'data:'], // gambar aset dan maskot
        manifestSrc: ["'self'"], // berkas web app manifest PWA
        connectSrc: ["'self'", ...(Array.isArray(env.CORS_ORIGINS) ? env.CORS_ORIGINS : [])], // sambungan ke API
      },
    },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Endpoint kesehatan (LANJUT_061):
// GET /health: balas { ok: true } dan ping basis data ringan (SELECT 1).
// Tanpa data sensitif, tanpa versi paket, tanpa stack.
app.get('/health', async (req, res) => {
  try {
    await pingBasisData();
    return res.status(200).json({ ok: true });
  } catch (_err) {
    // Tanpa data sensitif, tanpa versi paket, tanpa stack
    return res.status(503).json({ ok: false });
  }
});

// Log akses minimal: metode, jalur, status, durasi — TANPA badan permintaan
// (§8.5 — rahasia tidak pernah masuk log).
app.use((req, res, next) => {
  const mulai = Date.now();
  res.on('finish', () => {
    const durasi = Date.now() - mulai;
    const penggunaId = req.pengguna ? req.pengguna.id : '-';
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durasi}ms pengguna=${penggunaId}`);
  });
  next();
});

app.use(batasGlobal);
app.use(autentikasi);

// Kompatibilitas endpoint lama
app.get('/api/v1/sehat', (req, res) => {
  sukses(res, { status: 'ok', waktu: new Date().toISOString() });
});
app.get('/api/v1/health', async (req, res) => {
  try {
    await pingBasisData();
    return res.status(200).json({ ok: true });
  } catch (_err) {
    return res.status(503).json({ ok: false });
  }
});

app.use('/api/v1/auth', authRute);
app.use('/api/v1/pengguna/event', eventSekolahRute); // LANJUT_076 — di balik saklar event_sekolah_aktif
app.use('/api/v1/pengguna', penggunaRute);
app.use('/api/v1/konten', kontenRute);
app.use('/api/v1/kemajuan', kemajuanRute);
app.use('/api/v1/butir-pribadi', butirPribadiRute);
app.use('/api/v1/kartu', kartuRute);
app.use('/api/v1', levelinRute); // sesi-latihan, riwayat-latihan, kalibrasi, saran-harian, konfigurasi
app.use('/api/v1/sinkron', sinkronRute);
app.use('/api/v1/persetujuan', persetujuanRute); // LANJUT_047
app.use('/api/v1/modul', modulRute); // LANJUT_049
app.use('/api/v1/ngobrol', ngobrolRute); // LANJUT_051 — AI lewat OpenRouter, di balik gerbang persetujuan

app.use((req, res) => {
  const { galat } = require('./util/respons');
  galat(res, 'TIDAK_DITEMUKAN', 'Jalur tidak ditemukan.');
});

app.use(penangananGalat);

module.exports = app;
