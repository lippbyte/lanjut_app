// JUMLAH_PROXY=1 (LANJUT_022): di belakang satu reverse proxy, batas laju
// dihitung per IP pengguna asli (X-Forwarded-For), bukan satu kuota untuk
// semua orang. Diuji lewat header RateLimit-Remaining di /api/v1/sehat.
// env dibaca saat modul dimuat, jadi harus diset sebelum require.
process.env.JUMLAH_PROXY = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');

let server;
let baseUrl;

async function sisa(ipAsli) {
  const res = await fetch(`${baseUrl}/api/v1/sehat`, { headers: { 'X-Forwarded-For': ipAsli } });
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

test('JUMLAH_PROXY=1: tiap IP asli punya kuota sendiri', async () => {
  const a1 = await sisa('203.0.113.10');
  const a2 = await sisa('203.0.113.10');
  assert.equal(a2, a1 - 1, 'IP yang sama berbagi kuota');
  const b1 = await sisa('203.0.113.20');
  assert.equal(b1, a1, 'IP lain mulai dari kuota penuh, tidak ikut terpotong');
});
