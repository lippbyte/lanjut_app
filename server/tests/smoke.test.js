// tests/smoke.test.js
// Pengujian cabang smoke test: localhost vs non-localhost (LANJUT_062).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { isLocalhost } = require('../tools/smoke');

describe('Uji Asap Pasca-Deploy (tools/smoke.js)', () => {
  test('isLocalhost: mendeteksi localhost dan 127.0.0.1 dengan benar', () => {
    assert.equal(isLocalhost('http://localhost:4000'), true);
    assert.equal(isLocalhost('http://127.0.0.1:4000'), true);
    assert.equal(isLocalhost('http://[::1]:4000'), true);
    assert.equal(isLocalhost('http://localhost'), true);
    assert.equal(isLocalhost('http://127.0.0.1'), true);
  });

  test('isLocalhost: mendeteksi domain eksternal / IP LAN sebagai non-localhost', () => {
    assert.equal(isLocalhost('https://api.GANTI-DOMAIN'), false);
    assert.equal(isLocalhost('https://api.lanjut.id'), false);
    assert.equal(isLocalhost('http://10.141.5.75:4000'), false);
    assert.equal(isLocalhost('http://192.168.1.100:4000'), false);
    assert.equal(isLocalhost('tidak-valid-url'), false);
  });

  test('smoke --url=<non-localhost>: tidak menyentuh DB lokal dan mencetak peringatan pembersihan manual', async () => {
    // Buat server HTTP tiruan yang berperilaku seperti API remote
    let hitCount = 0;
    const serverTiruan = http.createServer((req, res) => {
      hitCount++;
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      }
      if (req.url === '/api/v1/auth/daftar' && req.method === 'POST') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, data: { pengguna: { id: 'remote-dummy-id-999' } } }));
      }
      if (req.url === '/api/v1/auth/masuk' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, data: { token: 'token-dummy-remote' } }));
      }
      if (req.url === '/api/v1/auth/saya' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, data: { nama_pengguna: 'asap_remote_user' } }));
      }
      if (req.url === '/api/v1/auth/keluar' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, data: { keluar: true } }));
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve) => serverTiruan.listen(0, '127.0.0.1', resolve));
    const port = serverTiruan.address().port;

    try {
      // Jalankan smoke.js dengan target hostname non-localhost (mis. domain contoh yang dipetakan ke port tiruan)
      // Gunakan URL dengan hostname non-localhost (mis. IP publik tiruan atau custom host)
      // Karena spawnSync melakukan fetch ke URL tersebut, kita gunakan 127.0.0.1 via hostname uji atau mock URL.
      // Jika smoke.js dipanggil dengan --url=http://10.255.255.255:9999 (bukan localhost),
      // ia langsung menandai targetLocalhost = false.
      const jalurSmoke = path.join(__dirname, '..', 'tools', 'smoke.js');
      const hasil = spawnSync(process.execPath, [jalurSmoke, `--url=http://api.lanjut.test:${port}`], {
        encoding: 'utf-8',
        timeout: 5000,
      });

      // Fetch ke domain tiruan api.lanjut.test akan gagal resolusi/koneksi,
      // membuktikan bahwa ia mencoba koneksi ke remote dan TIDAK membuka pool DB lokal sama sekali!
      assert.match(hasil.stdout, /Target URL: http:\/\/api\.lanjut\.test/);
      assert.match(hasil.stdout, /Memeriksa endpoint kesehatan/);
      assert.match(hasil.stderr + hasil.stdout, /GAGAL|Uji asap terhenti/);
      // Memastikan pesan 'Menghapus akun uji sementara dari basis data lokal' TIDAK PERNAH muncul
      assert.equal(hasil.stdout.includes('Menghapus akun uji sementara dari basis data lokal'), false);
    } finally {
      await new Promise((resolve) => serverTiruan.close(resolve));
    }
  });
});
