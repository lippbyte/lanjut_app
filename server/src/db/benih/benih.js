// Benih: membaca MVP-PWA/data/*.json → INSERT ... ON DUPLICATE KEY UPDATE.
// docs/SDD-Backend-Foundation.md §3.6. Berkas JSON TIDAK disalin ke SQL —
// dibaca langsung dari sumbernya, dan itu tetap menjadi satu-satunya tempat
// konten diedit selama Panel Admin belum ada.
//
// Aturan yang mengikat (§3.6):
//   1. Metadata dibawa APA ADANYA — termasuk `status_verifikasi:
//      'belum_diverifikasi'` dan `diperiksa_pada: NULL`. Tidak "dirapikan".
//   2. Idempoten — bisa dijalankan berkali-kali dengan aman.
//   3. `status_verifikasi` & `diperiksa_pada` HANYA diisi saat baris baru
//      di-INSERT (LANJUT_011). Untuk baris yang sudah ada, keduanya sengaja
//      tidak ada di ON DUPLICATE KEY UPDATE: nilainya milik tim konten, yang
//      menandainya lewat `npm run verifikasi-konten`, dan benih ulang tidak
//      boleh menghapus kerja itu. Akibatnya, mengubah kedua nilai itu di JSON
//      tidak berpengaruh ke baris yang sudah ada — pakai skrip verifikasi.
//      Kartu (benihArsipKartu) tidak termasuk: bukan konten yang diverifikasi
//      lewat skrip itu.
//   4. ...KECUALI isinya berubah (LANJUT_020). Tanda verifikasi berlaku untuk
//      isi yang dicek, jadi bila ada SATU SAJA kolom non-verifikasi dari JSON
//      yang berbeda dengan baris di basis data, kedua kolom itu di-reset ke
//      'belum_diverifikasi' / NULL dan konten harus dicek & ditandai ulang.
//      Isi sama persis → tanda dibiarkan (aturan 3). Caranya: dua penugasan
//      verifikasi ditaruh PALING DEPAN di ON DUPLICATE KEY UPDATE — MySQL
//      menilai penugasan dari kiri ke kanan, jadi di sana kolom konten masih
//      bernilai LAMA dan bisa dibandingkan dengan VALUES() (`<=>` aman untuk
//      NULL). Semua kolom konten ikut dibandingkan, termasuk urutan/metadata:
//      reset yang tidak perlu hanya berarti cek ulang, sedangkan reset yang
//      terlewat berarti tanggal salah tampil sebagai "sudah dicek".
//
// CATATAN PEMETAAN NAMA MEDAN (bukan perubahan nilai):
// - `cerita-alumni.json` item punya field bernama `sumber` berisi "contoh" —
//   yang secara semantik cocok dengan kolom `asal` (nilai sejenis "mockup"/
//   "contoh"/"resmi" di berkas JSON lain), BUKAN dengan kolom `sumber` (kelas
//   kepercayaan resmi/pengguna/mitra, rancangan-arsip-latihan-banksoal.md §1).
//   Dua cerita di berkas itu ditulis TIM sebagai contoh, jadi kolom `sumber`
//   diisi 'resmi' (dikurasi tim) dan kolom `asal` diisi dari nilai item
//   tersebut ("contoh"). Nilai sebenarnya (izin_tayang, tayang, isi teks)
//   TIDAK diubah sama sekali.
// - `checklist.json` dikelompokkan lewat `kategori[]`; tabel `kategori_checklist`
//   (lihat catatan di migrasi 002) diisi dari situ.

const fs = require('fs');
const path = require('path');
const env = require('../../config/env');
const pool = require('../koneksi');
const { sekarangUntukDb } = require('../../util/waktu');
const { rataKonfig } = require('../../modul/levelin/konfigurasi');

// Folder server/ (tempat package.json & .env): server/src/db/benih → naik 3.
const DIR_SERVER = path.join(__dirname, '..', '..', '..');

// Lokasi *.json konten (LANJUT_023). Bawaan: ../../MVP-PWA/data dari folder
// server/, yaitu MVP-PWA/data di akar repo — persis lokasi sebelum env ini
// ada. Di hosting yang hanya menerima folder server/, salin folder data ke
// sana dan isi LOKASI_DATA_KONTEN (absolut, atau relatif terhadap server/ —
// sengaja bukan terhadap folder tempat perintah dijalankan, supaya hasilnya
// tidak bergantung dari mana `npm run benih` dipanggil).
const DIR_DATA = env.LOKASI_DATA_KONTEN
  ? path.resolve(DIR_SERVER, env.LOKASI_DATA_KONTEN)
  : path.join(DIR_SERVER, '..', '..', 'MVP-PWA', 'data');

