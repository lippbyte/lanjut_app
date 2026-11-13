// LANJUT_023 seri v2: sisi aplikasi Jalur & Tujuan. Pola sama dengan portofolio-app.test.js: modul
// murni dites langsung, dan susunan layar dites dari sumbernya.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { buatTujuanSkema, BATAS_TUJUAN } = require('../src/modul/tujuan/tujuan.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const fitur = muatModulApp('lib/fiturApp');
const beranda = muatModulApp('lib/beranda');
const jt = muatModulApp('lib/jalurTujuan');

const RUTE = ['jalur-tujuan.tsx', 'jalur-tujuan-tulis.tsx'];

function aturanBlokir(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_JALUR_TUJUAN;
  if (nilai !== undefined) env.EXPO_PUBLIC_JALUR_TUJUAN = nilai;
  const skrip = "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
  const baris = execFileSync(process.execPath, ['-e', skrip], { cwd: AKAR_APP, env, encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop();
  return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
}
const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));

describe('Saklar build: mati berarti tidak ada jejak, APK lama tidak berubah', () => {
  test('jalurTujuanAktif hanya menyala untuk extra.jalurTujuan === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { jalurTujuan: false }, { jalurTujuan: '1' }, { jalurTujuan: 1 }]) {
      assert.equal(fitur.jalurTujuanAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.jalurTujuanAktif({ jalurTujuan: true }), true);
  });

  test('Bawaan mati di app.config; tidak ada profil eas.json, Dockerfile, atau docker-compose yang menyalakan', () => {
    assert.ok(baca('app.config.ts').includes("jalurTujuan: process.env.EXPO_PUBLIC_JALUR_TUJUAN === '1',"));
    for (const berkas of ['eas.json', 'Dockerfile', 'docker-compose.yml', 'docker-compose.dev.yml']) {
      assert.ok(!baca(berkas).includes('JALUR_TUJUAN'), berkas);
    }
  });

  test('Saat mati, berkas rute tidak masuk bundel, jadi rutenya tidak terdaftar', () => {
    for (const nilai of [undefined, '0', 'true']) {
      const aturan = aturanBlokir(nilai);
      for (const nama of RUTE) {
        assert.ok(terblokir(aturan, `C:\\repo\\app\\(app)\\${nama}`), `${nilai}: ${nama} (Windows)`);
        assert.ok(terblokir(aturan, `/repo/app/(app)/${nama}`), `${nilai}: ${nama} (Linux)`);
      }
      assert.ok(!terblokir(aturan, '/repo/app/(app)/linimasa.tsx'));
      assert.ok(!terblokir(aturan, '/repo/app/(app)/jenjang-saya.tsx'));
    }
  });

  test('Saat menyala, berkas rute masuk bundel', () => {
    const aturan = aturanBlokir('1');
    for (const nama of RUTE) assert.ok(!terblokir(aturan, `/repo/app/(app)/${nama}`), nama);
  });

  test('Daftar berkas rute lengkap, dan setiap rute punya lapis kedua', () => {
    const ada = fs.readdirSync(path.join(AKAR_APP, 'app', '(app)')).filter((n) => /jalur-tujuan/i.test(n));
    assert.deepEqual(ada.sort(), [...RUTE].sort());
    for (const nama of RUTE) {
      assert.match(baca('app', '(app)', nama), /if \(!jalurTujuanAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/, nama);
    }
  });

  test('Kartu Beranda hanya ada bila diminta, tepat sesudah grid, dan urutan lama tidak berubah', () => {
    for (const kelas of ['8', '11', '12']) {
      const dasar = { kelas, tampilMulaiDariSini: false, tampilPortofolio: true };
      assert.ok(!beranda.urutanBeranda(dasar).includes('jalur_tujuan'));
      const menyala = beranda.urutanBeranda({ ...dasar, tampilJalurTujuan: true });
      assert.equal(menyala.indexOf('jalur_tujuan'), menyala.indexOf('grid') + 1);
      assert.deepEqual(menyala.filter((b) => b !== 'jalur_tujuan'), beranda.urutanBeranda(dasar));
    }
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const JALUR_TUJUAN = jalurTujuanAktif(Constants.expoConfig?.extra);'));
    assert.ok(layar.includes('tampilJalurTujuan: JALUR_TUJUAN,'));
  });

  test('Judul bilah atas tunduk pada saklar', () => {
    assert.match(baca('components', 'layout', 'AppShell.tsx'), /\.\.\.\(jalurTujuanAktif\(Constants\.expoConfig\?\.extra\) \? \{ '\/jalur-tujuan'/);
  });

  test('Layar dan permintaan jaringan hanya terjangkau dari berkas rute', () => {
    const pengimpor = [];
    const jelajah = (folder) => {
      for (const e of fs.readdirSync(path.join(AKAR_APP, folder), { withFileTypes: true })) {
        const rel = path.join(folder, e.name);
        if (e.isDirectory()) jelajah(rel);
        else if (/\.tsx?$/.test(e.name) && /from '[^']*(JalurTujuanScreens|useJalurTujuan)'/.test(baca(rel))) pengimpor.push(rel.replace(/\\/g, '/'));
      }
    };
    for (const f of ['app', 'components', 'hooks', 'providers', 'api', 'lib']) jelajah(f);
    assert.deepEqual(pengimpor.sort(), ['app/(app)/jalur-tujuan-tulis.tsx', 'app/(app)/jalur-tujuan.tsx', 'components/screens/JalurTujuanScreens.tsx']);
  });

  test('Data Jalur & Tujuan ikut dibuang saat sesi berganti', () => {
    assert.match(baca('providers', 'AuthProvider.tsx'), /const KUNCI_DATA_AKUN = \[.*\['jalur_tujuan'\].*\] as const;/);
    assert.ok(baca('hooks', 'useJalurTujuan.ts').includes("const KUNCI = ['jalur_tujuan'] as const;"));
  });

  test('Tidak ada tombol hapus jalur atau tujuan, dan formulir hanya punya satu tombol', () => {
    const layar = baca('components', 'screens', 'JalurTujuanScreens.tsx');
    assert.ok(!/method: 'DELETE'/.test(baca('hooks', 'useJalurTujuan.ts')));
    assert.ok(!/hapus/i.test(Object.values(jt.TEKS_JALUR_TUJUAN).join(' ')));
    const form = /function FormTujuan[\s\S]*?\n\}\n/.exec(layar)[0];
    assert.equal(form.match(/<Tombol /g).length, 1);
  });
});

describe('Aturan di aplikasi', () => {
  const jalur = [
    { id: 'melanjutkan', nama: 'Melanjutkan', deskripsi_singkat: 'a', status_teks: 'draf', urutan: 1 },
    { id: 'bekerja', nama: 'Bekerja', deskripsi_singkat: 'b', status_teks: 'draf', urutan: 2 },
  ];
  const pilihan = (id, jalurId, status) => ({ id, jalur_minat_id: jalurId, status, mulai_pada: 'x', berakhir_pada: null, diubah_pada: 'x' });

  test('susunJalur: babak aktif dan jumlah babak per jalur', () => {
    const hasil = jt.susunJalur(jalur, [pilihan('1', 'bekerja', 'dijeda'), pilihan('2', 'bekerja', 'aktif'), pilihan('3', 'melanjutkan', 'selesai')]);
    assert.deepEqual(hasil.map((b) => [b.jalur.id, b.aktif?.id ?? null, b.jumlahBabak]), [['melanjutkan', null, 1], ['bekerja', '2', 2]]);
  });

  test('badanTujuan: tujuan baru mengirim semua medan; versi baru hanya yang berubah, null bila tidak ada', () => {
    const isi = { judul: ' Magang ', uraian: '', target: '2027-06-30', jalur: 'bekerja' };
    assert.deepEqual(jt.badanTujuan(isi), { judul: 'Magang', uraian: null, target_pada: '2027-06-30', jalur_minat_id: 'bekerja' });
    const awal = { id: 'x', judul: 'Magang', uraian: null, target_pada: '2027-06-30', jalur_minat_id: 'bekerja', status: 'aktif' };
    assert.equal(jt.badanTujuan(isi, awal), null);
    assert.deepEqual(jt.badanTujuan({ ...isi, judul: 'Magang resmi' }, awal), { judul: 'Magang resmi' });
    assert.deepEqual(jt.badanTujuan({ ...isi, jalur: null, target: '' }, awal), { target_pada: null, jalur_minat_id: null });
  });

  test('Isian yang diterima aplikasi selalu diterima server, dan batasnya sama', () => {
    assert.deepEqual({ ...jt.BATAS_TUJUAN }, BATAS_TUJUAN);
    const dasar = { judul: 'x', uraian: '', target: '', jalur: null };
    for (const isi of [{}, { target: '2027-02-28' }, { uraian: 'u'.repeat(2000) }, { judul: 'j'.repeat(200) }]) {
      const gabung = { ...dasar, ...isi };
      assert.deepEqual(jt.periksaIsianTujuan(gabung), {}, JSON.stringify(isi));
      assert.ok(buatTujuanSkema.safeParse(jt.badanTujuan(gabung)).success, JSON.stringify(isi));
    }
    for (const isi of [{ judul: '  ' }, { judul: 'j'.repeat(201) }, { target: '2027-02-30' }, { target: '30-06-2027' }, { uraian: 'u'.repeat(2001) }]) {
      assert.notDeepEqual(jt.periksaIsianTujuan({ ...dasar, ...isi }), {}, JSON.stringify(isi));
    }
  });

  test('keadaanData: 404 berarti saklar server mati', () => {
    assert.equal(jt.keadaanData({ isPending: false, galat: { status: 404 } }), 'fitur_mati');
    assert.equal(jt.keadaanData({ isPending: false, galat: { status: 403, kode: 'AI_BELUM_DIIZINKAN' } }), 'perlu_kebijakan');
    assert.equal(jt.keadaanData({ isPending: false, galat: { kode: 'JARINGAN' } }), 'jaringan');
    assert.equal(jt.keadaanData({ isPending: false, galat: { status: 500 } }), 'server');
    assert.equal(jt.keadaanData({ isPending: true }), 'memuat');
    assert.equal(jt.keadaanData({ isPending: false }), 'siap');
  });

  test('Setiap peristiwa dari server punya kalimat', () => {
    for (const jenis of ['jalur_dipilih', 'jalur_dijeda', 'jalur_selesai', 'jalur_ditinggalkan', 'tujuan_dibuat', 'tujuan_diperbarui', 'tujuan_tercapai', 'tujuan_ditinggalkan']) {
      assert.ok(jt.teksPeristiwa({ jenis, pada: '', jalur_minat_id: 'bekerja', judul: 'J' }, () => 'Bekerja').length > 0, jenis);
    }
    assert.equal(jt.teksPeristiwa({ jenis: 'tak_dikenal', pada: '', jalur_minat_id: null }, () => ''), '');
  });

  test('K37: tanpa jalur yang terkirim, kalimat tetap utuh dan layar memberi tahu', () => {
    assert.equal(jt.teksPeristiwa({ jenis: 'jalur_dipilih', pada: '', jalur_minat_id: 'melanjutkan' }, () => ''), 'Memilih jalur');
    assert.equal(jt.teksPeristiwa({ jenis: 'jalur_dijeda', pada: '', jalur_minat_id: 'bekerja' }, () => 'Bekerja'), 'Menjeda jalur Bekerja');
    const layar = baca('components', 'screens', 'JalurTujuanScreens.tsx');
    assert.match(layar, /\{jalur\.length === 0 \? \(\s*<Text style=\{s\.keterangan\}>\{T\.jalurBelumTersedia\}<\/Text>/);
  });

  test('Setiap kode galat server punya pesan sendiri', () => {
    for (const kode of ['JALUR_SUDAH_DIPILIH', 'PILIHAN_SUDAH_BERAKHIR', 'TUJUAN_BUKAN_TERKINI']) {
      assert.notEqual(jt.pesanGalatJalurTujuan(kode), jt.GALAT_UMUM_JALUR_TUJUAN, kode);
    }
  });
});

describe('Teks baru berstatus draf', () => {
  const draf = baca('docs', 'draf-teks-jalur-tujuan.md');

  test('Kode dan dokumen menandai teksnya draf, belum disetujui', () => {
    assert.match(draf, /draf, menunggu persetujuan Khalifa/);
    for (const berkas of [['lib', 'jalurTujuan.ts'], ['components', 'screens', 'JalurTujuanScreens.tsx']]) {
      assert.match(baca(...berkas), /DRAF, belum disetujui/, berkas.join('/'));
    }
    assert.match(baca('lib', 'beranda.ts'), /LANJUT_023 \(DRAF, belum disetujui[^\n]*\n\s*export const KARTU_JALUR_TUJUAN/);
  });

  test('Setiap teks layar tercatat di dokumen draf', () => {
    const semua = [
      ...Object.values(jt.TEKS_JALUR_TUJUAN),
      ...Object.values(jt.LABEL_STATUS_PILIHAN),
      ...Object.values(jt.LABEL_STATUS_TUJUAN),
      ...Object.values(jt.GALAT_ISIAN_TUJUAN),
      jt.GALAT_UMUM_JALUR_TUJUAN,
      beranda.KARTU_JALUR_TUJUAN.judul,
      beranda.KARTU_JALUR_TUJUAN.keterangan,
      'Tulis Tujuan',
    ];
    for (const teks of semua) assert.ok(draf.includes(teks), teks);
    for (const kode of ['JALUR_SUDAH_DIPILIH', 'PILIHAN_SUDAH_BERAKHIR', 'TUJUAN_BUKAN_TERKINI', 'AI_BELUM_DIIZINKAN', 'TIDAK_DITEMUKAN', 'VALIDASI_GAGAL', 'TERLALU_SERING']) {
      assert.ok(draf.includes(jt.pesanGalatJalurTujuan(kode)), kode);
    }
    const konten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-konten', 'jalur-minat.json'), 'utf8'));
    for (const j of konten.data) {
      assert.equal(j.status_teks, 'draf', `${j.id}: teks jalur belum disetujui`);
      assert.ok(draf.includes(j.nama) && draf.includes(j.deskripsi_singkat), j.id);
    }
  });

  test('Belum masuk persetujuan rilis, dan tidak memakai nama "Jalur Saya"', () => {
    const rilis = baca('docs', 'persetujuan-teks-rilis.json');
    for (const teks of [jt.TEKS_JALUR_TUJUAN.judul, jt.TEKS_JALUR_TUJUAN.pengantar, beranda.KARTU_JALUR_TUJUAN.keterangan]) {
      assert.ok(!rilis.includes(teks), teks);
    }
    const semua = [...Object.values(jt.TEKS_JALUR_TUJUAN), beranda.KARTU_JALUR_TUJUAN.judul, beranda.KARTU_JALUR_TUJUAN.keterangan].join(' ');
    assert.doesNotMatch(semua, /Jalur Saya/);
  });
});
