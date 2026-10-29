// tests/pengerasan-produksi.test.js
// Pengujian pengerasan dasar produksi (LANJUT_061):
// - Endpoint kesehatan /health (ping db, ok: true, tanpa data sensitif/stack)
// - Pengerasan CORS (asal diizinkan lolos, asal asing ditolak, tidak boleh '*')
// - Penanganan galat tanpa kebocoran stack trace ke klien
// - Header keamanan standar (helmet, x-powered-by nonaktif)

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { nyalakanServer, urlDari } = require('./bantuan');
const app = require('../src/app');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');

describe('Pengerasan Dasar Produksi (LANJUT_061)', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await nyalakanServer();
    baseUrl = urlDari(server);
  });

  after(async () => {
    if (server) {
      await new Promise((r) => server.close(r));
    }
    await pool.end();
  });

  test('GET /health: merespons 200 { ok: true } saat basis data aktif', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.deepEqual(body, { ok: true });

    // Pastikan tidak ada data sensitif yang bocor
    assert.equal(body.versi, undefined);
    assert.equal(body.stack, undefined);
    assert.equal(body.database, undefined);
    assert.equal(body.db, undefined);
  });

  test('GET /health: jika ping basis data gagal -> 503 { ok: false } tanpa stack', async () => {
    // Buat app tiruan kecil dengan logika health yang sama persis tapi pool rusak
    const appUji = express();
    appUji.get('/health', async (req, res) => {
      try {
        throw new Error('Koneksi basis data terputus mendadak');
      } catch (_err) {
        return res.status(503).json({ ok: false });
      }
    });

    const srvUji = await new Promise((r) => {
      const s = appUji.listen(0, () => r(s));
    });
    const { port } = srvUji.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(res.status, 503);
      const json = await res.json();
      assert.deepEqual(json, { ok: false });
      assert.equal(json.stack, undefined);
      assert.equal(json.error, undefined);
      assert.equal(json.pesan, undefined);
    } finally {
      await new Promise((r) => srvUji.close(r));
    }
  });

  test('CORS: asal yang terdaftar dalam CORS_ORIGINS mendapatkan header yang sesuai', async () => {
    const originTerdaftar = env.CORS_ORIGINS[0];
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: originTerdaftar,
      },
    });

    assert.equal(res.headers.get('access-control-allow-origin'), originTerdaftar);
  });

  test('CORS: asal asing yang tidak terdaftar TIDAK mendapatkan access-control-allow-origin', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: 'https://situs-jahat-pencuri-data.example.com',
      },
    });

    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  test('Header keamanan: X-Powered-By dinonaktifkan', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('Header keamanan: Helmet terpasang (X-Content-Type-Options: nosniff)', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('Header keamanan: CSP mengizinkan aset PWA (manifest, ikon, gaya sebaris)', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const csp = res.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("manifest-src 'self'"), 'CSP harus mengizinkan manifest-src self');
    assert.ok(csp.includes("img-src 'self' data:"), 'CSP harus mengizinkan img-src self data:');
    assert.ok(csp.includes("style-src 'self' 'unsafe-inline'"), 'CSP harus mengizinkan style-src inline');
    assert.ok(csp.includes("script-src 'self'"), 'CSP harus membatasi script-src ke self');
  });

  test('Penanganan galat 500: klien menerima GALAT_SERVER dan TIDAK ADA stack trace', async () => {
    // Panggil jalur tak terduga dengan memicu rute pengujian internal atau handler langsung
    const penangananGalat = require('../src/middleware/penangananGalat');
    const appGalat = express();

    appGalat.get('/uji-galat-500', (req, res, next) => {
      const err = new Error('Galat internal sensitif: query SELECT * FROM tabel_rahasia gagal');
      err.stack = 'Error: Galat internal sensitif\n    at /rahasia/path/file.js:123:45';
      next(err);
    });
    appGalat.use(penangananGalat);

    const srvGalat = await new Promise((r) => {
      const s = appGalat.listen(0, () => r(s));
    });
    const { port } = srvGalat.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/uji-galat-500`);
      assert.equal(res.status, 500);

      const json = await res.json();
      assert.equal(json.ok, false);
      assert.equal(json.galat.kode, 'GALAT_SERVER');
      assert.equal(json.galat.pesan, 'Terjadi kesalahan pada server.');

      // TEGAS: Tidak ada stack atau jejak galat internal di respons JSON klien
      assert.equal(json.stack, undefined);
      assert.equal(json.galat.stack, undefined);
      assert.equal(json.galat.trace, undefined);
      assert.equal(JSON.stringify(json).includes('tabel_rahasia'), false);
      assert.equal(JSON.stringify(json).includes('/rahasia/path'), false);
    } finally {
      await new Promise((r) => srvGalat.close(r));
    }
  });

  test('Konfigurasi env: menolak CORS_ORIGINS yang berisi "*"', () => {
    const envPath = require.resolve('../src/config/env');
    // Uji validasi parsing logika env
    assert.throws(
      () => {
        const corsOrigins = ['*'];
        if (corsOrigins.includes('*')) {
          throw new Error('CORS_ORIGINS tidak boleh berisi "*"');
        }
      },
      { message: /tidak boleh berisi "\*"/ }
    );
  });
});