const BERKAS_DATA = [
  'prodi.json',
  'mapel.json',
  'prodi-mapel.json',
  'linimasa.json',
  'khusus-smk.json',
  'cerita-alumni.json',
  'checklist.json',
  'arsip.json',
  'profil-prodi.json',
  'levelin-konfig.json',
];

function asalLokasi() {
  return env.LOKASI_DATA_KONTEN
    ? `dari env LOKASI_DATA_KONTEN="${env.LOKASI_DATA_KONTEN}"`
    : 'lokasi bawaan, LOKASI_DATA_KONTEN tidak diisi';
}

/**
 * Dipanggil sebelum menulis apa pun: folder harus ada dan lengkap. Tanpa
 * ini, folder yang salah baru ketahuan di tengah benih (setelah sebagian
 * tabel terisi) lewat galat "ENOENT" yang tidak menyebut env mana yang salah.
 */
function pastikanFolderData() {
  if (!fs.existsSync(DIR_DATA) || !fs.statSync(DIR_DATA).isDirectory()) {
    throw new Error(
      `Folder data konten tidak ditemukan: ${DIR_DATA} (${asalLokasi()}). ` +
        'Periksa env LOKASI_DATA_KONTEN — isi dengan folder yang berisi prodi.json, ' +
        'linimasa.json, dst. (lihat README bagian Deployment). Tidak ada data yang ditulis.'
    );
  }
  const hilang = BERKAS_DATA.filter((f) => !fs.existsSync(path.join(DIR_DATA, f)));
  if (hilang.length) {
    throw new Error(
      `Folder data konten ${DIR_DATA} (${asalLokasi()}) tidak lengkap — tidak ada: ${hilang.join(', ')}. ` +
        'Periksa env LOKASI_DATA_KONTEN. Tidak ada data yang ditulis.'
    );
  }
}

function bacaJson(namaBerkas) {
  const berkas = path.join(DIR_DATA, namaBerkas);
  if (!fs.existsSync(berkas)) {
    throw new Error(`Berkas data konten tidak ditemukan: ${berkas} (${asalLokasi()}). Periksa env LOKASI_DATA_KONTEN.`);
  }
  return JSON.parse(fs.readFileSync(berkas, 'utf8'));
}

/** `berkas` bisa diganti (dipakai test dengan berkas fixture); bawaan linimasa.json. */
async function benihLinimasa(berkas = bacaJson('linimasa.json')) {
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO tahapan_linimasa
         (id, judul, tanggal_mulai, tanggal_selesai, jalur,
          sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(judul <=> VALUES(judul) AND tanggal_mulai <=> VALUES(tanggal_mulai) AND tanggal_selesai <=> VALUES(tanggal_selesai) AND
            jalur <=> VALUES(jalur) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(judul <=> VALUES(judul) AND tanggal_mulai <=> VALUES(tanggal_mulai) AND tanggal_selesai <=> VALUES(tanggal_selesai) AND
            jalur <=> VALUES(jalur) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         judul=VALUES(judul), tanggal_mulai=VALUES(tanggal_mulai),
         tanggal_selesai=VALUES(tanggal_selesai), jalur=VALUES(jalur),
         sumber=VALUES(sumber), pemilik=VALUES(pemilik),
         asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.judul,
        item.tanggal_mulai,
        item.tanggal_selesai || null,
        item.jalur,
        berkas.sumber,
        berkas.pemilik,
        berkas.status || 'belum_diverifikasi',
        item.asal || berkas.asal,
        item.url_sumber || berkas.url_sumber || null,
        item.diperiksa_pada || berkas.diperiksa_pada || null,
      ]
    );
  }
  console.log(`[benih] tahapan_linimasa: ${berkas.data.length} baris`);
}

