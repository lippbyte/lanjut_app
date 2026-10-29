// Lembar review konten untuk tim konten (LANJUT_043). Menyusun SATU berkas
// Markdown berisi semua konten yang belum terverifikasi. Per butir: id, isi
// yang tampil ke siswa, sumber yang tercatat, perintah menandai, dan kolom
// kosong untuk keputusan & catatan reviewer. Profil prodi F10 paling atas,
// karena itulah yang paling menghambat fitur yang sudah jadi.
//
// HANYA MEMBACA: basis data lewat SELECT, berkas data konten (MVP-PWA/data),
// dan log verifikasi lokal. Tidak ada INSERT/UPDATE/DELETE di sini (dijaga
// tests/lembar-review.test.js). Menandai tetap lewat
// `npm run verifikasi-konten ... --ya`, oleh orang, setelah mengecek sumber.
//
// Kenapa Markdown, bukan CSV: isi profil F10 bertingkat (mata kuliah, profesi,
// kampus + jalur masuk, status data per kelompok) dan tidak terbaca di satu
// sel CSV, sedangkan Excel berlokal Indonesia memecah CSV dengan ";" bukan
// ",". Markdown tetap terbaca sebagai teks biasa, rapi di GitHub/VS Code,
// dan bisa ditempel ke Google Docs.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run lembar-review                        → docs/verifikasi/lembar-review-konten.md
//   npm run lembar-review -- --keluar=lembar.md  → berkas lain

const fs = require('fs');
const path = require('path');
const pool = require('../koneksi');
const env = require('../../config/env');
const { sekarangIso } = require('../../util/waktu');
const { DIR_DATA } = require('../benih/benih');
const { BERKAS_LOG } = require('./verifikasi-konten');

const KELUARAN_BAWAAN = path.join(__dirname, '..', '..', '..', '..', '..', 'docs', 'verifikasi', 'lembar-review-konten.md');

// Query statis, SELECT saja. "Terverifikasi" = definisi verifikasi-konten:
// status 'terverifikasi' DAN diperiksa_pada terisi (dihitung di bawah).
const SQL = {
  profil: `SELECT pp.id, pp.nama, p.rumpun, pp.jenjang, pp.badge_relevan_smk,
                  pp.peminat_jumlah, pp.peminat_kampus, pp.peminat_tahun, pp.peminat_jalur, pp.peminat_sumber,
                  pp.diterima, pp.mata_kuliah, pp.profesi, pp.kampus, pp.status_sumber, pp.catatan_studi,
                  pp.asal, pp.url_sumber, pp.status_verifikasi, DATE_FORMAT(pp.diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
             FROM profil_prodi pp
             JOIN prodi p ON p.id = pp.id
            ORDER BY pp.urutan, pp.id`,
  prodiTanpaProfil: `SELECT p.id, p.nama, p.rumpun
                       FROM prodi p
                       LEFT JOIN profil_prodi pp ON pp.id = p.id
                      WHERE pp.id IS NULL
                      ORDER BY p.id`,
  kartu: `SELECT k.id, k.judul, k.isi, k.jawaban, m.nama AS mapel, k.asal, k.url_sumber,
                 k.status_verifikasi, DATE_FORMAT(k.diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
            FROM kartu k
            JOIN mapel m ON m.id = k.mapel_id
           WHERE k.sumber = 'resmi' AND k.dihapus_pada IS NULL
           ORDER BY m.nama, k.id`,
  prodi: `SELECT id, nama, rumpun, asal, url_sumber, status_verifikasi, DATE_FORMAT(diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
            FROM prodi
           ORDER BY rumpun, nama`,
  prodiMapel: `SELECT pm.prodi_id, m.nama, pm.bobot
                 FROM prodi_mapel pm
                 JOIN mapel m ON m.id = pm.mapel_id
                ORDER BY pm.prodi_id, pm.bobot DESC, m.nama`,
  mapel: `SELECT m.id, m.nama, m.tersedia_di_smk, m.asal, m.url_sumber, m.status_verifikasi,
                 DATE_FORMAT(m.diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada,
                 (SELECT COUNT(*) FROM prodi_mapel pm WHERE pm.mapel_id = m.id) AS jumlah_prodi
            FROM mapel m
           ORDER BY m.nama`,
  khususSmk: `SELECT id, judul, apa_yang_beda, apa_yang_bisa_dilakukan, asal, url_sumber, status_verifikasi,
                     DATE_FORMAT(diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
                FROM butir_khusus_smk
               ORDER BY urutan, id`,
  checklist: `SELECT b.id, b.judul, k.nama AS kategori, b.berlaku_untuk_kelas, b.berlaku_untuk_jalur, b.berlaku_untuk_rumpun,
                     b.asal, b.url_sumber, b.status_verifikasi, DATE_FORMAT(b.diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
                FROM butir_daftar_periksa b
                JOIN kategori_checklist k ON k.id = b.kategori_id
               ORDER BY k.urutan, b.urutan, b.id`,
  linimasa: `SELECT id, judul, jalur, DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') AS mulai,
                    DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') AS selesai, asal, url_sumber, status_verifikasi,
                    DATE_FORMAT(diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
               FROM tahapan_linimasa
              ORDER BY tanggal_mulai, id`,
  cerita: `SELECT id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan, izin_tayang, tayang,
                  asal, url_sumber, status_verifikasi, DATE_FORMAT(diperiksa_pada, '%Y-%m-%d') AS diperiksa_pada
             FROM cerita_alumni
            ORDER BY id`,
};

