// Uji modul Arsip Belajar (LANJUT_049): unggah (berkas & tempel), ekstraksi
// & penolakan, batas dari konfigurasi, pencarian FULLTEXT, lintas akun, hapus
// permanen (termasuk sisa kata di indeks FULLTEXT), dan berkas asli tidak
// pernah tertulis ke disk.
//
// Konfigurasi modul_* diubah di beberapa tes lalu SELALU dikembalikan; hanya
// berkas ini yang membacanya.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { rapikanIndeksSekarang } = require('../src/modul/modul/modul.layanan');

const FIXTURE = path.join(__dirname, 'fixtures', 'modul');
const KUNCI = ['modul_ukuran_maks_byte', 'modul_karakter_maks', 'modul_jumlah_maks'];
let server;
let baseUrl;
let konfigAsli;
let lepasKunci;

before(async () => {
  // Batas modul diubah sementara; tes AI (materi & skenario) mengunggah modul di proses lain (LANJUT_055).
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI]);
  konfigAsli = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  assert.equal(Object.keys(konfigAsli).length, 3, 'jalankan npm run migrasi (013_modul)');
});

after(async () => {
  for (const [k, v] of Object.entries(konfigAsli)) await aturKonfig(k, v);
  await new Promise((resolve) => server.close(resolve));
  await lepasKunci();
  await pool.end();
});

async function aturKonfig(kunci, nilai) {
  await pool.query('UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = ?', [String(nilai), kunci]);
}
async function denganKonfig(perubahan, fn) {
  try {
    for (const [k, v] of Object.entries(perubahan)) await aturKonfig(k, v);
    await fn();
  } finally {
    for (const k of Object.keys(perubahan)) await aturKonfig(k, konfigAsli[k]);
  }
}

