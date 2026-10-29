// Uji teks kebijakan privasi (LANJUT_047, draf v2 LANJUT_056). Tanpa basis data.
//   - docs/kebijakan-privasi-DRAF.md memuat teks yang SAMA PERSIS dengan
//     LANJUT_App/lib/kebijakan-privasi.json (yang dipakai app);
//   - ringkasan di salinan-teks-lanjut.md §4.13 sama persis dengan JSON;
//   - kedua dokumen bertanda DRAF untuk ahli hukum;
//   - tidak ada kontak/alamat/tautan yang terisi tanpa keputusan ([ISI: ...]);
//   - setiap kelompok data yang disimpan basis data disebut di kebijakan;
//   - LANJUT_056: kebijakan menyebut pengiriman ke penyedia AI; kalimat
//     "tidak dikirim ke mana pun" (dan variasinya) tidak ada lagi di teks
//     siswa; setiap [ISI] punya pengisi di docs/kebijakan-v2-klaim-vs-kode.md.

const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { susunDokumen, daftarIsi, SUMBER, DOKUMEN } = require('../tools/kebijakan-privasi');

const AKAR = path.join(__dirname, '..', '..', '..');
const APP = path.join(AKAR, 'LANJUT_App');
const SURAT = path.join(AKAR, 'docs', 'surat-persetujuan-ortu-wali-DRAF.md');
const KLAIM = path.join(AKAR, 'docs', 'kebijakan-v2-klaim-vs-kode.md');
const baca = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const rata = (s) => s.replace(/\s+/g, ' ');
const kebijakan = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));
const semuaTeks = [...kebijakan.ringkasan, ...kebijakan.isi.flatMap((b) => [b.judul, ...(b.paragraf ?? []), ...(b.butir ?? [])])];

/** Semua berkas di `dir` (rekursif) yang berakhiran salah satu `akhiran`. */
function berkasDi(dir, akhiran) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : berkasDi(p, akhiran);
    return akhiran.some((a) => e.name.endsWith(a)) ? [p] : [];
  });
}

test('dokumen DRAF berisi teks kebijakan yang sama persis dengan app (npm run dokumen-kebijakan)', () => {
  const dok = baca(DOKUMEN);
  assert.equal(susunDokumen(dok), dok, 'jalankan npm run dokumen-kebijakan');
  for (const t of semuaTeks) assert.ok(dok.includes(t), t.slice(0, 60));
  assert.ok(dok.includes(`${daftarIsi(kebijakan).length} bagian menunggu keputusan Khalifa`));
});

test('ringkasan di salinan-teks-lanjut.md §4.13 sama persis dengan app', () => {
  const salinan = baca(path.join(AKAR, 'docs', 'salinan-teks-lanjut.md'));
  kebijakan.ringkasan.forEach((t, i) => assert.ok(salinan.includes(`- **Ringkasan ${i + 1}:** ${t}\n`), `Ringkasan ${i + 1}`));
});

test('kedua dokumen bertanda DRAF untuk ahli hukum; surat punya tempat nomor, tanda tangan, dan nomor versi', () => {
  const surat = baca(SURAT);
  for (const dok of [baca(DOKUMEN), surat]) assert.match(dok, /\*\*DRAF — wajib direview ahli hukum sebelum dipakai\.\*\*/);
  assert.match(surat, /\*\*Nomor:\*\* \.{5,}/);
  assert.match(surat, /\(tanda tangan\)/);
  // Draf v2 (LANJUT_056): surat merujuk versi yang dirilis, belum bernomor.
  assert.ok(rata(surat).includes('kebijakan privasi LANJUT versi [ISI: nomor versi saat dirilis]'), 'surat merujuk [ISI: nomor versi saat dirilis]');
  assert.doesNotMatch(surat, /versi 1\b/, 'surat v2 tidak merujuk versi 1');
  // LANJUT_056 hanya teks: versi baru dinaikkan bersama konfigurasi server saat rilis.
  assert.equal(kebijakan.versi, 1, 'versi dinaikkan saat rilis, bersama migrasi persetujuan_versi_kebijakan dan nomor di surat');
  assert.match(kebijakan.status, /^DRAF/);
});