// --- format ------------------------------------------------------------------

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "2026-09-27" → "27 September 2026" (format tanggal di aplikasi). */
function tanggalPanjang(iso) {
  if (!iso) return '—';
  const [t, b, h] = iso.split('-').map(Number);
  return `${h} ${BULAN[b - 1]} ${t}`;
}

/** Teks konten aman di Markdown: karakter yang bisa jadi format/HTML di-escape, baris baru dirapatkan. */
const aman = (teks) =>
  String(teks ?? '')
    .replace(/[\\`*<>[\]|]/g, (c) => `\\${c}`)
    .replace(/\s*\n\s*/g, ' ');
/** Catatan tim di kepala berkas data: backtick-nya memang format kode, jadi dibiarkan. */
const amanCatatan = (teks) =>
  String(teks ?? '')
    .replace(/[<>|]/g, (c) => `\\${c}`)
    .replace(/\s*\n\s*/g, ' ');
const daftar = (xs) => (xs && xs.length ? xs.map(aman).join('; ') : '— (kosong)');
const json = (nilai) => (typeof nilai === 'string' ? JSON.parse(nilai) : nilai);
const yaTidak = (nilai) => (nilai ? 'ya' : 'tidak');

// Sama dengan LANJUT_App/lib/eksplorasi.ts & lib/sumber.ts — supaya angka dan
// label di lembar persis seperti di layar.
const angkaRibuan = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function rasioKeketatan(diterima, pendaftar) {
  if (diterima === null || diterima === undefined || !pendaftar) return null;
  const persen = Math.round((diterima / pendaftar) * 1000) / 10;
  return `${persen.toFixed(1).replace('.', ',')}%`;
}
function lembagaSumber(url) {
  const u = url ?? '';
  if (u.includes('vokasi.kemdikbud.go.id')) return 'Direktorat SMK, Kemendikdasmen';
  if (u.includes('kemendikdasmen.go.id')) return 'laman resmi Kemendikdasmen';
  if (u.includes('snpmb')) return 'laman resmi SNPMB';
  return 'laman resmi';
}
/** Kaki profil F10 per bagian — sama dengan kalimatKakiProfil di lib/eksplorasi.ts (LANJUT_045). */
function kalimatKakiProfil(status, tanggal) {
  const nilai = ['peminat', 'mata_kuliah', 'profesi', 'kampus'].map((k) => status[k]);
  if (nilai.every((v) => v === 'Terverifikasi')) return `Isi profil ini dicek ke sumber resmi pada ${tanggal}.`;
  const dicek = `Bagian bertanda Terverifikasi dicek ke sumber resmi pada ${tanggal}.`;
  return nilai.includes('Perkiraan') ? `${dicek} Bagian bertanda Perkiraan belum dicek ke sumber resmi.` : dicek;
}

const terverifikasi = (b) => b.status_verifikasi === 'terverifikasi' && Boolean(b.diperiksa_pada);
const tautan = (url) => (url ? url : '— (tidak tercatat)');

// --- sumber data lain (baca saja) ---------------------------------------------

function bacaJson(nama) {
  return JSON.parse(fs.readFileSync(path.join(DIR_DATA, nama), 'utf8'));
}

/** Riwayat tanda per "jenis/id" dari log verifikasi lokal (gitignored). Tidak ada log → kosong. */
function bacaRiwayatLog() {
  const riwayat = new Map();
  let isi = '';
  try {
    isi = fs.readFileSync(BERKAS_LOG, 'utf8');
  } catch {
    return riwayat;
  }
  for (const baris of isi.split(/\r?\n/)) {
    const [waktu, aksi, jenis, ids, tanggal, oleh] = baris.split('\t');
    if (!ids) continue;
    for (const id of ids.split(',')) {
      const kunci = `${jenis}/${id}`;
      if (!riwayat.has(kunci)) riwayat.set(kunci, []);
      riwayat.get(kunci).push({ waktu, aksi, tanggal, oleh });
    }
  }
  return riwayat;
}

// Judul daftar isi per butir, sesuai keadaannya di aplikasi sekarang.
const TAMPIL_SEKARANG = 'Yang tampil ke siswa sekarang';
const TAMPIL_SETELAH_DITANDAI = 'Yang akan tampil ke siswa setelah ditandai';

// --- isi per bagian -------------------------------------------------------------
// Setiap bagian: { jenis, judul, pengantar[], butir[] }. Setiap butir:
// { id, judul, isi[], sumber[], catatan?, terverifikasi }. `jenis` = nilai
// --jenis di skrip verifikasi-konten.

async function bagianProfil() {
  const [baris] = await pool.query(SQL.profil);
  const [tanpaProfil] = await pool.query(SQL.prodiTanpaProfil);
  const berkas = bacaJson('profil-prodi.json');
  const catatanData = new Map(berkas.data.map((p) => [p.id, p._catatan_data]));
  return {
    jenis: 'eksplorasi-tujuan',
    labelIsi: TAMPIL_SETELAH_DITANDAI,
    judul: 'Profil prodi — Eksplorasi Tujuan (F10)',
    pengantar: [
      'Di aplikasi sekarang: profil yang belum ditandai **tidak dikirim server sama sekali**. Semua siswa melihat "Profil prodi sedang kami cek", padahal layarnya sudah jadi. Profil yang ditandai langsung tampil.',
      'Satu profil = satu tanda, berlaku untuk **seluruh** isinya (angka, mata kuliah, profesi, kampus). Kalau ada bagian yang salah, perbaiki dulu di `MVP-PWA/data/profil-prodi.json` → `npm run benih` → baru tandai.',
      'Label status data ("Terverifikasi"/"Perkiraan") tampil ke siswa sebagai lencana di tiap bagian. Menandai profil **tidak** mengubah label itu. Yang dicek: isi cocok dengan sumber, dan label "Perkiraan" memang dipasang pada bagian yang belum bersumber resmi.',
      `Kepala berkas profil-prodi.json: asal "${aman(berkas.asal)}", status berkas "${aman(berkas.status)}", diriset ${tanggalPanjang(berkas.diperiksa_pada)}. ${amanCatatan(berkas._asal)}`,
      tanpaProfil.length
        ? `Prodi yang **belum punya profil** (tidak ada isi untuk direview, lihat laporan kesenjangan LANJUT_043): ${tanpaProfil
            .map((p) => `\`${p.id}\` (${aman(p.nama)}, ${aman(p.rumpun)})`)
            .join(', ')}.`
        : 'Semua prodi sudah punya profil.',
    ],
    butir: baris.map((p) => {
      const status = json(p.status_sumber) || {};
      const rasio = rasioKeketatan(p.diterima, p.peminat_jumlah);
      const sumberPeminat =
        ['Sumber:', p.peminat_sumber, p.peminat_jalur, p.peminat_tahun].filter(Boolean).join(' ') +
        (p.peminat_kampus ? `, ${p.peminat_kampus}` : '');
      const kampus = (json(p.kampus) || []).map((k) => `${aman(k.nama)} (${aman(k.jenis)}; jalur ${(k.jalur_masuk || []).map(aman).join(', ')})`);
      return {
        id: p.id,
        judul: aman(p.nama),
        isi: [
          `**Jenjang:** ${aman(p.jenjang)} · **Rumpun:** ${aman(p.rumpun)} · **Lencana "Relevan untuk RPL/TKJ/Teknik":** ${yaTidak(p.badge_relevan_smk)}`,
          p.peminat_jumlah === null
            ? '**Pendaftar:** — (belum ada data peminat)'
            : `**Pendaftar:** ${angkaRibuan(p.peminat_jumlah)} · **Diterima dari pendaftar:** ${rasio ?? '—'}${
                p.diterima === null ? ' (angka diterima belum ada)' : ` (${angkaRibuan(p.diterima)} diterima)`
              } · tertulis "${aman(sumberPeminat)}" · _status data: ${aman(status.peminat ?? '—')}_`,
          `**Yang akan kamu pelajari** _(status data: ${aman(status.mata_kuliah ?? '—')})_: ${daftar(json(p.mata_kuliah))}`,
          ...(p.catatan_studi ? [`**Catatan studi:** ${aman(p.catatan_studi)}`] : []),
          `**Ke mana lulusannya** _(status data: ${aman(status.profesi ?? '—')})_: ${daftar(json(p.profesi))}`,
          `**Kampus yang cocok** _(status data: ${aman(status.kampus ?? '—')})_: ${kampus.length ? kampus.join('; ') : '— (kosong)'}`,
          `**Kaki halaman:** "${kalimatKakiProfil(status, p.diperiksa_pada ? tanggalPanjang(p.diperiksa_pada) : '[tanggal saat ditandai]')}"`,
        ],
        sumber: [`Tempat memverifikasi (url_sumber): ${tautan(p.url_sumber)}`, `Asal isi: ${aman(p.asal)}`],
        catatan: catatanData.get(p.id) ? aman(catatanData.get(p.id)) : null,
        terverifikasi: terverifikasi(p),
      };
    }),
  };
}

async function bagianKartu() {
  const [baris] = await pool.query(SQL.kartu);
  const berkas = bacaJson('arsip.json');
  return {
    jenis: 'kartu',
    labelIsi: TAMPIL_SETELAH_DITANDAI,
    judul: 'Kartu kurasi — Arsip Belajar & Latihan (F6/F7)',
    pengantar: [
      'Di aplikasi sekarang: kartu kurasi yang belum ditandai **tidak dikirim server** (LANJUT_040). Arsip dan Latihan hanya berisi kartu buatan siswa sendiri, padahal PRD F6 meminta arsip sudah berisi kartu kurasi tim.',
      'Hanya kartu kurasi tim (sumber "resmi") yang ada di lembar ini. Kartu buatan siswa tidak pernah diverifikasi lewat skrip.',
      `Kepala berkas arsip.json: asal "${aman(berkas.asal)}", yaitu isi contoh yang ditulis tim untuk mengisi kerangka dan belum ditinjau. Tidak ada url_sumber tercatat; yang dicek adalah kebenaran soal & jawabannya terhadap materi resmi mapelnya.`,
    ],
    butir: baris.map((k) => ({
      id: k.id,
      judul: aman(k.judul),
      isi: [
        `**Mapel:** ${aman(k.mapel)}`,
        `**Judul kartu:** ${aman(k.judul)}`,
        `**Isi / pertanyaan:** ${aman(k.isi)}`,
        `**Jawaban:** ${k.jawaban ? aman(k.jawaban) : '— (tanpa jawaban)'}`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(k.url_sumber)}`, `Asal isi: ${aman(k.asal)}`],
      terverifikasi: terverifikasi(k),
    })),
  };
}