async function akun() {
  const { json } = await daftarPenggunaBaru(baseUrl);
  return { id: json.data.pengguna.id, token: json.data.token };
}
async function panggil(metode, p, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${p}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}
async function unggahBerkas(token, nama, isi, { judul = `Modul ${nama}`, mapel_id = 'biologi' } = {}) {
  const fd = new FormData();
  fd.append('judul', judul);
  fd.append('mapel_id', mapel_id);
  fd.append('berkas', new Blob([isi]), nama);
  const res = await fetch(`${baseUrl}/api/v1/modul`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return { status: res.status, json: await res.json() };
}
const unggahTeks = (token, teks, judul = 'Modul tempel', mapel_id = 'matematika') =>
  panggil('POST', '/modul', token, { judul, mapel_id, teks });
const fixture = (nama) => fs.readFileSync(path.join(FIXTURE, nama));
const jumlahDb = async (sql, nilai) => Number((await pool.query(sql, nilai))[0][0].n);
const rapat = (t) => t.replace(/\s+/g, ' ').trim();

// Bahan modul untuk uji relevansi (3 topik berbeda).
const FISIKA = [
  'Hukum Newton pertama menyatakan bahwa benda diam tetap diam dan benda bergerak tetap bergerak lurus beraturan bila resultan gaya yang bekerja padanya nol. Sifat ini disebut kelembaman atau inersia.',
  'Hukum Newton kedua menyatakan bahwa percepatan benda sebanding dengan resultan gaya dan berbanding terbalik dengan massanya. Rumusnya F sama dengan m dikali a, dengan satuan gaya newton.',
  'Hukum Newton ketiga menyatakan bahwa setiap aksi menimbulkan reaksi yang sama besar dan berlawanan arah. Contohnya dayung yang mendorong air ke belakang sehingga perahu bergerak ke depan.',
  'Gaya gesek selalu melawan arah gerak benda. Gaya gesek statis bekerja saat benda belum bergerak, sedangkan gaya gesek kinetis bekerja saat benda sudah bergerak.',
].map((p) => `${p} ${p}`).join('\n\n'); // ±1.600 karakter → beberapa potongan
const EKONOMI =
  'Inflasi adalah kenaikan harga barang dan jasa secara umum dan terus-menerus. Bank sentral dapat menaikkan suku bunga acuan untuk menekan inflasi, karena pinjaman menjadi lebih mahal dan permintaan berkurang. Deflasi adalah kebalikan dari inflasi.';

// --- dasar -----------------------------------------------------------------------

test('tanpa token → 401 di semua endpoint modul', async () => {
  for (const [m, p] of [['GET', '/modul'], ['GET', '/modul/cari?q=abc'], ['GET', '/modul/x'], ['DELETE', '/modul/x'], ['DELETE', '/modul?semua=ya'], ['POST', '/modul']]) {
    assert.equal((await panggil(m, p, null, m === 'POST' ? {} : undefined)).status, 401, `${m} ${p}`);
  }
});

test('unggah .txt dan .md: tersimpan, teks & potongan terbentuk; daftar tanpa isi; lihat isi lengkap', async () => {
  const a = await akun();
  const txt = await unggahBerkas(a.token, 'inflasi.txt', Buffer.from(EKONOMI), { judul: 'Ekonomi: Inflasi', mapel_id: 'ekonomi' });
  assert.equal(txt.status, 201, JSON.stringify(txt.json));
  assert.equal(txt.json.data.jenis, 'txt');
  assert.equal(txt.json.data.nama_berkas, 'inflasi.txt');
  assert.equal(txt.json.data.jumlah_karakter, [...EKONOMI].length);
  assert.equal(txt.json.data.jumlah_potongan, 1);

  const md = await unggahBerkas(a.token, 'newton.md', Buffer.from(`# Hukum Newton\n\n${FISIKA}`), { judul: 'Fisika: Hukum Newton', mapel_id: 'fisika' });
  assert.equal(md.status, 201, JSON.stringify(md.json));
  assert.equal(md.json.data.jenis, 'md');
  assert.ok(md.json.data.jumlah_potongan >= 2, `potongan ${md.json.data.jumlah_potongan}`);
  const potongan = (await pool.query('SELECT urutan, isi FROM potongan_modul WHERE modul_id = ? ORDER BY urutan', [md.json.data.id]))[0];
  assert.equal(potongan.length, md.json.data.jumlah_potongan);
  for (const p of potongan) assert.ok(p.isi.length <= 1200);

  const daftar = await panggil('GET', '/modul', a.token);
  assert.equal(daftar.status, 200);
  assert.deepEqual(daftar.json.data.map((m) => m.judul).sort(), ['Ekonomi: Inflasi', 'Fisika: Hukum Newton']);
  for (const m of daftar.json.data) assert.ok(!('isi' in m), 'daftar memuat isi lengkap');

  const lihat = await panggil('GET', `/modul/${md.json.data.id}`, a.token);
  assert.equal(lihat.status, 200);
  assert.equal(lihat.json.data.isi, `# Hukum Newton\n\n${FISIKA}`);
  assert.equal(rapat(potongan.map((p) => p.isi).join(' ')), rapat(lihat.json.data.isi));
});

test('tempel teks (JSON): tersimpan sebagai jenis "tempel" tanpa nama berkas', async () => {
  const a = await akun();
  const r = await unggahTeks(a.token, 'Logaritma adalah kebalikan dari perpangkatan.\r\n\r\n\r\n\r\nBasis logaritma harus positif.');
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.deepEqual([r.json.data.jenis, r.json.data.nama_berkas], ['tempel', null]);
  const isi = (await panggil('GET', `/modul/${r.json.data.id}`, a.token)).json.data.isi;
  assert.equal(isi, 'Logaritma adalah kebalikan dari perpangkatan.\n\nBasis logaritma harus positif.', 'teks tidak dirapikan');
  for (const body of [{ judul: '', mapel_id: 'matematika', teks: 'x' }, { judul: 'x', mapel_id: 'astrologi', teks: 'x' }, { judul: 'x', mapel_id: 'matematika', teks: '   ' }]) {
    assert.equal((await panggil('POST', '/modul', a.token, body)).status, 400, JSON.stringify(body));
  }
});

test('PDF berisi teks: teks terekstrak benar', async () => {
  const a = await akun();
  const r = await unggahBerkas(a.token, 'fotosintesis.pdf', fixture('teks.pdf'), { judul: 'Biologi: Fotosintesis' });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.data.jenis, 'pdf');
  const isi = rapat((await panggil('GET', `/modul/${r.json.data.id}`, a.token)).json.data.isi);
  for (const kalimat of [
    'Fotosintesis adalah proses tumbuhan hijau mengubah energi cahaya menjadi energi kimia.',
    'Bahan baku fotosintesis adalah karbon dioksida dan air.',
    'Siklus Calvin berlangsung di stroma',
  ]) {
    assert.ok(isi.includes(kalimat), `tidak terekstrak: ${kalimat}`);
  }
});

