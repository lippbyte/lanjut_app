// Uji murni materi (LANJUT_055), TANPA basis data dan TANPA jaringan:
// pengenal jenis pesan, pemotong imbuhan, penyaring relevansi tahap 1,
// pembacaan anotasi url_citation, perapian balasan (sitasi), dan blok data.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const materi = require('../src/modul/ngobrol/materi');
const { bacaAnotasi } = require('../src/modul/ngobrol/penyedia-ai');
const { rapikanBalasan, susunPermintaan, susunPermintaanWeb, pengaturanMateri } = require('../src/modul/ngobrol/ngobrol.layanan');

after(() => require('../src/db/koneksi').end());

test('jenis pesan: materi, jalur masuk, dan obrolan', () => {
  const kasus = {
    'jelaskan hukum newton kedua': ['materi', null],
    'apa hasil fotosintesis?': ['materi', null],
    'kenapa perahu bisa maju saat didayung?': ['materi', null],
    'jelasin hukum newton fisika dong': ['materi', 'fisika'],
    'apa itu energi di biologi?': ['materi', 'biologi'],
    'Berapa kuota SNBP fisika?': ['jalur_masuk', null],
    'kapan pendaftaran snbt?': ['jalur_masuk', null],
    'halo, apa kabar?': ['obrolan', null],
    'Jurusan apa yang cocok buat aku?': ['obrolan', null],
    'Kamu manusia ya? Jujur deh.': ['obrolan', null],
    'oke makasih ya': ['obrolan', null],
  };
  for (const [teks, [jenis, mapel]] of Object.entries(kasus)) {
    const j = materi.jenisPesan(teks);
    assert.equal(j.jenis, jenis, teks);
    assert.equal(j.mapelId, mapel, teks);
  }
});

test('pemotong imbuhan: berfotosintesis, didayung, kekekalan, kenaikan, menyerap, percepatan', () => {
  const harus = { berfotosintesis: 'fotosintesis', didayung: 'dayung', kekekalan: 'kekal', kenaikan: 'naik', menyerap: 'serap', percepatan: 'cepat', pembelahan: 'belah', memukul: 'pukul', dijelaskan: 'jelas' };
  for (const [kata, dasar] of Object.entries(harus)) assert.ok(materi.bentuk(kata).has(dasar), `${kata} → ${dasar}: ${[...materi.bentuk(kata)]}`);
  assert.equal(materi.kataSama(['berfotosintesis', 'tumbuhan'], 'Fotosintesis adalah proses tumbuhan hijau'), 2);
  assert.equal(materi.kataSama(['naik', 'harga'], 'kenaikan harga barang'), 2);
});

test('penyaring tahap 1: butuh skor DAN kata sama; maksimal sesuai batas', () => {
  const kandidat = [
    { judul: 'Fisika', isi: 'Hukum Newton tentang gaya dan percepatan', skor: 3.2 },
    { judul: 'Biologi', isi: 'Energi cahaya diubah menjadi energi kimia', skor: 1.5 },
    { judul: 'Lemah', isi: 'Hukum dan energi kekal', skor: 0.05 },
  ];
  const kata = materi.kataKunci('hukum kekekalan energi');
  assert.deepEqual(materi.saring(kandidat, kata, { skorMin: 0.1, kataMin: 2, maks: 3 }), [], 'kata sama hanya 1, atau skor di bawah ambang');
  const newton = materi.saring(kandidat, materi.kataKunci('hukum newton percepatan'), { skorMin: 0.1, kataMin: 2, maks: 3 });
  assert.deepEqual(newton.map((p) => p.judul), ['Fisika']);
  const satuKata = materi.saring(kandidat, materi.kataKunci('apa itu energi?'), { skorMin: 0.1, kataMin: 2, maks: 1 });
  assert.deepEqual(satuKata.map((p) => p.judul), ['Biologi'], 'pertanyaan 1 kata kunci cukup 1 kata sama; maks 1');
});

test('LANJUT_057: pertanyaan satu kata bermakna — syarat kata sama = min(2, jumlah kata kunci); kata tanpa tanda tanya = obrolan', () => {
  // [pesan, jenis, kata kunci, syarat kata sama]
  const kasus = [
    ['fotosintesis', 'obrolan', ['fotosintesis'], 1],
    ['apa itu fotosintesis', 'materi', ['fotosintesis'], 1],
    ['jelaskan inflasi', 'materi', ['inflasi'], 1],
    ['newton', 'obrolan', ['newton'], 1],
    ['energi', 'obrolan', ['energi'], 1],
    ['apa itu hukum newton', 'materi', ['hukum', 'newton'], 2],
    ['newton?', 'materi', ['newton'], 1],
    ['fotosintesis?', 'materi', ['fotosintesis'], 1],
  ];
  for (const [teks, jenis, kata, syarat] of kasus) {
    const j = materi.jenisPesan(teks);
    assert.equal(j.jenis, jenis, teks);
    assert.deepEqual(j.kata, kata, teks);
    assert.equal(Math.min(2, j.kata.length), syarat, teks);
  }
  // Satu kata kunci: cukup satu kata sama, juga bila katanya hanya muncul sekali di potongan.
  const potongan = [{ judul: 'Bio', isi: 'Fotosintesis adalah proses tumbuhan hijau mengubah energi cahaya.', skor: 1.2 }];
  assert.deepEqual(materi.saring(potongan, ['fotosintesis'], { skorMin: 0.1, kataMin: 2, maks: 3 }).map((p) => p.judul), ['Bio']);
});

