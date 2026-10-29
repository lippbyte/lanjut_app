// Tanpa JUMLAH_PROXY (bawaan, 0): perilaku lama tidak berubah — header
// X-Forwarded-For diabaikan (bisa dipalsukan klien), semua permintaan dari
// koneksi yang sama berbagi satu kuota. Pasangan tests/proxy.test.js.
delete process.env.JUMLAH_PROXY;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');

let server;
let baseUrl;

async function sisa(ipPalsu) {
  const res = await fetch(`${baseUrl}/api/v1/sehat`, { headers: { 'X-Forwarded-For': ipPalsu } });
  assert.equal(res.status, 200);
  return Number(res.headers.get('ratelimit-remaining'));
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('tanpa JUMLAH_PROXY: X-Forwarded-For diabaikan, kuota tetap satu', async () => {
  const a = await sisa('203.0.113.10');
  const b = await sisa('203.0.113.20');
  assert.equal(b, a - 1, 'IP palsu di header tidak boleh memberi kuota baru');
});
