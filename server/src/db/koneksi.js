// SATU-SATUNYA createPool di seluruh proyek (docs/SDD-Backend-Foundation.md §9.2).
// Modul lain WAJIB require('../../db/koneksi') ini, tidak pernah membuat pool sendiri.

const mysql = require('mysql2/promise');
const env = require('../config/env');

// LANJUT_022 seri v2: di bawah node --test, hanya basis data tes yang boleh disentuh.
if (process.env.NODE_TEST_CONTEXT && !env.DB_NAME.startsWith('lanjut_test')) {
  throw new Error(`Tes hanya boleh memakai basis data yang diawali lanjut_test, dapat "${env.DB_NAME}".`);
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z', // server selalu berbicara UTC (§4.1)
});

module.exports = pool;
