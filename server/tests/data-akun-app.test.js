// LANJUT_009 seri v2: sisi aplikasi unduh data dan hapus akun. Pola layar lain: modul murni dites
// langsung, dan susunan layar dites dari sumbernya.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');
const { PENEGASAN_HAPUS_AKUN } = require('../src/modul/data-pengguna/data-pengguna.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const fitur = muatModulApp('lib/fiturApp');
const dataAkun = muatModulApp('lib/dataAkun');

describe('Saklar build: layar tertutup sampai teks disetujui', () => {
  test('kelolaDataAkunAktif hanya menyala untuk extra.kelolaDataAkun === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { kelolaDataAkun: false }, { kelolaDataAkun: '1' }, { kelolaDataAkun: 1 }]) {
      assert.equal(fitur.kelolaDataAkunAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.kelolaDataAkunAktif({ kelolaDataAkun: true }), true);
  });

  test('Bawaan mati di app.config, Dockerfile, dan docker-compose; eas.json tidak menyalakan', () => {
    assert.ok(baca('app.config.ts').includes("kelolaDataAkun: process.env.EXPO_PUBLIC_KELOLA_DATA_AKUN === '1',"));
    assert.ok(baca('Dockerfile').includes('ARG EXPO_PUBLIC_KELOLA_DATA_AKUN=0'));
    assert.ok(baca('docker-compose.yml').includes('EXPO_PUBLIC_KELOLA_DATA_AKUN: ${EXPO_PUBLIC_KELOLA_DATA_AKUN:-0}'));
    assert.ok(!baca('eas.json').includes('EXPO_PUBLIC_KELOLA_DATA_AKUN'));
  });

  test('Data Akun dan rute /hapus-akun tunduk pada saklar', () => {
    const akun = baca('components', 'screens', 'AkunScreen.tsx');
    assert.ok(akun.includes('{KELOLA_DATA_AKUN ? <BagianDataSaya /> : null}'));
    const rute = baca('app', '(app)', 'hapus-akun.tsx');
    assert.match(rute, /if \(!kelolaDataAkunAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/akun" \/>;/);
  });
});

describe('Aturan konfirmasi', () => {
  test('Penegasan di app sama persis dengan di server', () => {
    assert.equal(dataAkun.PENEGASAN_HAPUS_AKUN, PENEGASAN_HAPUS_AKUN);
  });

  test('siapHapus: wajib centang dan satu konfirmasi yang lengkap', () => {
    const dasar = { paham: true, metode: 'sandi', kataSandi: 'rahasia', kodeEmail: '' };
    assert.equal(dataAkun.siapHapus(dasar), true);
    assert.equal(dataAkun.siapHapus({ ...dasar, paham: false }), false);
    assert.equal(dataAkun.siapHapus({ ...dasar, kataSandi: '' }), false);
    assert.equal(dataAkun.siapHapus({ ...dasar, metode: 'kode', kodeEmail: '12345' }), false);
    assert.equal(dataAkun.siapHapus({ ...dasar, metode: 'kode', kodeEmail: '123456' }), true);
  });

  test('badanHapusAkun: mengirim tepat satu cara konfirmasi', () => {
    assert.deepEqual(dataAkun.badanHapusAkun({ metode: 'sandi', kataSandi: 'a', kodeEmail: '123456' }), { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: 'a' });
    assert.deepEqual(dataAkun.badanHapusAkun({ metode: 'kode', kataSandi: 'a', kodeEmail: '123456' }), { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: '123456' });
  });

  test('Kode email hanya ditawarkan untuk email terverifikasi', () => {
    assert.equal(dataAkun.bisaPakaiKodeEmail({ email: 'a@b.c', email_terverifikasi: true }), true);
    assert.equal(dataAkun.bisaPakaiKodeEmail({ email: 'a@b.c', email_terverifikasi: false }), false);
    assert.equal(dataAkun.bisaPakaiKodeEmail({ email: 'a@b.c' }), false);
    assert.equal(dataAkun.bisaPakaiKodeEmail({ email: null, email_terverifikasi: true }), false);
  });

  test('Galat: kata sandi salah dan jaringan punya kalimat sendiri; galat lain memakai kalimat umum', () => {
    assert.match(dataAkun.pesanGalatHapus('KREDENSIAL_SALAH'), /Kata sandi tidak cocok/);
    assert.match(dataAkun.pesanGalatHapus('JARINGAN'), /belum dihapus/);
    assert.equal(dataAkun.pesanGalatHapus('LAINNYA'), dataAkun.GALAT_HAPUS_UMUM);
    assert.equal(dataAkun.pesanGalatHapus(undefined), dataAkun.GALAT_HAPUS_UMUM);
    assert.match(dataAkun.pesanGalatUnduh('JARINGAN'), /terhubung/);
    assert.equal(dataAkun.pesanGalatUnduh(undefined), dataAkun.GALAT_UNDUH_UMUM);
  });

  test('namaBerkasEkspor: aman untuk sistem berkas', () => {
    assert.equal(dataAkun.namaBerkasEkspor('budi.s', '2026-11-10T08:00:00.000Z'), 'data-lanjut-budi.s-2026-11-10.json');
    assert.equal(dataAkun.namaBerkasEkspor('a/../b', '2026-11-10T08:00:00.000Z'), 'data-lanjut-a_.._b-2026-11-10.json');
  });
});

describe('Layar hapus akun', () => {
  const layar = baca('components', 'screens', 'HapusAkunScreen.tsx');

  test('Kata sandi disembunyikan; keadaan memuat dan galat ditampilkan', () => {
    assert.ok(layar.includes('secureTextEntry'));
    assert.ok(layar.includes('proses={hapus.isPending}'));
    assert.ok(layar.includes('{hapus.isError ? <PesanGalat teks={pesanGalatHapus(hapus.error.kode)} /> : null}'));
    assert.ok(layar.includes('{unduh.isError ? <PesanGalat teks={pesanGalatUnduh(unduh.error.kode)} /> : null}'));
  });

  test('Setelah berhasil, sesi dan data akun di perangkat dibuang', () => {
    assert.ok(baca('hooks', 'useDataAkun.ts').includes('onSuccess: () => selesaiHapusAkun()'));
    const penyedia = baca('providers', 'AuthProvider.tsx');
    const fungsi = /const selesaiHapusAkun = useCallback\(async \(\) => \{([\s\S]*?)\}, \[queryClient\]\);/.exec(penyedia)[1];
    for (const langkah of ['authApi.hapusSesiLokal()', 'authApi.hapusProfilLokalAkun(penggunaId)', 'hapusDataAkun(queryClient)', "setStatus('keluar')", "setAlasanKeluar('akun_dihapus')"]) {
      assert.ok(fungsi.includes(langkah), langkah);
    }
  });
});

describe('Teks baru berstatus draf', () => {
  const draf = baca('docs', 'draf-teks-hapus-akun.md');

  test('Dokumen menandai teksnya draf, menunggu persetujuan Khalifa', () => {
    assert.match(draf, /draf, menunggu persetujuan Khalifa/);
  });

  test('Setiap teks layar tercatat di dokumen draf', () => {
    const semua = [
      ...Object.values(dataAkun.TEKS_DATA_AKUN),
      ...dataAkun.YANG_IKUT_TERHAPUS,
      ...dataAkun.YANG_TIDAK_TERHAPUS,
      dataAkun.GALAT_HAPUS_UMUM,
      dataAkun.GALAT_UNDUH_UMUM,
    ];
    for (const teks of semua) assert.ok(draf.includes(teks), teks);
    for (const kode of ['KREDENSIAL_SALAH', 'KODE_SALAH', 'KODE_KEDALUWARSA', 'TERLALU_SERING', 'OTP_TIDAK_TERSEDIA', 'TIDAK_BERHAK', 'JARINGAN']) {
      assert.ok(draf.includes(dataAkun.pesanGalatHapus(kode)), kode);
    }
    for (const kode of ['EKSPOR_TERLALU_BESAR', 'TERLALU_BESAR_HP']) assert.ok(draf.includes(dataAkun.pesanGalatUnduh(kode)), kode);
  });

  test('Email kode hapus akun juga tercatat', () => {
    const { TEKS_PER_TUJUAN } = require('../src/modul/auth/pengirimOtp');
    for (const teks of Object.values(TEKS_PER_TUJUAN.hapus_akun)) assert.ok(draf.includes(teks), teks);
  });

  test('Teks tidak membujuk siswa agar batal', () => {
    const semua = [...Object.values(dataAkun.TEKS_DATA_AKUN), ...dataAkun.YANG_IKUT_TERHAPUS].join(' ');
    assert.ok(!/yakin|sayang|jangan pergi|pikirkan lagi|menyesal/i.test(semua));
  });
});