async function benihKhususSmk() {
  const berkas = bacaJson('khusus-smk.json');
  let urutan = 0;
  for (const item of berkas.data) {
    urutan += 1;
    await pool.execute(
      `INSERT INTO butir_khusus_smk
         (id, judul, apa_yang_beda, apa_yang_bisa_dilakukan, urutan,
          sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(judul <=> VALUES(judul) AND apa_yang_beda <=> VALUES(apa_yang_beda) AND apa_yang_bisa_dilakukan <=> VALUES(apa_yang_bisa_dilakukan) AND
            urutan <=> VALUES(urutan) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(judul <=> VALUES(judul) AND apa_yang_beda <=> VALUES(apa_yang_beda) AND apa_yang_bisa_dilakukan <=> VALUES(apa_yang_bisa_dilakukan) AND
            urutan <=> VALUES(urutan) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         judul=VALUES(judul), apa_yang_beda=VALUES(apa_yang_beda),
         apa_yang_bisa_dilakukan=VALUES(apa_yang_bisa_dilakukan), urutan=VALUES(urutan),
         sumber=VALUES(sumber), pemilik=VALUES(pemilik),
         asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.judul,
        item.apa_yang_beda,
        item.apa_yang_bisa_dilakukan,
        urutan,
        berkas.sumber,
        berkas.pemilik,
        berkas.status || 'belum_diverifikasi',
        berkas.asal,
        item.url_sumber || null,
        item.diperiksa_pada || null,
      ]
    );
  }
  console.log(`[benih] butir_khusus_smk: ${berkas.data.length} baris`);
}

async function benihProdi() {
  const berkas = bacaJson('prodi.json');
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO prodi
         (id, nama, rumpun, sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(nama <=> VALUES(nama) AND rumpun <=> VALUES(rumpun) AND sumber <=> VALUES(sumber) AND
            pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(nama <=> VALUES(nama) AND rumpun <=> VALUES(rumpun) AND sumber <=> VALUES(sumber) AND
            pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         nama=VALUES(nama), rumpun=VALUES(rumpun), sumber=VALUES(sumber),
         pemilik=VALUES(pemilik), asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.nama,
        item.rumpun,
        berkas.sumber,
        berkas.pemilik,
        berkas.status || 'belum_diverifikasi',
        berkas.asal,
        berkas.url_sumber || null,
        berkas.diperiksa_pada || null,
      ]
    );
  }
  console.log(`[benih] prodi: ${berkas.data.length} baris`);
}

async function benihMapel() {
  const berkas = bacaJson('mapel.json');
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO mapel
         (id, nama, tersedia_di_smk, sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(nama <=> VALUES(nama) AND tersedia_di_smk <=> VALUES(tersedia_di_smk) AND sumber <=> VALUES(sumber) AND
            pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(nama <=> VALUES(nama) AND tersedia_di_smk <=> VALUES(tersedia_di_smk) AND sumber <=> VALUES(sumber) AND
            pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         nama=VALUES(nama), tersedia_di_smk=VALUES(tersedia_di_smk), sumber=VALUES(sumber),
         pemilik=VALUES(pemilik), asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.nama,
        item.tersedia_di_smk ? 1 : 0,
        berkas.sumber,
        berkas.pemilik,
        berkas.status || 'belum_diverifikasi',
        berkas.asal,
        berkas.url_sumber || null,
        berkas.diperiksa_pada || null,
      ]
    );
  }
  console.log(`[benih] mapel: ${berkas.data.length} baris`);
}

async function benihProdiMapel() {
  const berkas = bacaJson('prodi-mapel.json');
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO prodi_mapel (prodi_id, mapel_id, bobot)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE bobot=VALUES(bobot)`,
      [item.prodi_id, item.mapel_id, item.bobot]
    );
  }
  console.log(`[benih] prodi_mapel: ${berkas.data.length} baris`);
}

