// tests/layani-web.test.js
// Pengujian unit dan integrasi server statis layani-web.js (LANJUT_063)

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  buatServerStatis,
  parseArgs,
  getLanIp,
  MIME_TYPES,
  DIST_DIR,
} = require('../tools/layani-web');

describe('Server Statis Web & PWA (tools/layani-web.js)', () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    serverInstance = buatServerStatis(DIST_DIR);
    await new Promise((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const { port } = serverInstance.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('parseArgs: mendeteksi mode localhost vs --lan dan parsing port', () => {
    assert.deepEqual(parseArgs(['node', 'layani-web.js']), {
      isLan: false,
      port: 5500,
    });
    assert.deepEqual(parseArgs(['node', 'layani-web.js', '--lan']), {
      isLan: true,
      port: 5500,
    });
    assert.deepEqual(parseArgs(['node', 'layani-web.js', '--lan', '--port=8080']), {
      isLan: true,
      port: 8080,
    });
  });

  test('getLanIp: mengembalikan alamat IPv4 yang valid', () => {
    const ip = getLanIp();
    assert.match(ip, /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  test('MIME_TYPES: memuat pemetaan berkas PWA yang benar', () => {
    assert.equal(MIME_TYPES['.webmanifest'], 'application/manifest+json; charset=utf-8');
    assert.equal(MIME_TYPES['.json'], 'application/json; charset=utf-8');
    assert.equal(MIME_TYPES['.png'], 'image/png');
  });

  test('GET /manifest.webmanifest: mengembalikan JSON valid dan header MIME manifest', async () => {
    const res = await fetch(`${baseUrl}/manifest.webmanifest`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('application/manifest+json'));

    const data = await res.json();
    assert.equal(data.name, 'LANJUT');
    assert.equal(data.short_name, 'LANJUT');
    assert.equal(data.display, 'standalone');
    assert.equal(data.start_url, '/');
    assert.equal(data.scope, '/');
    assert.equal(data.lang, 'id');
    assert.equal(data.theme_color, '#456A8C');
    assert.equal(data.background_color, '#FFFFFF');
    assert.ok(Array.isArray(data.icons));
    assert.ok(data.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'));
    assert.ok(data.icons.some((i) => i.sizes === '192x192' && i.purpose === 'maskable'));
    assert.ok(data.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
    assert.ok(data.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  });

  test('GET aset ikon PWA: 192, 512, maskable, dan apple-touch-icon berstatus 200 image/png', async () => {
    const icons = [
      '/icon-192.png',
      '/icon-192-maskable.png',
      '/icon-512.png',
      '/icon-512-maskable.png',
      '/apple-touch-icon.png',
    ];
    for (const iconPath of icons) {
      const res = await fetch(`${baseUrl}${iconPath}`);
      assert.equal(res.status, 200, `Ikon ${iconPath} harus ada`);
      assert.equal(res.headers.get('content-type'), 'image/png');
      const buf = await res.arrayBuffer();
      assert.ok(buf.byteLength > 1000, `Ukuran ${iconPath} harus valid (> 1KB)`);
    }
  });

  test('GET /index.html: memuat tautan manifest, apple-touch-icon, dan meta PWA', async () => {
    const res = await fetch(`${baseUrl}/index.html`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));

    const html = await res.text();
    assert.ok(html.includes('href="/manifest.webmanifest"'));
    assert.ok(html.includes('name="theme-color"'));
    assert.ok(html.includes('name="apple-mobile-web-app-capable"'));
    assert.ok(html.includes('href="/apple-touch-icon.png"'));
  });

  test('SPA Fallback: rute dalam yang tidak ada berkas fisiknya mengembalikan index.html', async () => {
    const res = await fetch(`${baseUrl}/rute-dalam-yang-tidak-ada-fisik`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));

    const html = await res.text();
    assert.ok(html.includes('href="/manifest.webmanifest"'));
    assert.ok(html.includes('id="root"'));
  });
});