async function bagianProdi() {
  const [baris] = await pool.query(SQL.prodi);
  const [relasi] = await pool.query(SQL.prodiMapel);
  const berkasRelasi = bacaJson('prodi-mapel.json');
  const labelBobot = (b) => (berkasRelasi._bobot && berkasRelasi._bobot[b] ? berkasRelasi._bobot[b].split(' — ')[0] : `bobot ${b}`);
  const mapelPerProdi = new Map();
  for (const r of relasi) {
    if (!mapelPerProdi.has(r.prodi_id)) mapelPerProdi.set(r.prodi_id, []);
    mapelPerProdi.get(r.prodi_id).push(`${aman(r.nama)} (${r.bobot} = ${aman(labelBobot(r.bobot))})`);
  }
  return {
    jenis: 'prodi',
    labelIsi: TAMPIL_SEKARANG,
    judul: 'Prodi — daftar prodi & pemetaan mapel (F3 Penolong Pilih Mapel)',
    pengantar: [
      'Di aplikasi sekarang: daftar prodi dan pemetaan mapelnya **tampil di F3 apa pun statusnya**, dengan penafian. Saran "2 mapel pilihan TKA" diambil dari mapel berbobot 3.',
      `Pemetaan prodi → mapel (bobot 1–3) **tidak punya status verifikasi sendiri** dan hanya ikut dicek di sini. Kepala berkas prodi-mapel.json: asal "${aman(
        berkasRelasi.asal
      )}", yaitu dari mockup desain, belum dicek ke ketentuan mapel pendukung SNPMB resmi.`,
    ],
    butir: baris.map((p) => ({
      id: p.id,
      judul: aman(p.nama),
      isi: [
        `**Nama:** ${aman(p.nama)} · **Rumpun:** ${aman(p.rumpun)}`,
        `**Mapel pendukung di F3:** ${mapelPerProdi.has(p.id) ? mapelPerProdi.get(p.id).join('; ') : '— (tidak ada pemetaan)'}`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(p.url_sumber)}`, `Asal isi: ${aman(p.asal)}`],
      terverifikasi: terverifikasi(p),
    })),
  };
}

async function bagianMapel() {
  const [baris] = await pool.query(SQL.mapel);
  const berkas = bacaJson('mapel.json');
  return {
    jenis: 'mapel',
    labelIsi: TAMPIL_SEKARANG,
    judul: 'Mapel — ketersediaan di SMK (F3)',
    pengantar: [
      'Di aplikasi sekarang: daftar mapel **tampil di F3 apa pun statusnya**. Kolom "tersedia di SMK" adalah inti F3: menentukan mapel mana yang perlu dikejar sendiri oleh siswa SMK.',
      `Kepala berkas mapel.json: asal "${aman(berkas.asal)}". Nilai "tersedia di SMK" masih mengikuti mockup dan belum dicek ke struktur kurikulum SMK; ini Pertanyaan Terbuka PRD §11 yang memblokir F3.`,
    ],
    butir: baris.map((m) => ({
      id: m.id,
      judul: aman(m.nama),
      isi: [
        `**Nama:** ${aman(m.nama)}`,
        `**Tersedia di SMK:** ${yaTidak(m.tersedia_di_smk)}`,
        `**Dipakai di pemetaan:** ${m.jumlah_prodi} prodi`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(m.url_sumber)}`, `Asal isi: ${aman(m.asal)}`],
      terverifikasi: terverifikasi(m),
    })),
  };
}