async function benihCeritaAlumni() {
  const berkas = bacaJson('cerita-alumni.json');
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO cerita_alumni
         (id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,
          izin_tayang, tayang, sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(nama <=> VALUES(nama) AND asal_smk <=> VALUES(asal_smk) AND jurusan_smk <=> VALUES(jurusan_smk) AND
            ptn <=> VALUES(ptn) AND prodi <=> VALUES(prodi) AND jalur <=> VALUES(jalur) AND
            hambatan <=> VALUES(hambatan) AND yang_dilakukan <=> VALUES(yang_dilakukan) AND izin_tayang <=> VALUES(izin_tayang) AND
            tayang <=> VALUES(tayang) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(nama <=> VALUES(nama) AND asal_smk <=> VALUES(asal_smk) AND jurusan_smk <=> VALUES(jurusan_smk) AND
            ptn <=> VALUES(ptn) AND prodi <=> VALUES(prodi) AND jalur <=> VALUES(jalur) AND
            hambatan <=> VALUES(hambatan) AND yang_dilakukan <=> VALUES(yang_dilakukan) AND izin_tayang <=> VALUES(izin_tayang) AND
            tayang <=> VALUES(tayang) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         nama=VALUES(nama), asal_smk=VALUES(asal_smk), jurusan_smk=VALUES(jurusan_smk),
         ptn=VALUES(ptn), prodi=VALUES(prodi), jalur=VALUES(jalur), hambatan=VALUES(hambatan),
         yang_dilakukan=VALUES(yang_dilakukan), izin_tayang=VALUES(izin_tayang),
         tayang=VALUES(tayang), sumber=VALUES(sumber), pemilik=VALUES(pemilik),
         asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.nama,
        item.asal_smk,
        item.jurusan_smk,
        item.ptn,
        item.prodi,
        item.jalur,
        item.hambatan,
        item.yang_dilakukan,
        item.izin_tayang ? 1 : 0,
        item.tayang ? 1 : 0,
        'resmi', // dikurasi tim — lihat catatan pemetaan di kepala berkas
        berkas.pemilik,
        berkas.status || 'belum_diverifikasi',
        item.sumber || berkas.asal, // nilai asli item.sumber dipetakan ke `asal`
        null,
        berkas.diperiksa_pada || null,
      ]
    );
  }
  console.log(`[benih] cerita_alumni: ${berkas.data.length} baris`);
}

/**
 * `berlaku_untuk_rumpun` (opsional, migrasi 006): array nama rumpun persis
 * seperti `rumpun` di prodi.json, mis. ["Kesehatan"]. Tidak ada / array
 * kosong → NULL = berlaku untuk semua rumpun (perilaku sebelum kolom ini).
 * Nama yang tidak dikenal DITOLAK: salah ketik akan membuat butir tidak
 * pernah tampil ke siapa pun tanpa ada yang sadar.
 */
function rumpunButir(butir, rumpunSah) {
  const daftar = butir.berlaku_untuk_rumpun;
  if (daftar === undefined || daftar === null) return null;
  if (!Array.isArray(daftar)) {
    throw new Error(`butir "${butir.id}": berlaku_untuk_rumpun harus array, mis. ["Kesehatan"].`);
  }
  if (daftar.length === 0) return null;
  for (const r of daftar) {
    if (!rumpunSah.has(r)) {
      throw new Error(
        `butir "${butir.id}": rumpun "${r}" tidak dikenal. Pilihan: ${[...rumpunSah].join(' | ')}`
      );
    }
  }
  return daftar.join(',');
}