test('ditolak dengan pesan jelas: PDF pindai/tanpa teks, PDF terenkripsi, .pdf palsu, .txt biner, ekstensi lain', async () => {
  const a = await akun();
  const KASUS = [
    ['pindai.pdf', fixture('pindai.pdf'), 422, 'PDF_TANPA_TEKS', /pindai atau foto/],
    ['terenkripsi.pdf', fixture('terenkripsi.pdf'), 422, 'PDF_TERENKRIPSI', /dikunci/],
    ['terenkripsi-pemilik.pdf', fixture('terenkripsi-pemilik.pdf'), 422, 'PDF_TERENKRIPSI', /dikunci/],
    ['palsu.pdf', fixture('palsu.pdf'), 415, 'TIPE_BERKAS_DITOLAK', /\.txt, \.md, atau PDF/],
    ['biner.txt', fixture('biner.txt'), 415, 'TIPE_BERKAS_DITOLAK', /\.txt, \.md, atau PDF/],
    ['teks-pdf-dinamai.txt', fixture('teks.pdf'), 415, 'TIPE_BERKAS_DITOLAK', /berisi teks/],
    ['catatan.docx', Buffer.from('teks biasa'), 415, 'TIPE_BERKAS_DITOLAK', /berisi teks/],
  ];
  for (const [nama, isi, status, kode, pesan] of KASUS) {
    const r = await unggahBerkas(a.token, nama, isi);
    assert.equal(r.status, status, `${nama}: ${JSON.stringify(r.json)}`);
    assert.equal(r.json.galat.kode, kode, nama);
    assert.match(r.json.galat.pesan, pesan, nama);
  }
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE pengguna_id = ?', [a.id]), 0, 'ada berkas ditolak yang tersimpan');
});

test('batas default: berkas > 5 MB → 413; modul ke-11 → 409', async () => {
  const a = await akun();
  const besar = Buffer.alloc(Number(konfigAsli.modul_ukuran_maks_byte) + 1, 'a');
  const r = await unggahBerkas(a.token, 'besar.txt', besar);
  assert.equal(r.status, 413);
  assert.equal(r.json.galat.kode, 'BERKAS_TERLALU_BESAR');
  assert.match(r.json.galat.pesan, /maksimal 5 MB/);
  assert.equal(r.json.galat.medan.ukuran_maks_mb, '5', 'app butuh angka batas di medan');

  for (let i = 0; i < Number(konfigAsli.modul_jumlah_maks); i++) {
    assert.equal((await unggahTeks(a.token, `Materi pendek nomor ${i}.`)).status, 201);
  }
  const ke11 = await unggahTeks(a.token, 'Materi kesebelas.');
  assert.equal(ke11.status, 409);
  assert.equal(ke11.json.galat.kode, 'BATAS_MODUL');
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE pengguna_id = ?', [a.id]), Number(konfigAsli.modul_jumlah_maks));
});

test('mengubah batas di konfigurasi langsung berlaku (ukuran, karakter, jumlah) tanpa mengubah kode', async () => {
  const a = await akun();
  await denganKonfig({ modul_ukuran_maks_byte: 1000 }, async () => {
    const r = await unggahBerkas(a.token, 'sedang.txt', Buffer.alloc(1500, 'b'));
    assert.equal(r.status, 413);
    assert.match(r.json.galat.pesan, /0 MB|1 MB|0,0 MB/);
    assert.equal((await unggahTeks(a.token, 'c'.repeat(1500))).status, 413, 'teks tempel juga dibatasi ukurannya');
  });
  await denganKonfig({ modul_karakter_maks: 100 }, async () => {
    const r = await unggahTeks(a.token, 'kata '.repeat(40));
    assert.equal(r.status, 413);
    assert.equal(r.json.galat.kode, 'TEKS_TERLALU_PANJANG');
    assert.match(r.json.galat.pesan, /Maksimal 100 karakter/);
    const pdf = await unggahBerkas(a.token, 'fotosintesis.pdf', fixture('teks.pdf'));
    assert.equal(pdf.json.galat?.kode, 'TEKS_TERLALU_PANJANG', 'batas karakter juga berlaku untuk PDF');
  });
  await denganKonfig({ modul_jumlah_maks: 1 }, async () => {
    assert.equal((await unggahTeks(a.token, 'Modul pertama.')).status, 201);
    assert.equal((await unggahTeks(a.token, 'Modul kedua.')).status, 409);
  });
  assert.equal((await unggahTeks(a.token, 'Modul kedua.')).status, 201, 'batas kembali ke nilai asli');
});

