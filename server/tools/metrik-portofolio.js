#!/usr/bin/env node
// tools/metrik-portofolio.js (LANJUT_010 seri v2). Baca saja. Jumlah siswa dengan minimal satu
// butir bermakna dalam jendela waktu, untuk dibandingkan dengan ambang pilot.
//
// Bermakna (docs/kontrak-data-v2.md): uraian minimal 30 karakter, atau ada foto, atau ada tautan.
//
//   npm run metrik-portofolio
//   npm run metrik-portofolio -- --hari=14 --kecualikan=<id,id> --daftar
//
// Keluaran hanya angka, dan ID akun bila diminta dengan --daftar. Tanpa nama atau email.

const pool = require('../src/db/koneksi');

function bacaOpsi(argumen) {
  const opsi = { hari: 14, kecualikan: new Set(), daftar: false };
  for (const a of argumen) {
    const hari = /^--hari=(\d+)$/.exec(a);
    const kecualikan = /^--kecualikan=(.*)$/.exec(a);
    if (hari && Number(hari[1]) > 0) opsi.hari = Number(hari[1]);
    else if (kecualikan) kecualikan[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => opsi.kecualikan.add(id));
    else if (a === '--daftar') opsi.daftar = true;
    else throw new Error(`Argumen "${a}" tidak dikenal. Pilihan: --hari=14, --kecualikan=id,id, --daftar`);
  }
  return opsi;
}

async function jalankan() {
  const opsi = bacaOpsi(process.argv.slice(2));
  const [baris] = await pool.query(
    `SELECT DISTINCT b.pengguna_id
       FROM butir_bukti AS b
      WHERE b.dibuat_pada >= UTC_TIMESTAMP() - INTERVAL ? DAY
        AND (CHAR_LENGTH(TRIM(COALESCE(b.uraian, ''))) >= 30
             OR CHAR_LENGTH(TRIM(COALESCE(b.tautan, ''))) > 0
             OR EXISTS (SELECT 1 FROM lampiran_butir_bukti AS l WHERE l.butir_bukti_id = b.id))`,
    [opsi.hari]
  );
  const id = baris.map((b) => b.pengguna_id).filter((x) => !opsi.kecualikan.has(x)).sort();

  console.log(`Jendela: ${opsi.hari} hari`);
  console.log(`Akun dikecualikan: ${opsi.kecualikan.size}`);
  console.log(`Siswa dengan butir bermakna: ${id.length}`);
  if (opsi.daftar) for (const x of id) console.log(`  ${x}`);
}

jalankan()
  .catch((galat) => {
    console.error(`[metrik-portofolio] GAGAL: ${galat.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