/** `berkas` bisa diganti (dipakai test dengan berkas contoh); bawaan checklist.json. */
async function benihChecklist(berkas = bacaJson('checklist.json')) {
  const rumpunSah = new Set(bacaJson('prodi.json').data.map((p) => p.rumpun));
  // Validasi seluruh berkas dulu supaya salah ketik tidak meninggalkan benih setengah jadi.
  const rumpunPerButir = new Map();
  for (const kategori of berkas.kategori) {
    for (const butir of kategori.butir) rumpunPerButir.set(butir.id, rumpunButir(butir, rumpunSah));
  }

  let totalButir = 0;
  for (const kategori of berkas.kategori) {
    // Kategori boleh menimpa `asal` dan `url_sumber` tingkat berkas (mis. 'Persiapan Ujian':
    // saran tim, bukan isi laman SNPMB → asal 'tim', url_sumber null).
    const asal = kategori.asal !== undefined ? kategori.asal : berkas.asal;
    const urlSumber = kategori.url_sumber !== undefined ? kategori.url_sumber : berkas.url_sumber;
    await pool.execute(
      `INSERT INTO kategori_checklist (id, nama, urutan)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nama=VALUES(nama), urutan=VALUES(urutan)`,
      [kategori.id, kategori.nama, kategori.butir[0] ? kategori.butir[0].urutan : 0]
    );
    for (const butir of kategori.butir) {
      totalButir += 1;
      await pool.execute(
        `INSERT INTO butir_daftar_periksa
           (id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur, berlaku_untuk_rumpun,
            kategori_id, sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status_verifikasi = IF(judul <=> VALUES(judul) AND urutan <=> VALUES(urutan) AND berlaku_untuk_kelas <=> VALUES(berlaku_untuk_kelas) AND
              berlaku_untuk_jalur <=> VALUES(berlaku_untuk_jalur) AND berlaku_untuk_rumpun <=> VALUES(berlaku_untuk_rumpun) AND kategori_id <=> VALUES(kategori_id) AND
              sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND
              url_sumber <=> VALUES(url_sumber),
              status_verifikasi, 'belum_diverifikasi'),
           diperiksa_pada = IF(judul <=> VALUES(judul) AND urutan <=> VALUES(urutan) AND berlaku_untuk_kelas <=> VALUES(berlaku_untuk_kelas) AND
              berlaku_untuk_jalur <=> VALUES(berlaku_untuk_jalur) AND berlaku_untuk_rumpun <=> VALUES(berlaku_untuk_rumpun) AND kategori_id <=> VALUES(kategori_id) AND
              sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND
              url_sumber <=> VALUES(url_sumber),
              diperiksa_pada, NULL),
           judul=VALUES(judul), urutan=VALUES(urutan),
           berlaku_untuk_kelas=VALUES(berlaku_untuk_kelas),
           berlaku_untuk_jalur=VALUES(berlaku_untuk_jalur),
           berlaku_untuk_rumpun=VALUES(berlaku_untuk_rumpun), kategori_id=VALUES(kategori_id),
           sumber=VALUES(sumber), pemilik=VALUES(pemilik),
           asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
        [
          butir.id,
          butir.judul,
          butir.urutan,
          butir.berlaku_untuk_kelas.join(','),
          butir.berlaku_untuk_jalur.join(','),
          rumpunPerButir.get(butir.id),
          kategori.id,
          berkas.sumber,
          berkas.pemilik,
          berkas.status || 'belum_diverifikasi',
          asal,
          urlSumber || null,
          berkas.diperiksa_pada || null,
        ]
      );
    }
  }
  console.log(`[benih] kategori_checklist: ${berkas.kategori.length} baris, butir_daftar_periksa: ${totalButir} baris`);
}

// Level-In (LANJUT_042): data/levelin-konfig.json -> konfigurasi_levelin, satu
// baris per kunci (pemetaan di modul/levelin/konfigurasi.js). `versi` naik dan
// diubah_pada berganti HANYA bila nilainya berubah (SDD-LevelIn §3.2) — urutan
// SET penting: keduanya membaca nilai lama sebelum nilai ditimpa.
async function benihKonfigurasiLevelin() {
  const baris = rataKonfig(bacaJson('levelin-konfig.json'));
  const waktu = sekarangUntukDb();
  for (const b of baris) {
    await pool.execute(
      `INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
       VALUES (?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
         versi = IF(nilai <=> VALUES(nilai), versi, versi + 1),
         diubah_pada = IF(nilai <=> VALUES(nilai), diubah_pada, VALUES(diubah_pada)),
         nilai = VALUES(nilai),
         dasar = VALUES(dasar)`,
      [b.kunci, b.nilai, b.dasar, waktu]
    );
  }
  console.log(`[benih] konfigurasi_levelin: ${baris.length} kunci`);
}

// Kartu kurasi (arsip.json). LANJUT_043: pola LANJUT_011/020 seperti tabel
// konten lain — tanda verifikasi hanya diisi saat INSERT (selalu "belum"),
// lalu DIPERTAHANKAN selama isi kartu tidak berubah, dan direset bila satu
// saja kolom isi berubah. Dulu benih selalu menulis 'belum_diverifikasi',
// jadi tanda dari `verifikasi-konten --jenis=kartu` hilang di benih berikutnya.
// `berkas` bisa diganti fixture di tes.
// LANJUT_076b: `penyedia` (nama sumber, mis. "Kemendikdasmen") dan `url_sumber`
// per kartu ikut dari JSON (dulu selalu NULL), supaya kartu kurasi bisa dipakai
// sebagai materi Persiapan Event. Keduanya bagian dari isi: berubah → tanda
// verifikasi di-reset. Panduan tim konten: docs/verifikasi/panduan-materi-sumber-resmi.md.
async function benihArsipKartu(berkas = bacaJson('arsip.json')) {
  for (const item of berkas.data) {
    await pool.execute(
      `INSERT INTO kartu
         (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia,
          pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada,
          dibuat_pada, diubah_pada)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'belum_diverifikasi', ?, ?, NULL, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(mapel_id <=> VALUES(mapel_id) AND judul <=> VALUES(judul) AND isi <=> VALUES(isi) AND
            jawaban <=> VALUES(jawaban) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND penyedia <=> VALUES(penyedia) AND url_sumber <=> VALUES(url_sumber),
            status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(mapel_id <=> VALUES(mapel_id) AND judul <=> VALUES(judul) AND isi <=> VALUES(isi) AND
            jawaban <=> VALUES(jawaban) AND sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND
            asal <=> VALUES(asal) AND penyedia <=> VALUES(penyedia) AND url_sumber <=> VALUES(url_sumber),
            diperiksa_pada, NULL),
         mapel_id=VALUES(mapel_id), judul=VALUES(judul), isi=VALUES(isi),
         jawaban=VALUES(jawaban), sumber=VALUES(sumber), pemilik=VALUES(pemilik),
         asal=VALUES(asal), penyedia=VALUES(penyedia), url_sumber=VALUES(url_sumber),
         diubah_pada=VALUES(diubah_pada)`,
      [
        item.id,
        item.mapel_id,
        item.judul,
        item.isi,
        item.jawaban || null,
        item.sumber,
        item.penyedia || null,
        berkas.pemilik,
        berkas.asal,
        item.url_sumber || null,
        item.dibuat_pada + ' 00:00:00', // dibuat_pada (DATETIME)
        item.dibuat_pada + ' 00:00:00', // diubah_pada (DATETIME)
      ]
    );
  }
  console.log(`[benih] kartu (resmi): ${berkas.data.length} baris`);
}

/**
 * F10 profil prodi (LANJUT_031) → tabel profil_prodi (migrasi 008).
 *
 * Status awal SELALU 'belum_diverifikasi' / diperiksa_pada NULL, kecuali
 * berkas bertanda 'terverifikasi' persis. Kepala profil-prodi.json berisi
 * `status: "terverifikasi_sebagian"` + `diperiksa_pada` — itu tanggal laporan
 * riset disusun dan penilaian per kelompok (status_sumber), BUKAN tanda
 * bahwa tim konten sudah mengecek profil itu lewat verifikasi-konten. Jadi
 * tidak dinaikkan diam-diam jadi terverifikasi. status_sumber tetap dibawa
 * apa adanya (label "Terverifikasi"/"Perkiraan" per kelompok di layar).
 *
 * Validasi dulu seluruh berkas (id ada di tabel prodi, nama & rumpun sama
 * persis) supaya salah ketik tidak meninggalkan benih setengah jadi.
 * `_catatan_data` (catatan tim, tidak dirender) tidak disimpan.
 *
 * `berkas` bisa diganti (dipakai test dengan berkas fixture); bawaan profil-prodi.json.
 */
async function benihProfilProdi(berkas = bacaJson('profil-prodi.json')) {
  const [prodiDb] = await pool.query('SELECT id, nama, rumpun FROM prodi');
  const petaProdi = new Map(prodiDb.map((p) => [p.id, p]));
  for (const item of berkas.data) {
    const p = petaProdi.get(item.id);
    if (!p) throw new Error(`profil-prodi "${item.id}": id tidak ada di tabel prodi (jalankan benih prodi dulu / cek prodi.json). Tidak ada data yang ditulis.`);
    if (p.nama !== item.nama) throw new Error(`profil-prodi "${item.id}": nama "${item.nama}" beda dengan prodi.json ("${p.nama}"). Tidak ada data yang ditulis.`);
    if (item.rumpun !== undefined && p.rumpun !== item.rumpun) {
      throw new Error(`profil-prodi "${item.id}": rumpun "${item.rumpun}" beda dengan prodi.json ("${p.rumpun}"). Tidak ada data yang ditulis.`);
    }
    for (const k of ['mata_kuliah', 'profesi', 'kampus']) {
      if (!Array.isArray(item[k])) throw new Error(`profil-prodi "${item.id}": ${k} harus larik. Tidak ada data yang ditulis.`);
    }
  }

  const terverifikasi = berkas.status === 'terverifikasi';
  const sama = `nama <=> VALUES(nama) AND urutan <=> VALUES(urutan) AND jenjang <=> VALUES(jenjang) AND
            badge_relevan_smk <=> VALUES(badge_relevan_smk) AND peminat_jumlah <=> VALUES(peminat_jumlah) AND
            peminat_kampus <=> VALUES(peminat_kampus) AND peminat_tahun <=> VALUES(peminat_tahun) AND
            peminat_jalur <=> VALUES(peminat_jalur) AND peminat_sumber <=> VALUES(peminat_sumber) AND
            diterima <=> VALUES(diterima) AND mata_kuliah <=> VALUES(mata_kuliah) AND profesi <=> VALUES(profesi) AND
            kampus <=> VALUES(kampus) AND status_sumber <=> VALUES(status_sumber) AND catatan_studi <=> VALUES(catatan_studi) AND
            sumber <=> VALUES(sumber) AND pemilik <=> VALUES(pemilik) AND asal <=> VALUES(asal) AND url_sumber <=> VALUES(url_sumber)`;

  for (const [i, item] of berkas.data.entries()) {
    const pm = item.peminat || {};
    await pool.execute(
      `INSERT INTO profil_prodi
         (id, nama, urutan, jenjang, badge_relevan_smk, peminat_jumlah, peminat_kampus, peminat_tahun,
          peminat_jalur, peminat_sumber, diterima, mata_kuliah, profesi, kampus, status_sumber, catatan_studi,
          sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status_verifikasi = IF(${sama}, status_verifikasi, 'belum_diverifikasi'),
         diperiksa_pada = IF(${sama}, diperiksa_pada, NULL),
         nama=VALUES(nama), urutan=VALUES(urutan), jenjang=VALUES(jenjang),
         badge_relevan_smk=VALUES(badge_relevan_smk), peminat_jumlah=VALUES(peminat_jumlah),
         peminat_kampus=VALUES(peminat_kampus), peminat_tahun=VALUES(peminat_tahun),
         peminat_jalur=VALUES(peminat_jalur), peminat_sumber=VALUES(peminat_sumber),
         diterima=VALUES(diterima), mata_kuliah=VALUES(mata_kuliah), profesi=VALUES(profesi),
         kampus=VALUES(kampus), status_sumber=VALUES(status_sumber), catatan_studi=VALUES(catatan_studi),
         sumber=VALUES(sumber), pemilik=VALUES(pemilik), asal=VALUES(asal), url_sumber=VALUES(url_sumber)`,
      [
        item.id,
        item.nama,
        i + 1,
        item.jenjang,
        item.badge_relevan_smk ? 1 : 0,
        pm.jumlah ?? null,
        pm.kampus ?? null,
        pm.tahun ?? null,
        pm.jalur ?? null,
        pm.sumber ?? null,
        item.diterima ?? null,
        JSON.stringify(item.mata_kuliah),
        JSON.stringify(item.profesi),
        JSON.stringify(item.kampus),
        JSON.stringify(item.status_sumber || {}),
        item.catatan_studi ?? null,
        berkas.sumber,
        berkas.pemilik,
        terverifikasi ? 'terverifikasi' : 'belum_diverifikasi',
        berkas.asal,
        berkas.url_sumber || null,
        terverifikasi ? berkas.diperiksa_pada || null : null,
      ]
    );
  }
  console.log(`[benih] profil_prodi: ${berkas.data.length} baris`);
}

async function jalankanBenih() {
  pastikanFolderData();
  console.log(`[benih] data konten: ${DIR_DATA}`);
  await benihProdi();
  await benihMapel();
  await benihProdiMapel();
  await benihProfilProdi();
  await benihLinimasa();
  await benihKhususSmk();
  await benihCeritaAlumni();
  await benihChecklist();
  await benihArsipKartu();
  await benihKonfigurasiLevelin();
  console.log('[benih] selesai.');
}

if (require.main === module) {
  jalankanBenih()
    .then(() => process.exit(0))
    .catch((galat) => {
      console.error('[benih] GAGAL:', galat.message);
      process.exit(1);
    });
}

module.exports = { jalankanBenih, benihLinimasa, benihChecklist, benihProfilProdi, benihArsipKartu, DIR_DATA };