test('anotasi: hanya url_citation dengan alamat http(s) yang sah; tanpa duplikat', () => {
  const pilihan = {
    message: {
      annotations: [
        { type: 'url_citation', url_citation: { url: 'https://a.contoh/1', title: 'A', content: 'isi a' } },
        { type: 'url_citation', url_citation: { url: 'https://a.contoh/1', title: 'A lagi' } },
        { type: 'url_citation', url_citation: { url: 'javascript:alert(1)', title: 'jahat' } },
        { type: 'file', file: { name: 'x' } },
        { type: 'url_citation', url_citation: { url: 'http://b.contoh/2' } },
      ],
    },
  };
  assert.deepEqual(bacaAnotasi(pilihan), [
    { url: 'https://a.contoh/1', judul: 'A', cuplikan: 'isi a' },
    { url: 'http://b.contoh/2', judul: 'b.contoh', cuplikan: '' },
  ]);
  assert.deepEqual(bacaAnotasi({ message: {} }), []);
});

test('rapikan balasan: alamat di luar anotasi dibuang, label tak dikenal dibuang, sumber hanya yang dipakai', () => {
  const potongan = [{ label: 'M1', judul: 'Biologi: Fotosintesis' }, { label: 'M2', judul: 'Tak dipakai' }];
  const web = [
    { label: 'W1', judul: 'Sumber A', url: 'https://a.contoh/1' },
    { label: 'W2', judul: 'Sumber B', url: 'https://b.contoh/2' },
  ];
  const r = rapikanBalasan('Kata modul [M1] dan web [W1]. Lihat https://karangan.contoh/x, [teks](https://palsu.contoh) www.palsu.contoh dan https://a.contoh/1. [W7] [M9]', { potongan, web });
  assert.doesNotMatch(r.teks, /karangan|palsu|\[W7\]|\[M9\]/);
  assert.match(r.teks, /https:\/\/a\.contoh\/1/, 'alamat dari anotasi boleh tetap');
  assert.match(r.teks, /\bteks\b/);
  assert.deepEqual(r.sumber, { modul: [{ label: 'M1', judul: 'Biologi: Fotosintesis' }], web: [{ label: 'W1', judul: 'Sumber A', url: 'https://a.contoh/1' }] });
  assert.deepEqual(rapikanBalasan('Tanpa sumber.', {}).sumber, { modul: [], web: [] });
});

test('LANJUT_057: kata pengantar yang menggantung setelah tautan karangan dibuang ikut dibuang', () => {
  const web = [{ label: 'W1', judul: 'A', url: 'https://sumber.contoh/a' }];
  const potongan = [{ label: 'M1', judul: 'Bio' }];
  const kasus = [
    ['Fotosintesis menghasilkan oksigen [W1]. Lihat juga https://karangan.example/a.', 'Fotosintesis menghasilkan oksigen [W1].'],
    ['Fotosintesis menghasilkan oksigen [M1]. Sumber: https://karangan.example/a', 'Fotosintesis menghasilkan oksigen [M1].'],
    ['Info lengkapnya ada di https://karangan.example/a. Semangat belajar!', 'Semangat belajar!'],
    ['Oke. Untuk lebih lanjut, kunjungi [situs ini](https://karangan.example/x).', 'Oke.'],
    ['Oke. Baca juga https://karangan.example/a dan https://karangan.example/b.', 'Oke.'],
    ['Fotosintesis butuh cahaya (lihat https://karangan.example/a). Klorofil menyerap cahaya [W7].', 'Fotosintesis butuh cahaya. Klorofil menyerap cahaya.'],
    ['Rumus F = m × a [M1] bisa kamu cek di https://karangan.example/x dan modulmu.', 'Rumus F = m × a [M1] bisa kamu cek di modulmu.'],
    ['Baca juga https://karangan.example/palsu dan [contoh](https://karangan.example/md) serta [W9].', 'Baca juga contoh.'],
    // daftar: butir yang habis dibuang hilang; judulnya ikut hilang bila daftarnya habis
    ['Ringkasnya begitu.\n\nReferensi:\n- https://karangan.example/a\n- https://karangan.example/b', 'Ringkasnya begitu.'],
    ['Ringkasnya begitu.\n\nSumber:\n- https://karangan.example/a\n- https://sumber.contoh/a', 'Ringkasnya begitu.\n\nSumber:\n- https://sumber.contoh/a'],
    ['- Pelajari dulu klorofil.\n- Kunjungi https://karangan.example/a\n- Kerjakan latihan di modulmu.', '- Pelajari dulu klorofil.\n- Kerjakan latihan di modulmu.'],
    // tautan dari anotasi dan kalimat tanpa tautan tidak disentuh
    ['Lihat juga https://sumber.contoh/a.', 'Lihat juga https://sumber.contoh/a.'],
    ['Lihat juga catatanmu.\n\nSumber: modul kelas 11.', 'Lihat juga catatanmu.\n\nSumber: modul kelas 11.'],
  ];
  for (const [masuk, keluar] of kasus) assert.equal(rapikanBalasan(masuk, { potongan, web }).teks, keluar, masuk);
  // Balasan yang seluruhnya pengantar tautan tidak dikosongkan (teks kosong memicu teks cadangan tanda bahaya).
  assert.equal(rapikanBalasan('Baca juga https://karangan.example/a.', { potongan, web }).teks, 'Baca juga.');
  assert.ok(!rapikanBalasan('Lihat juga \u0000 ini.', {}).teks.includes('\u0000'), 'penanda dari model dibuang');
});

