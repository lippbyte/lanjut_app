// Aturan persetujuan (LANJUT_047). Tidak ada SQL di sini — hanya repositori.
//
// Dua jenis catatan per akun, riwayat tidak pernah ditimpa (baris baru untuk
// setiap setuju/cabut; status berlaku = baris terakhir per jenis):
//   - kebijakan_privasi: dicatat siswa sendiri (sumber 'mandiri'), saat daftar
//     atau lewat POST /persetujuan.
//   - ortu_wali: TIDAK PERNAH lewat POST /persetujuan (itu sama saja siswa
//     menyetujui untuk dirinya). Dua jalur: skrip admin `npm run persetujuan-ortu`
//     (sumber 'surat_sekolah' / 'admin'), atau konfirmasi orang tua/wali di app lewat
//     POST /persetujuan/ortu-wali (sumber 'konfirmasi_di_app'; identitas TIDAK
//     diverifikasi, jadi sumbernya sengaja dibedakan).
//
// GERBANG AI: bolehPakaiAi(penggunaId) adalah SATU-SATUNYA penentu boleh
// tidaknya data akun diproses fitur AI. Setiap endpoint AI di masa depan
// WAJIB memanggilnya di server sebelum mengirim apa pun ke penyedia AI —
// jangan mengandalkan app (README server, bagian Persetujuan & gerbang AI).
// Gagal-tertutup: konfigurasi tidak lengkap/tidak sah → false.

const { sekarangUntukDb, keIso } = require('../../util/waktu');
const { GalatApi } = require('../../util/respons');
const repo = require('./persetujuan.repo');

/** Versi dari tabel konfigurasi; null bila salah satu tidak ada atau bukan bilangan bulat ≥ 1. */
async function ambilKonfigurasi() {
  const nilai = Object.fromEntries((await repo.ambilKonfigurasi()).map((b) => [b.kunci, Number(b.nilai)]));
  const versiKebijakan = nilai.persetujuan_versi_kebijakan;
  const versiMinOrtu = nilai.persetujuan_versi_min_ortu;
  const sah = (n) => Number.isInteger(n) && n >= 1;
  return sah(versiKebijakan) && sah(versiMinOrtu) ? { versiKebijakan, versiMinOrtu } : null;
}

/** Catatan terbaru per jenis, dari daftar catatan yang urut terbaru dulu. */
function terakhirPerJenis(catatan) {
  const hasil = { kebijakan_privasi: null, ortu_wali: null };
  for (const c of catatan) if (c.jenis in hasil && hasil[c.jenis] === null) hasil[c.jenis] = c;
  return hasil;
}

/** Kebijakan versi yang berlaku sudah diterima (dan tidak dicabut). */
function kebijakanTerkini(terakhir, cfg) {
  const k = terakhir.kebijakan_privasi;
  return Boolean(cfg && k && k.status === 'setuju' && k.versi >= cfg.versiKebijakan);
}

/** Persetujuan orang tua/wali aktif: tidak dicabut, versinya ≥ minimum. */
function ortuWaliAktif(terakhir, cfg) {
  const o = terakhir.ortu_wali;
  return Boolean(cfg && o && o.status === 'setuju' && o.versi >= cfg.versiMinOrtu);
}

const nilaiGerbang = (terakhir, cfg) => ortuWaliAktif(terakhir, cfg) && kebijakanTerkini(terakhir, cfg);

/** GERBANG AI — lihat kepala berkas. */
async function bolehPakaiAi(penggunaId) {
  if (!penggunaId) return false;
  const [cfg, catatan] = await Promise.all([ambilKonfigurasi(), repo.catatanAkun(penggunaId)]);
  return nilaiGerbang(terakhirPerJenis(catatan), cfg);
}

/**
 * Kebijakan privasi versi yang berlaku sudah diterima akun ini (LANJUT_075):
 * syarat menyimpan data minat (minat_rumpun) untuk siswa di bawah 18 tahun.
 * Gagal-tertutup seperti gerbang AI: konfigurasi tidak sah → false.
 */
async function kebijakanDiterima(penggunaId) {
  if (!penggunaId) return false;
  const [cfg, catatan] = await Promise.all([ambilKonfigurasi(), repo.catatanAkun(penggunaId)]);
  return kebijakanTerkini(terakhirPerJenis(catatan), cfg);
}

const bentukCatatan = (c) => c && { status: c.status, versi: c.versi, sumber: c.sumber, dicatat_pada: keIso(c.dicatat_pada) };