test('batas jumlah tetap tegak saat dua unggahan bersamaan', async () => {
  const a = await akun();
  const maks = Number(konfigAsli.modul_jumlah_maks);
  for (let i = 0; i < maks - 1; i++) await unggahTeks(a.token, `Materi ${i}.`);
  const hasil = await Promise.all([unggahTeks(a.token, 'Bersamaan satu.'), unggahTeks(a.token, 'Bersamaan dua.')]);
  assert.deepEqual(hasil.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE pengguna_id = ?', [a.id]), maks);
});

// --- pencarian & lintas akun ---------------------------------------------------------

test('pencarian mengembalikan potongan yang relevan dari modul sendiri, urut skor', async () => {
  const a = await akun();
  await unggahBerkas(a.token, 'fotosintesis.pdf', fixture('teks.pdf'), { judul: 'Biologi: Fotosintesis', mapel_id: 'biologi' });
  await unggahBerkas(a.token, 'newton.md', Buffer.from(FISIKA), { judul: 'Fisika: Hukum Newton', mapel_id: 'fisika' });
  await unggahBerkas(a.token, 'inflasi.txt', Buffer.from(EKONOMI), { judul: 'Ekonomi: Inflasi', mapel_id: 'ekonomi' });
  const HARAPAN = [
    ['hukum newton percepatan', 'Fisika: Hukum Newton', /percepatan/i],
    ['klorofil cahaya', 'Biologi: Fotosintesis', /klorofil/i],
    ['inflasi suku bunga', 'Ekonomi: Inflasi', /suku bunga/i],
    ['glukosa oksigen', 'Biologi: Fotosintesis', /glukosa/i],
    ['gaya gesek kinetis', 'Fisika: Hukum Newton', /gesek kinetis/i],
  ];
  for (const [q, judul, cocok] of HARAPAN) {
    const { status, json } = await panggil('GET', `/modul/cari?q=${encodeURIComponent(q)}`, a.token);
    assert.equal(status, 200);
    const [teratas] = json.data.hasil;
    assert.ok(teratas, `tidak ada hasil untuk "${q}"`);
    assert.equal(teratas.judul, judul, `"${q}" → ${teratas.judul}`);
    assert.match(teratas.potongan, cocok);
    const skor = json.data.hasil.map((h) => h.skor);
    assert.deepEqual(skor, [...skor].sort((x, y) => y - x), 'tidak urut skor');
  }
  assert.deepEqual((await panggil('GET', '/modul/cari?q=astronomi', a.token)).json.data.hasil, [], 'kata yang tidak ada → kosong');
  assert.equal((await panggil('GET', '/modul/cari?q=ab', a.token)).status, 400, 'kata kunci terlalu pendek');
});

test('lintas akun: B tidak bisa melihat, mencari, atau menghapus modul A; pencarian B tidak pernah memuat potongan A', async () => {
  const a = await akun();
  const b = await akun();
  const ma = (await unggahBerkas(a.token, 'fotosintesis.pdf', fixture('teks.pdf'), { judul: 'Biologi A' })).json.data;
  const mb = (await unggahTeks(b.token, 'Fotosintesis menurut catatan B: klorofil menyerap cahaya.', 'Biologi B', 'biologi')).json.data;

  assert.equal((await panggil('GET', `/modul/${ma.id}`, b.token)).status, 404);
  assert.equal((await panggil('DELETE', `/modul/${ma.id}`, b.token)).status, 404);
  assert.equal((await panggil('GET', `/modul/${ma.id}`, a.token)).status, 200, 'modul A terhapus oleh B');
  assert.deepEqual((await panggil('GET', '/modul', b.token)).json.data.map((m) => m.id), [mb.id]);

  for (const q of ['fotosintesis klorofil', 'reaksi terang tilakoid', 'siklus calvin stroma']) {
    const hasilB = (await panggil('GET', `/modul/cari?q=${encodeURIComponent(q)}`, b.token)).json.data.hasil;
    assert.ok(hasilB.every((h) => h.modul_id === mb.id), `pencarian B memuat potongan lain: ${q}`);
    const hasilA = (await panggil('GET', `/modul/cari?q=${encodeURIComponent(q)}`, a.token)).json.data.hasil;
    assert.ok(hasilA.every((h) => h.modul_id === ma.id), `pencarian A memuat potongan B: ${q}`);
  }
  const hapusSemuaB = await panggil('DELETE', '/modul?semua=ya', b.token);
  assert.equal(hapusSemuaB.json.data.jumlah_dihapus, 1);
  assert.equal((await panggil('GET', `/modul/${ma.id}`, a.token)).status, 200, '"hapus semua" B menyentuh modul A');
});

// --- hapus permanen ---------------------------------------------------------------

test('hapus modul: baris modul & semua potongannya hilang dari basis data; "hapus semua" juga', async () => {
  const a = await akun();
  const satu = (await unggahBerkas(a.token, 'newton.md', Buffer.from(FISIKA), { mapel_id: 'fisika' })).json.data;
  const dua = (await unggahTeks(a.token, EKONOMI)).json.data;
  const tiga = (await unggahTeks(a.token, 'Modul ketiga untuk hapus semua.')).json.data;
  assert.ok((await jumlahDb('SELECT COUNT(*) AS n FROM potongan_modul WHERE modul_id = ?', [satu.id])) >= 2);

  assert.equal((await panggil('DELETE', `/modul/${satu.id}`, a.token)).status, 200);
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE id = ?', [satu.id]), 0);
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM potongan_modul WHERE modul_id = ?', [satu.id]), 0);
  assert.equal((await panggil('GET', `/modul/${satu.id}`, a.token)).status, 404);
  assert.equal((await panggil('DELETE', `/modul/${satu.id}`, a.token)).status, 404, 'hapus kedua kali');

  assert.equal((await panggil('DELETE', '/modul', a.token)).status, 400, 'DELETE /modul tanpa ?semua=ya');
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE pengguna_id = ?', [a.id]), 2);
  const semua = await panggil('DELETE', '/modul?semua=ya', a.token);
  assert.equal(semua.json.data.jumlah_dihapus, 2);
  for (const id of [dua.id, tiga.id]) {
    assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM modul WHERE id = ?', [id]), 0);
    assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM potongan_modul WHERE modul_id = ?', [id]), 0);
  }
  assert.equal(await jumlahDb('SELECT COUNT(*) AS n FROM potongan_modul WHERE pengguna_id = ?', [a.id]), 0);
});

test('hapus permanen juga membersihkan kata modul dari indeks FULLTEXT InnoDB', async (t) => {
  const a = await akun();
  const token = `zqx${acak()}rahasia`.toLowerCase();
  const m = (await unggahTeks(a.token, `Catatan pribadi berisi kata ${token} yang unik.`)).json.data;
  let auxAsli;
  try {
    [[{ v: auxAsli }]] = await pool.query('SELECT @@GLOBAL.innodb_ft_aux_table AS v');
    await pool.query("SET GLOBAL innodb_ft_aux_table = CONCAT(DATABASE(), '/potongan_modul')");
  } catch (galat) {
    t.skip(`tidak bisa membaca indeks FULLTEXT (${galat.code}); periksa manual`);
    return;
  }
  const adaDiIndeks = async () =>
    (await jumlahDb('SELECT COUNT(*) AS n FROM information_schema.INNODB_FT_INDEX_CACHE WHERE WORD = ?', [token])) +
    (await jumlahDb('SELECT COUNT(*) AS n FROM information_schema.INNODB_FT_INDEX_TABLE WHERE WORD = ?', [token]));
  try {
    assert.ok((await adaDiIndeks()) > 0, 'kata uji tidak terlihat di indeks (metode cek tidak sah)');
    assert.equal((await panggil('DELETE', `/modul/${m.id}`, a.token)).status, 200);
    t.diagnostic(`sesudah DELETE, sebelum dirapikan: kata uji masih ${await adaDiIndeks()}x di indeks`);
    await rapikanIndeksSekarang();
    assert.equal(await adaDiIndeks(), 0, 'kata modul yang dihapus masih ada di indeks FULLTEXT');
  } finally {
    if (auxAsli) await pool.query('SET GLOBAL innodb_ft_aux_table = ?', [auxAsli]);
    else await pool.query('SET GLOBAL innodb_ft_aux_table = DEFAULT');
  }
});

// --- penjaga lain ---------------------------------------------------------------------

test('berkas asli tidak tersimpan di disk server setelah ekstraksi', async () => {
  const a = await akun();
  const penanda = `PENANDA-BERKAS-ASLI-${acak()}-${Date.now()}`;
  const mulai = Date.now() - 1000;
  assert.equal((await unggahBerkas(a.token, 'penanda.txt', Buffer.from(`Materi uji. ${penanda}`))).status, 201);
  const ditemukan = [];
  const periksa = (dir, kedalaman) => {
    let entri = [];
    try {
      entri = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entri) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (kedalaman > 0 && !['node_modules', '.git'].includes(e.name)) periksa(p, kedalaman - 1);
        continue;
      }
      try {
        const st = fs.statSync(p);
        if (st.mtimeMs >= mulai && st.size < 20 * 1024 * 1024 && fs.readFileSync(p).includes(penanda)) ditemukan.push(p);
      } catch {
        /* berkas sementara milik proses lain */
      }
    }
  };
  periksa(os.tmpdir(), 1);
  periksa(path.join(__dirname, '..'), 4);
  assert.deepEqual(ditemukan, [], 'isi berkas asli ditemukan di disk');
});