test('susun permintaan: potongan & web disamarkan dan berlabel di blok data; permintaan web hanya pertanyaan', () => {
  const { pesan } = susunPermintaan({
    profil: { kelas: '12' },
    namaProdi: null,
    riwayat: [{ peran: 'pengguna', teks: 'jelaskan fotosintesis' }],
    materi: {
      statusArsip: 'ada',
      potongan: [{ label: 'M1', judul: 'Bio', isi: 'Hubungi 081200001111. Fotosintesis ...' }],
      web: [{ label: 'W1', judul: 'A', url: 'https://a.contoh', cuplikan: 'surel x@contoh.invalid' }],
      ringkasanWeb: 'ringkas',
    },
  });
  assert.deepEqual(pesan.map((m) => m.role), ['system', 'user']);
  const data = pesan[1].content;
  assert.ok(data.includes('STATUS ARSIP BELAJAR: ada potongan modul'));
  assert.ok(!data.includes('081200001111') && !data.includes('x@contoh.invalid'));
  assert.ok(!data.includes('https://a.contoh'), 'alamat web tidak dikirim ke model (daftar sumber dibuat server)');
  assert.equal(data.split('\n').filter((b) => b === 'PESAN TERBARU SISWA (JSON):').length, 1);
  assert.deepEqual(susunPermintaanWeb('HP-ku 081200001111, apa itu fotosintesis?')[1], { role: 'user', content: 'HP-ku [disamarkan], apa itu fotosintesis?' });
});

test('pengaturan materi: nilai tidak sah mematikan fitur (gagal-tertutup)', () => {
  const sah = { ai_modul_aktif: '1', ai_modul_potongan_maks: '3', ai_modul_skor_min: '0.1', ai_modul_kata_min: '2', ai_web_aktif: '1', ai_web_batas_harian: '10', ai_web_hasil_maks: '3', ai_web_mesin: '' };
  assert.deepEqual(pengaturanMateri(sah), {
    modul: { aktif: true, maks: 3, skorMin: 0.1, kataMin: 2 },
    web: { aktif: true, batasHarian: 10, hasilMaks: 3, mesin: '' },
  });
  assert.equal(pengaturanMateri({ ...sah, ai_modul_potongan_maks: '50' }).modul.aktif, false);
  assert.equal(pengaturanMateri({ ...sah, ai_web_hasil_maks: 'banyak' }).web.aktif, false);
  assert.equal(pengaturanMateri({ ...sah, ai_web_aktif: 'ya' }).web.aktif, false);
  assert.equal(pengaturanMateri({}).web.aktif, false);
});

test('LANJUT_057: ai_web_mesin — kosong (bawaan) atau exa; nilai lain atau kunci hilang mematikan web', () => {
  const sah = { ai_web_aktif: '1', ai_web_batas_harian: '10', ai_web_hasil_maks: '3' };
  assert.deepEqual(pengaturanMateri({ ...sah, ai_web_mesin: '' }).web, { aktif: true, batasHarian: 10, hasilMaks: 3, mesin: '' });
  assert.deepEqual(pengaturanMateri({ ...sah, ai_web_mesin: 'exa' }).web, { aktif: true, batasHarian: 10, hasilMaks: 3, mesin: 'exa' });
  assert.equal(pengaturanMateri({ ...sah, ai_web_mesin: ' exa ' }).web.mesin, 'exa', 'spasi di tepi diabaikan');
  for (const salah of ['EXA', 'native', 'bing', 'exa,native', 'null', undefined, null]) {
    const w = pengaturanMateri({ ...sah, ai_web_mesin: salah }).web;
    assert.equal(w.aktif, false, String(salah));
    assert.equal(w.mesin, null, String(salah));
  }
});