async function bagianKhususSmk() {
  const [baris] = await pool.query(SQL.khususSmk);
  const berkas = bacaJson('khusus-smk.json');
  return {
    jenis: 'khusus-smk',
    labelIsi: TAMPIL_SEKARANG,
    judul: 'Khusus SMK (F2)',
    pengantar: [
      'Di aplikasi sekarang: butir **tampil** dengan keterangan "Perlu dicek ke [lembaga] · belum diverifikasi". Setelah ditandai, keterangannya menjadi "Diperbarui dari [lembaga] · dicek [tanggal]".',
      `Nada (kepala berkas khusus-smk.json): ${amanCatatan(berkas._nada)}`,
    ],
    butir: baris.map((b) => ({
      id: b.id,
      judul: aman(b.judul),
      isi: [
        `**Judul:** ${aman(b.judul)}`,
        `**Apa yang berbeda:** ${aman(b.apa_yang_beda)}`,
        `**Apa yang bisa dilakukan:** ${aman(b.apa_yang_bisa_dilakukan)}`,
        // Sama dengan JenjangSayaScreen: yang menentukan hanya diperiksa_pada.
        `**Keterangan sumber di layar:** "${
          b.diperiksa_pada
            ? `Diperbarui dari ${lembagaSumber(b.url_sumber)} · dicek ${tanggalPanjang(b.diperiksa_pada)}`
            : `Perlu dicek ke ${lembagaSumber(b.url_sumber)} · belum diverifikasi`
        }"`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(b.url_sumber)}`, `Asal isi: ${aman(b.asal)}`],
      terverifikasi: terverifikasi(b),
    })),
  };
}

async function bagianChecklist() {
  const [baris] = await pool.query(SQL.checklist);
  return {
    jenis: 'checklist',
    labelIsi: TAMPIL_SEKARANG,
    judul: 'Daftar Periksa (F5)',
    pengantar: [
      'Di aplikasi sekarang: butir **tampil**, dan selama ada butir yang belum ditandai, di bawah daftar muncul "Perlu dicek ke laman resmi SNPMB · belum diverifikasi".',
    ],
    butir: baris.map((b) => ({
      id: b.id,
      judul: aman(b.judul),
      isi: [
        `**Kategori:** ${aman(b.kategori)}`,
        `**Butir:** ${aman(b.judul)}`,
        `**Berlaku untuk:** kelas ${aman(b.berlaku_untuk_kelas)} · jalur ${aman(b.berlaku_untuk_jalur)} · rumpun ${
          b.berlaku_untuk_rumpun ? aman(b.berlaku_untuk_rumpun) : 'semua'
        }`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(b.url_sumber)}`, `Asal isi: ${aman(b.asal)}`],
      terverifikasi: terverifikasi(b),
    })),
  };
}