test('kunci modul_* tidak ikut terkirim di endpoint konfigurasi publik', async () => {
  const { status, json } = await panggil('GET', '/konfigurasi/levelin');
  // LANJUT_075b: isi jawaban ikut di pesan supaya kegagalan sesekali (pernah sekali di
  // run penuh 074) bisa dibaca penyebabnya. Asersinya tidak berubah.
  assert.equal(status, 200, `status ${status}: ${JSON.stringify(json)}`);
  assert.equal(Object.keys(json.data).some((k) => k.startsWith('modul')), false);
});

test('kode modul tidak memanggil layanan luar; worker PDF mematikan modul jaringan', () => {
  const dir = path.join(__dirname, '../src/modul/modul');
  for (const f of fs.readdirSync(dir)) {
    const kode = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(kode, /https?:\/\//, `${f} memuat URL`);
    assert.doesNotMatch(kode, /\bfetch\(|axios|openai|anthropic|embedding/i, `${f} memanggil layanan`);
  }
  const worker = fs.readFileSync(path.join(dir, 'ekstrak-pdf.worker.mjs'), 'utf8');
  for (const pola of ['net.connect = tolak', 'tls.connect = tolak', 'http.request = tolak', 'https.request = tolak', 'dns.lookup = tolak', 'globalThis.fetch =', 'isEvalSupported: false', "startsWith('@napi-rs/canvas')"]) {
    assert.ok(worker.includes(pola), pola);
  }
});

test('worker PDF tidak memuat modul native @napi-rs/canvas (penyebab server crash)', () => {
  // pdf.js memuat @napi-rs/canvas tanpa syarat di Node. Di worker_thread, itu
  // membuat SELURUH proses server kadang crash (segfault, exit 139) saat worker
  // dihentikan dan worker berikutnya dimulai, terlihat di E2E LANJUT_049.
  // Kait --require di worker mencatat setiap upaya memuatnya; dijalankan di
  // proses anak supaya crash tidak menjatuhkan proses tes.
  const { spawnSync } = require('child_process');
  const kait = path.join(os.tmpdir(), `kait-kanvas-${acak()}.cjs`);
  fs.writeFileSync(kait, `
    const Module = require('module');
    const { parentPort } = require('worker_threads');
    const asli = Module._load;
    Module._load = function (p, ...s) {
      if (String(p).startsWith('@napi-rs/canvas')) parentPort.postMessage({ kanvas: String(p) });
      return asli.call(this, p, ...s);
    };`);
  const kode = `
    const fs = require('fs'), path = require('path');
    const { Worker } = require('worker_threads');
    const w = new Worker(path.resolve('src/modul/modul/ekstrak-pdf.worker.mjs'), {
      workerData: { data: new Uint8Array(fs.readFileSync(${JSON.stringify(path.join(FIXTURE, 'teks.pdf'))})), batasKarakter: 200000 },
      execArgv: ['--require', ${JSON.stringify(kait)}], stdout: true, stderr: true,
    });
    const kanvas = [];
    w.on('message', (m) => {
      if (m.kanvas) return kanvas.push(m.kanvas);
      console.log(JSON.stringify({ kanvas, ok: m.ok, teks: m.teks }));
      w.terminate();
    });`;
  try {
    const hasil = spawnSync(process.execPath, ['-e', kode], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 60000 });
    assert.equal(hasil.status, 0, `proses anak keluar dengan kode ${hasil.status} ${hasil.stderr}`);
    const { kanvas, ok, teks } = JSON.parse(hasil.stdout);
    assert.deepEqual(kanvas, [], 'worker mencoba memuat modul native kanvas');
    assert.equal(ok, true);
    assert.match(teks, /Fotosintesis adalah proses tumbuhan hijau/, 'teks tetap terekstrak tanpa kanvas');
  } finally {
    fs.rmSync(kait, { force: true });
  }
});
