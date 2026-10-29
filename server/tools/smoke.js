#!/usr/bin/env node
// tools/smoke.js
// Uji asap (smoke test) pasca-deploy (LANJUT_061).
// Memeriksa kesehatan API dan alur autentikasi dasar secara end-to-end tanpa memanggil AI.
// Penggunaan: node tools/smoke.js [--url=http://...]

function parseArgs() {
  const urlArg = process.argv.find((a) => a.startsWith('--url='));
  if (urlArg) {
    return urlArg.slice(6).trim().replace(/\/+$/, '');
  }
  // Bawaan hanya http://localhost:4000
  return 'http://localhost:4000';
}

function isLocalhost(urlStr) {
  try {
    const u = new URL(urlStr);
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '::1' ||
      u.hostname === '[::1]'
    );
  } catch (_e) {
    return false;
  }
}

const baseUrl = parseArgs();
const targetLocalhost = isLocalhost(baseUrl);

// Basis data lokal hanya dihubungkan jika target adalah localhost (LANJUT_062).
let pool = null;
if (targetLocalhost) {
  pool = require('../src/db/koneksi');
}

async function main() {
  console.log(`=======================================================`);
  console.log(`LANJUT API — Uji Asap Pasca-Deploy (Smoke Test)`);
  console.log(`Target URL: ${baseUrl}`);
  console.log(`=======================================================\n`);

  let userId = null;
  let authToken = null;
  const username = `asap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const password = `sandiAsap99!`;

  try {
    // ------------------------------------------------------------------
    // Langkah 1: Pemeriksaan endpoint /health
    // ------------------------------------------------------------------
    process.stdout.write('[1/6] Memeriksa endpoint kesehatan (GET /health)... ');
    const resHealth = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!resHealth.ok) {
      throw new Error(`HTTP status ${resHealth.status} (diharapkan 200)`);
    }
    const jsonHealth = await resHealth.json();
    if (jsonHealth.ok !== true) {
      throw new Error(`Respons tidak valid: ${JSON.stringify(jsonHealth)}`);
    }
    console.log('LULUS (ok: true)');

    // ------------------------------------------------------------------
    // Langkah 2: Pendaftaran akun uji sementara
    // ------------------------------------------------------------------
    process.stdout.write(`[2/6] Mendaftarkan akun uji sementara (${username})... `);
    const resDaftar = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        nama_pengguna: username,
        kata_sandi: password,
        nama_tampilan: 'Akun Uji Asap',
      }),
    });

    if (resDaftar.status !== 201) {
      const errBody = await resDaftar.text();
      throw new Error(`HTTP status ${resDaftar.status} (diharapkan 201). Respons: ${errBody}`);
    }
    const jsonDaftar = await resDaftar.json();
    if (!jsonDaftar.ok || !jsonDaftar.data || !jsonDaftar.data.pengguna) {
      throw new Error(`Respons daftar tidak valid: ${JSON.stringify(jsonDaftar)}`);
    }
    userId = jsonDaftar.data.pengguna.id;
    console.log(`LULUS (id: ${userId})`);

    // ------------------------------------------------------------------
    // Langkah 3: Masuk (Login) dengan akun uji
    // ------------------------------------------------------------------
    process.stdout.write('[3/6] Masuk (POST /api/v1/auth/masuk)... ');
    const resMasuk = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        nama_pengguna: username,
        kata_sandi: password,
      }),
    });

    if (!resMasuk.ok) {
      const errBody = await resMasuk.text();
      throw new Error(`HTTP status ${resMasuk.status} (diharapkan 200). Respons: ${errBody}`);
    }
    const jsonMasuk = await resMasuk.json();
    if (!jsonMasuk.ok || !jsonMasuk.data || !jsonMasuk.data.token) {
      throw new Error(`Token tidak ditemukan dalam respons masuk: ${JSON.stringify(jsonMasuk)}`);
    }
    authToken = jsonMasuk.data.token;
    console.log('LULUS (token diterima)');

    // ------------------------------------------------------------------
    // Langkah 4: Membaca profil akun
    // ------------------------------------------------------------------
    process.stdout.write('[4/6] Membaca profil (GET /api/v1/auth/saya)... ');
    const resSaya = await fetch(`${baseUrl}/api/v1/auth/saya`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
    });

    if (!resSaya.ok) {
      const errBody = await resSaya.text();
      throw new Error(`HTTP status ${resSaya.status} (diharapkan 200). Respons: ${errBody}`);
    }
    const jsonSaya = await resSaya.json();
    if (!jsonSaya.ok || jsonSaya.data?.nama_pengguna !== username) {
      throw new Error(`Data profil tidak cocok: ${JSON.stringify(jsonSaya)}`);
    }
    console.log(`LULUS (pengguna: ${jsonSaya.data.nama_pengguna})`);

    // ------------------------------------------------------------------
    // Langkah 5: Keluar (Logout)
    // ------------------------------------------------------------------
    process.stdout.write('[5/6] Keluar (POST /api/v1/auth/keluar)... ');
    const resKeluar = await fetch(`${baseUrl}/api/v1/auth/keluar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
    });

    if (!resKeluar.ok) {
      const errBody = await resKeluar.text();
      throw new Error(`HTTP status ${resKeluar.status} (diharapkan 200). Respons: ${errBody}`);
    }
    console.log('LULUS (sesi ditutup)');

    // ------------------------------------------------------------------
    // Langkah 6: Pembersihan akun uji sementara
    // ------------------------------------------------------------------
    if (targetLocalhost) {
      process.stdout.write('[6/6] Menghapus akun uji sementara dari basis data lokal... ');
      if (userId && pool) {
        const [hasil] = await pool.execute('DELETE FROM pengguna WHERE id = ?', [userId]);
        if (hasil.affectedRows > 0) {
          console.log(`LULUS (terhapus: ${userId})`);
        } else {
          console.log(`PERINGATAN (baris tidak ditemukan di basis data lokal)`);
        }
      }
    } else {
      process.stdout.write('[6/6] Pembersihan akun uji... ');
      console.log('DILEWATI (Target bukan localhost)');
      console.log(`\n=======================================================`);
      console.log(`[PERINGATAN] Target uji adalah server jarak jauh (${baseUrl}).`);
      console.log(`Basis data lokal TIDAK disentuh.`);
      console.log(`Akun uji sementara tertinggal di basis data target:`);
      console.log(`  ID Pengguna:   ${userId}`);
      console.log(`  Nama Pengguna: ${username}`);
      console.log(`Petunjuk pembersihan manual di server target:`);
      console.log(`  DELETE FROM pengguna WHERE id = '${userId}';`);
      console.log(`=======================================================\n`);
    }

    console.log('\n-------------------------------------------------------');
    console.log('HASIL AKHIR: Semua langkah uji asap pasca-deploy LULUS.');
    console.log('-------------------------------------------------------\n');
    process.exit(0);
  } catch (err) {
    console.log('GAGAL');
    console.error(`\n[galat] Uji asap terhenti:`, err.message);

    // Upaya pembersihan jika akun sempat dibuat pada localhost
    if (userId && targetLocalhost && pool) {
      try {
        await pool.execute('DELETE FROM pengguna WHERE id = ?', [userId]);
        console.log(`[pembersihan] Akun sementara ${userId} telah dibersihkan.`);
      } catch (_cErr) {
        // Abaikan galat pembersihan
      }
    }

    console.log('\n-------------------------------------------------------');
    console.log('HASIL AKHIR: Uji asap pasca-deploy GAGAL.');
    console.log('-------------------------------------------------------\n');
    process.exit(1);
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (_pErr) {
        // Abaikan
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { isLocalhost, parseArgs };
