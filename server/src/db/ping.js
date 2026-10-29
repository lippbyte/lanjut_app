// src/db/ping.js
// Pemeriksaan konektivitas ringan basis data (ping) untuk endpoint kesehatan /health.

const pool = require('./koneksi');

async function pingBasisData() {
  await pool.query('SELECT 1');
}

module.exports = { pingBasisData };
