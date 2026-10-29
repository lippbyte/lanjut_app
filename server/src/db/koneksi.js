// SATU-SATUNYA createPool di seluruh proyek (docs/SDD-Backend-Foundation.md §9.2).
// Modul lain WAJIB require('../../db/koneksi') ini, tidak pernah membuat pool sendiri.

const mysql = require('mysql2/promise');
const env = require('../config/env');

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