test('tidak ada kontak, alamat, atau tautan yang diisi tanpa keputusan', () => {
  const teks = semuaTeks.join('\n');
  assert.doesNotMatch(teks, /[\w.+-]+@[\w-]+\.\w/, 'alamat email');
  assert.doesNotMatch(teks, /https?:\/\//, 'tautan');
  assert.doesNotMatch(teks, /(\+62|\b08)\d{6,}/, 'nomor telepon');
  assert.doesNotMatch(teks, /\b(Jl\.|Jalan) /, 'alamat');
  // LANJUT_056: fakta yang belum dicek tetap [ISI], bukan ditebak.
  for (const kunci of [
    'nama badan pengelola',
    'penyedia model yang benar-benar menerima data',
    'negara atau wilayah pemrosesan',
    'hasil pengecekan Khalifa terhadap kebijakan OpenRouter dan penyedia model',
    'mesin pencari mana yang menerima pertanyaan',
    'apakah akun dasar (tanpa AI) juga butuh persetujuan orang tua',
    'masa simpan modul',
    'hak cipta',
    'Kontak',
  ]) {
    assert.ok(daftarIsi(kebijakan).some((x) => x.isi.includes(kunci) || x.letak === kunci), `[ISI] ${kunci}`);
  }
});

test('LANJUT_056: kebijakan menyebut pengiriman ke penyedia AI, modul, web, penyamaran, penyimpanan, dan keselamatan', () => {
  const teks = semuaTeks.join('\n').toLowerCase();
  const WAJIB = [
    'openrouter', // penyedia pihak ketiga disebut namanya
    'di luar indonesia',
    'riwayat obrolan',
    'hingga 20 pesan terakhir',
    'kelas, jenis sekolah, nama prodi impian, dan gaya belajar',
    'nama tampilan, nama pengguna, email, kata sandi, dan id akunmu',
    'potongan modul',
    'berlaku bila fitur ini diaktifkan (bawaannya mati)',
    'mesin pencari pihak ketiga',
    'situs pihak ketiga',
    '[disamarkan]',
    'tidak sempurna',
    'server lanjut tidak menyimpan isi obrolan',
    'data_collection: deny',
    'kartu layanan bantuan',
    'diganti catatan singkat dari aplikasi', // pesan akut di riwayat berikutnya (LANJUT_060)
    'bisa mematikan fitur ai',
    'layar ngobrol terkunci',
    'pencabutan tidak menghapus data yang sudah pernah dikirim ke penyedia ai',
    'nanti saja', // terima ulang (LANJUT_048)
  ];
  for (const kata of WAJIB) assert.ok(teks.includes(kata), kata);
});

test('LANJUT_056: kalimat "tidak dikirim ke mana pun" dan variasinya tidak ada di kebijakan, surat, salinan, maupun teks app', () => {
  const TERLARANG = [
    /dikirim\s+ke\s+mana[\s-]*pun/i,
    /(tidak|belum|tak)\s+(pernah\s+)?(di)?kirim(kan)?\s+ke\s+(pihak\s+(lain|ketiga|luar)|luar(\s+negeri)?)\b/i,
    /tidak\s+dikirim\s+ke\s+server\s+LANJUT\s+maupun/i,
    /(obrolan|pesan|riwayat)[^.\n]{0,80}(tidak|belum)\s+(pernah\s+)?dikirim\s+ke\s+(server|mana|pihak|luar)/i,
    /(tidak|belum)\s+pernah\s+keluar\s+dari\s+(HP|perangkat|aplikasi|server)/i,
  ];
  const berkas = [
    SUMBER,
    DOKUMEN,
    SURAT,
    path.join(AKAR, 'docs', 'salinan-teks-lanjut.md'),
    path.join(AKAR, 'docs', 'lembar-review-draf-teks.md'),
    ...['app', 'components', 'lib', 'hooks', 'providers', 'api'].flatMap((d) => berkasDi(path.join(APP, d), ['.ts', '.tsx', '.json'])),
    ...berkasDi(path.join(APP, 'server', 'config'), ['.json']),
    ...fs.readdirSync(path.join(AKAR, 'MVP-PWA')).filter((n) => n.endsWith('.html')).map((n) => path.join(AKAR, 'MVP-PWA', n)),
  ];
  assert.ok(berkas.length > 50, `terlalu sedikit berkas dipindai (${berkas.length})`);
  const temuan = [];
  for (const p of berkas) {
    baca(p).split('\n').forEach((baris, i) => {
      if (TERLARANG.some((pola) => pola.test(baris))) temuan.push(`${path.relative(AKAR, p)}:${i + 1}: ${baris.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(temuan, []);
});

test('LANJUT_056: setiap [ISI] di kebijakan dan surat punya pengisi di kebijakan-v2-klaim-vs-kode.md', () => {
  const klaim = baca(KLAIM);
  // `[ISI: ...]` (tiga titik) = contoh penulisan di catatan peninjau, bukan bagian yang harus diisi.
  const isi = (teks) => [...rata(teks).matchAll(/\[ISI: [^\]]+\]/g)].map((m) => m[0]).filter((x) => x !== '[ISI: ...]');
  const semua = new Set([...isi(semuaTeks.join('\n')), ...isi(baca(SURAT))]);
  assert.ok(semua.size >= 25, `jumlah [ISI] unik: ${semua.size}`);
  for (const x of semua) assert.ok(klaim.includes(`\`${x}\``), `belum ada di daftar pengisi: ${x}`);
  // satu baris per [ISI] unik (tidak ada baris basi), dan setiap baris menyebut pengisinya
  const daftar = klaim.split('## Yang harus dilengkapi manusia')[1];
  const baris = daftar.split('\n').filter((b) => /^\| I\d+ \|/.test(b));
  assert.equal(baris.length, semua.size, 'jumlah baris daftar pengisi = jumlah [ISI] unik');
  for (const b of baris) assert.match(b.split('|').at(-2), /Khalifa|guru BK|peninjau hukum|Sekolah/, b.slice(0, 60));
});

test('LANJUT_056: setiap klaim di tabel klaim-vs-kode punya bukti dan status', () => {
  const klaim = baca(KLAIM).split('## 8. Surat')[0];
  const baris = klaim.split('\n').filter((b) => /^\| [A-Z]+\d+[a-z]? \|/.test(b));
  assert.ok(baris.length >= 60, `jumlah klaim: ${baris.length}`);
  for (const b of baris) {
    const sel = b.split('|').slice(1, -1).map((s) => s.trim());
    assert.equal(sel.length, 4, b.slice(0, 60));
    assert.ok(sel[2].length > 0, `bukti kosong: ${sel[0]}`);
    assert.match(sel[3], /terbukti|perlu dicek manusia/, `status: ${sel[0]}`);
  }
});

test('setiap kelompok data yang disimpan disebut di kebijakan', () => {
  const teks = semuaTeks.join('\n').toLowerCase();
  // kolom/tabel pribadi (migrasi 001–012) → kata yang harus ada di kebijakan
  const WAJIB = {
    'pengguna.nama_pengguna': 'nama pengguna',
    'pengguna.nama_tampilan': 'nama tampilan',
    'pengguna.email': 'email',
    'pengguna.kata_sandi_hash': 'kata sandi',
    'pengguna.kelas': 'kelas',
    'pengguna.jenis_sekolah': 'jenis sekolah',
    'pengguna.prodi_tujuan': 'prodi impian',
    'pengguna.gaya_belajar': 'gaya belajar',
    'pengguna.status': 'status akun',
    'pengguna.terakhir_masuk_pada': 'terakhir kamu masuk',
    sesi_pengguna: 'sesi masuk',
    percobaan_masuk: 'percobaan masuk yang gagal',
    kemajuan: 'daftar periksa',
    butir_pribadi: 'pilih mapel atau eksplorasi tujuan',
    kartu: 'kartu',
    sesi_latihan: 'sesi latihan',
    riwayat_latihan: 'seberapa yakin',
    persetujuan: 'mencabut persetujuan',
    modul: 'modul', // LANJUT_049
    'modul.isi (berkas asli tidak disimpan)': 'berkas aslinya tidak disimpan',
    'modul (hapus permanen)': 'hapus permanen',
    pemakaian_ai_harian: 'hitungan harian gabungan', // LANJUT_060, tanpa ID akun/isi
  };
  for (const [kolom, kata] of Object.entries(WAJIB)) assert.ok(teks.includes(kata), `${kolom} → "${kata}"`);
});