async function bagianLinimasa() {
  const [baris] = await pool.query(SQL.linimasa);
  const berkas = bacaJson('linimasa.json');
  return {
    jenis: 'linimasa',
    labelIsi: TAMPIL_SETELAH_DITANDAI,
    judul: 'Linimasa (Beranda, F1)',
    pengantar: [
      'Di aplikasi sekarang: tahapan yang belum ditandai **disembunyikan** (PRD F1 melarang menampilkan tanggal yang belum diverifikasi).',
      amanCatatan(berkas._peringatan),
      amanCatatan(berkas._url_sumber_artinya),
      'Tahapan ber-asal "mockup" **tidak bisa ditandai apa adanya**: tanggalnya harus diganti dulu dengan tanggal resmi di linimasa.json (asal diubah ke "resmi") → `npm run benih` → baru dicek dan ditandai.',
    ],
    butir: baris.map((t) => ({
      id: t.id,
      judul: aman(t.judul),
      isi: [
        `**Judul:** ${aman(t.judul)} · **Jalur:** ${aman(t.jalur)}`,
        `**Tanggal:** ${tanggalPanjang(t.mulai)}${t.selesai ? ` – ${tanggalPanjang(t.selesai)}` : ''}`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(t.url_sumber)}`, `Asal isi: ${aman(t.asal)}`],
      terverifikasi: terverifikasi(t),
    })),
  };
}

async function bagianCerita() {
  const [baris] = await pool.query(SQL.cerita);
  const berkas = bacaJson('cerita-alumni.json');
  return {
    jenis: 'cerita-alumni',
    labelIsi: 'Isi cerita (tidak tampil ke siswa)',
    judul: 'Cerita Alumni (F4)',
    contohFiktif: true,
    pengantar: [
      'Di aplikasi sekarang: hanya cerita dengan izin tayang **dan** tanda tayang yang dikirim server, jadi cerita di bawah tidak pernah tampil.',
      `**JANGAN DITANDAI.** ${amanCatatan(berkas._catatan)}`,
    ],
    butir: baris.map((c) => ({
      id: c.id,
      judul: aman(c.nama),
      isi: [
        `**Nama:** ${aman(c.nama)} · **SMK:** ${aman(c.asal_smk)} (${aman(c.jurusan_smk)})`,
        `**Kampus & prodi:** ${aman(c.ptn)}, ${aman(c.prodi)} · **Jalur:** ${aman(c.jalur)}`,
        `**Hambatan:** ${aman(c.hambatan)}`,
        `**Yang dilakukan:** ${aman(c.yang_dilakukan)}`,
        `**Izin tayang:** ${yaTidak(c.izin_tayang)} · **Tayang:** ${yaTidak(c.tayang)}`,
      ],
      sumber: [`Tempat memverifikasi (url_sumber): ${tautan(c.url_sumber)}`, `Asal isi: ${aman(c.asal)}`],
      terverifikasi: terverifikasi(c),
    })),
  };
}

/** Urutan = urutan di lembar. F10 paling atas (fitur jadi yang paling terhambat). */
const BAGIAN = [bagianProfil, bagianKartu, bagianProdi, bagianMapel, bagianKhususSmk, bagianChecklist, bagianLinimasa, bagianCerita];

// --- susun Markdown ------------------------------------------------------------

const PERINTAH = 'npm run verifikasi-konten --';

function blokButir(bagian, b, nomor, riwayat) {
  const baris = [`### ${nomor} ${b.judul}`, '', `**ID:** \`${b.id}\` · **jenis:** \`${bagian.jenis}\``, ''];
  const labelIsi = b.terverifikasi && bagian.labelIsi === TAMPIL_SETELAH_DITANDAI ? TAMPIL_SEKARANG : bagian.labelIsi;
  baris.push(`**${labelIsi}:**`, '', ...b.isi.map((i) => `- ${i}`), '');
  baris.push('**Sumber yang tercatat:**', '', ...b.sumber.map((s) => `- ${s}`), '');
  if (b.catatan) baris.push(`**Catatan tim riset di berkas data** (tidak tampil ke siswa): ${b.catatan}`, '');

  if (b.terverifikasi) {
    const log = riwayat.get(`${bagian.jenis}/${b.id}`) || [];
    baris.push('**Riwayat tanda (log lokal `verifikasi-konten.log`):**', '');
    baris.push(
      ...(log.length
        ? log.map((l) => `- ${l.waktu.slice(0, 10)} · ${l.aksi}${l.tanggal && l.tanggal !== '-' ? ` (dicek ${l.tanggal})` : ''} · oleh: ${aman(l.oleh)}`)
        : ['- (tidak ada catatan di log mesin ini)']),
      ''
    );
    baris.push(
      `**Bila tanda ini ternyata salah** (pratinjau dulu, lalu ulangi dengan \`--ya\`): \`${PERINTAH} --jenis=${bagian.jenis} --id=${b.id} --batal --oleh="Nama Pemeriksa"\``,
      ''
    );
    baris.push('**Keputusan reviewer:**', '', '- [ ] Benar — tanda dipertahankan', '- [ ] Salah — tanda perlu dibatalkan (jelaskan di catatan)', '');
  } else if (bagian.contohFiktif) {
    baris.push('**Keputusan reviewer:**', '', '- [ ] Sudah ada cerita nyata pengganti berizin tertulis (lampirkan)', '- [ ] Belum ada', '');
  } else {
    baris.push(
      `**Perintah setelah dicek** (pratinjau dulu, lalu ulangi dengan \`--ya\`): \`${PERINTAH} --jenis=${bagian.jenis} --id=${b.id} --oleh="Nama Pemeriksa"\``,
      ''
    );
    baris.push(
      '**Keputusan reviewer:**',
      '',
      '- [ ] Sesuai sumber — boleh ditandai terverifikasi',
      '- [ ] Perlu diperbaiki dulu (jelaskan di catatan)',
      '- [ ] Tidak bisa dicek — sumber tidak tersedia / tidak cocok',
      ''
    );
  }
  baris.push('**Diperiksa oleh, tanggal:** ……', '', '**Catatan reviewer:** ……', '', '---', '');
  return baris.join('\n');
}

// LANJUT_046 (Bagian B): usulan standar, BUKAN keputusan — tetap DRAF sampai
// Khalifa menyetujui. Isinya persis empat butir usulan di
// docs/LANJUT_046_Lembar-Review-Draf-Teks.md; jangan ditambah aturan di sini
// tanpa keputusan. Ditulis oleh pembuat lembar supaya tidak hilang saat
// lembar dibuat ulang.
const STANDAR_PEMERIKSAAN = [
  '## Standar pemeriksaan',
  '',
  '> **DRAF — menunggu persetujuan Khalifa.** Usulan awal (LANJUT_046), belum keputusan. Kaki halaman profil Eksplorasi Tujuan menjanjikan ke siswa bahwa bagian bertanda Terverifikasi "dicek ke sumber resmi". Janji itu hanya benar kalau pemeriksaan mengikuti standar ini.',
  '',
  '1. **Sumber yang dihitung "resmi":** SNPMB, laman PMB atau akademik kampus yang bersangkutan, PDDikti, dokumen kurikulum resmi prodi, dan sumber pemerintah lain yang setara.',
  '2. **Yang tidak dihitung:** blog, artikel media, video, forum, dan ringkasan pihak ketiga.',
  '3. Satu butir hanya boleh ditandai terverifikasi kalau pemeriksa bisa menunjuk sumber resminya (cantumkan di kolom catatan).',
  '4. Bagian yang tidak bisa dicek ke sumber resmi tetap "Perkiraan".',
  '',
];

function susunMarkdown(semuaBagian, { dibuat, basisData }) {
  const riwayat = bacaRiwayatLog();
  const out = [
    '# Lembar Review Konten LANJUT',
    '',
    `Dibuat otomatis ${dibuat} dengan \`npm run lembar-review\` (folder \`LANJUT_App/server\`) dari basis data \`${basisData}\` dan berkas \`MVP-PWA/data/\`. Lembar ini **hanya bacaan**: membuat atau mengisinya tidak mengubah apa pun di aplikasi.`,
    '',
    ...STANDAR_PEMERIKSAAN,
    '## Cara memakai lembar ini',
    '',
    '1. Kerjakan dari atas. Bagian 1 (profil prodi) paling mendesak: layar Eksplorasi Tujuan sudah jadi, tetapi kosong untuk semua siswa sampai profilnya ditandai. Bagian 2 (kartu kurasi) menyusul untuk alasan yang sama.',
    '2. Untuk setiap butir: buka sumber yang tercatat, cocokkan dengan isi yang (akan) tampil ke siswa, centang **satu** keputusan (ganti `[ ]` menjadi `[x]`), lalu isi nama, tanggal, dan catatan.',
    '3. Butir baru berstatus terverifikasi setelah orang yang berwenang menjalankan perintah di butir itu dari folder `LANJUT_App/server`. Tanpa `--ya` perintah hanya menampilkan pratinjau dan **tidak mengubah apa pun**; ulangi dengan `--ya` di akhir untuk benar-benar menandai. Tambahkan `--tanggal=TAHUN-BULAN-TANGGAL` bila tanggal pengecekan berbeda dari hari perintah dijalankan.',
    '4. Kalau isinya perlu diperbaiki: ubah berkas data di `MVP-PWA/data/`, jalankan `npm run benih`, lalu buat ulang lembar ini. Isi yang berubah otomatis kembali ke "belum terverifikasi", termasuk yang sudah pernah ditandai.',
    '5. Jangan menandai butir yang sumbernya tidak bisa dibuka atau tidak cocok. Pilih "Tidak bisa dicek" dan tulis alasannya. Jangan mengisi kekosongan dengan perkiraan sendiri.',
    '',
    '## Ringkasan',
    '',
    '| No | Bagian | `--jenis` | Total | Sudah ditandai | Belum | Di lembar |',
    '|---|---|---|---|---|---|---|',
  ];
  semuaBagian.forEach((g, i) => {
    const sudah = g.butir.filter((b) => b.terverifikasi).length;
    const diLembar = g.butir.length - sudah + (sudah ? ` (+${sudah} konfirmasi ulang)` : '');
    out.push(`| ${i + 1} | ${g.judul} | \`${g.jenis}\` | ${g.butir.length} | ${sudah} | ${g.butir.length - sudah} | ${diLembar} |`);
  });
  out.push('');

  semuaBagian.forEach((g, i) => {
    const belum = g.butir.filter((b) => !b.terverifikasi);
    const sudah = g.butir.filter((b) => b.terverifikasi);
    out.push(`## ${i + 1}. ${g.judul} — ${belum.length} belum terverifikasi`, '');
    out.push(g.pengantar.map((p) => `> ${p}`).join('\n>\n'), '');
    if (!belum.length) out.push('_Semua butir di bagian ini sudah ditandai._', '');
    belum.forEach((b, j) => out.push(blokButir(g, b, `${i + 1}.${j + 1}`, riwayat)));
    if (sudah.length) {
      out.push(`### Sudah ditandai — mohon konfirmasi ulang oleh tim konten (${sudah.length})`, '');
      out.push('Butir di bawah sudah berstatus terverifikasi. Penandanya tercatat di log; mohon dipastikan oleh orang tim konten.', '');
      sudah.forEach((b, j) => out.push(blokButir(g, b, `${i + 1}.K${j + 1}`, riwayat)));
    }
  });
  return out.join('\n');
}

/** Lembar lengkap sebagai teks Markdown (tanpa menulis berkas). */
async function susunLembar() {
  const semuaBagian = [];
  for (const bagian of BAGIAN) semuaBagian.push(await bagian());
  return susunMarkdown(semuaBagian, { dibuat: sekarangIso().slice(0, 10), basisData: env.DB_NAME });
}

async function jalankan(argv) {
  let keluaran = KELUARAN_BAWAAN;
  for (const a of argv) {
    const m = /^--keluar=(.+)$/.exec(a);
    if (!m) throw new Error(`Argumen "${a}" tidak dikenal. Pilihan: --keluar=berkas.md`);
    keluaran = path.resolve(m[1]);
  }
  const md = await susunLembar();
  fs.mkdirSync(path.dirname(keluaran), { recursive: true });
  fs.writeFileSync(keluaran, md, 'utf8');
  const jumlah = (md.match(/^\*\*ID:\*\* /gm) || []).length;
  console.log(`[lembar-review] ${jumlah} butir → ${keluaran}`);
  return keluaran;
}

if (require.main === module) {
  jalankan(process.argv.slice(2))
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async (galat) => {
      console.error(`[lembar-review] GAGAL: ${galat.message}`);
      await pool.end().catch(() => {});
      process.exit(1);
    });
}

module.exports = { susunLembar, jalankan, KELUARAN_BAWAAN, STANDAR_PEMERIKSAAN };