/** GET /persetujuan/saya — hanya akun sendiri. */
async function statusSaya(penggunaId) {
  const [cfg, catatan] = await Promise.all([ambilKonfigurasi(), repo.catatanAkun(penggunaId)]);
  const terakhir = terakhirPerJenis(catatan);
  return {
    kebijakan_privasi: bentukCatatan(terakhir.kebijakan_privasi),
    ortu_wali: bentukCatatan(terakhir.ortu_wali),
    versi_kebijakan_berlaku: cfg ? cfg.versiKebijakan : null,
    kebijakan_terkini: kebijakanTerkini(terakhir, cfg),
    ortu_wali_aktif: ortuWaliAktif(terakhir, cfg),
    boleh_pakai_ai: nilaiGerbang(terakhir, cfg),
  };
}

/** Versi yang dikirim app = versi teks yang dibaca siswa; harus versi yang berlaku. */
async function pastikanVersiBerlaku(versi) {
  const cfg = await ambilKonfigurasi();
  if (!cfg) throw new GalatApi('GALAT_SERVER', 'Konfigurasi kebijakan privasi belum lengkap.');
  if (versi !== cfg.versiKebijakan) {
    throw new GalatApi(
      'KEBIJAKAN_USANG',
      'Kebijakan privasi sudah diperbarui. Muat ulang aplikasi, lalu baca dan centang versi terbaru.',
      { versi_kebijakan: `versi yang berlaku: ${cfg.versiKebijakan}` }
    );
  }
}

/**
 * Siswa menerima kebijakan privasi untuk dirinya (sumber 'mandiri'). Sudah
 * menerima versi yang sama dan belum dicabut → tidak menambah baris.
 */
async function terimaKebijakan(penggunaId, versi) {
  await pastikanVersiBerlaku(versi);
  const { kebijakan_privasi: k } = terakhirPerJenis(await repo.catatanAkun(penggunaId));
  if (k && k.status === 'setuju' && k.versi === versi) return { baru: false };
  await repo.tambah({
    penggunaId,
    jenis: 'kebijakan_privasi',
    versi,
    status: 'setuju',
    sumber: 'mandiri',
    catatan: null,
    dicatatPada: sekarangUntukDb(),
  });
  return { baru: true };
}

/** POST /persetujuan dari akun siswa. Jenis ortu_wali selalu ditolak. */
async function catatOlehSiswa(penggunaId, { jenis, versi }) {
  if (jenis !== 'kebijakan_privasi') {
    throw new GalatApi(
      'TIDAK_BERHAK',
      'Persetujuan orang tua/wali dicatat lewat sekolah, tidak bisa dari akun siswa.'
    );
  }
  return terimaKebijakan(penggunaId, versi);
}

/** Catatan yang tersimpan untuk jalur konfirmasi di app; tidak dari klien. */
const CATATAN_KONFIRMASI_DI_APP = 'Dinyatakan orang tua/wali di app, di perangkat siswa; identitas tidak diverifikasi.';

/**
 * POST /persetujuan/ortu-wali — orang tua/wali menyatakan persetujuan di app. Syarat:
 * versi = versi berlaku, dan siswa sudah menerima kebijakan versi itu (urutan sama dengan
 * jalur surat: kebijakan dulu). Sudah aktif → tidak menambah baris. Sumber dan catatan
 * ditentukan server.
 */
async function konfirmasiOrtuWali(penggunaId, versi) {
  await pastikanVersiBerlaku(versi);
  const [cfg, catatan] = await Promise.all([ambilKonfigurasi(), repo.catatanAkun(penggunaId)]);
  const terakhir = terakhirPerJenis(catatan);
  if (!kebijakanTerkini(terakhir, cfg)) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu, baru orang tua/wali bisa menyatakan persetujuan.');
  }
  if (ortuWaliAktif(terakhir, cfg)) return { baru: false };
  await repo.tambah({
    penggunaId,
    jenis: 'ortu_wali',
    versi,
    status: 'setuju',
    sumber: 'konfirmasi_di_app',
    catatan: CATATAN_KONFIRMASI_DI_APP,
    dicatatPada: sekarangUntukDb(),
  });
  return { baru: true };
}

module.exports = {
  bolehPakaiAi,
  konfirmasiOrtuWali,
  kebijakanDiterima,
  statusSaya,
  catatOlehSiswa,
  terimaKebijakan,
  pastikanVersiBerlaku,
  ambilKonfigurasi,
  terakhirPerJenis,
  kebijakanTerkini,
  ortuWaliAktif,
};
