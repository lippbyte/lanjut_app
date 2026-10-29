// Rute konten publik hanya-baca — TIDAK butuh login (§4.4, B-K1).
// Hanya menyusun respons dari repositori; tidak ada SQL/aturan bisnis di sini.

const express = require('express');
const konten = require('./konten.repo');
const banner = require('./banner');
const { sukses, galat } = require('../../util/respons');
const { keTanggal } = require('../../util/waktu');

const router = express.Router();

// LANJUT_073 — banner Beranda dari server/config/banner-beranda.json (bukan tabel).
// Berkas rusak → `banner: []` + peringatan di log (lihat banner.js), bukan galat.
router.get('/banner', async (req, res, next) => {
  try {
    sukses(res, { banner: await banner.bannerAktif() });
  } catch (err) {
    next(err);
  }
});

router.get('/linimasa', async (req, res, next) => {
  try {
    const baris = await konten.ambilLinimasa();
    sukses(
      res,
      baris.map((b) => ({
        ...b,
        tanggal_mulai: keTanggal(b.tanggal_mulai),
        tanggal_selesai: keTanggal(b.tanggal_selesai),
        diperiksa_pada: keTanggal(b.diperiksa_pada),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/khusus-smk', async (req, res, next) => {
  try {
    const baris = await konten.ambilKhususSmk();
    sukses(
      res,
      baris.map((b) => ({ ...b, diperiksa_pada: keTanggal(b.diperiksa_pada) }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/prodi', async (req, res, next) => {
  try {
    const baris = await konten.ambilProdi();
    sukses(
      res,
      baris.map((b) => ({ ...b, diperiksa_pada: keTanggal(b.diperiksa_pada) }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/mapel', async (req, res, next) => {
  try {
    const baris = await konten.ambilMapel();
    sukses(
      res,
      baris.map((b) => ({
        ...b,
        tersedia_di_smk: !!b.tersedia_di_smk,
        diperiksa_pada: keTanggal(b.diperiksa_pada),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// F3 — jalur "belum tahu prodi": agregasi lintas SEMUA prodi dihitung di
// sini lewat satu query (konten.repo.js `ambilAgregasiMapelLintasProdi`),
// bukan diagregasi di klien dari banyak panggilan `/prodi/:id/mapel`.
router.get('/mapel/agregasi-lintas-prodi', async (req, res, next) => {
  try {
    const baris = await konten.ambilAgregasiMapelLintasProdi();
    sukses(
      res,
      baris.map((b) => ({
        ...b,
        tersedia_di_smk: !!b.tersedia_di_smk,
        jumlah_prodi: Number(b.jumlah_prodi),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/prodi/:id/mapel', async (req, res, next) => {
  try {
    const ada = await konten.prodiAda(req.params.id);
    if (!ada) return galat(res, 'TIDAK_DITEMUKAN', 'Prodi tidak ditemukan.');
    const baris = await konten.ambilMapelUntukProdi(req.params.id);
    sukses(res, baris.map((b) => ({ ...b, tersedia_di_smk: !!b.tersedia_di_smk })));
  } catch (err) {
    next(err);
  }
});

router.get('/cerita-alumni', async (req, res, next) => {
  try {
    const baris = await konten.ambilCeritaAlumniTayang();
    sukses(
      res,
      baris.map((b) => ({ ...b, diperiksa_pada: keTanggal(b.diperiksa_pada) }))
    );
  } catch (err) {
    next(err);
  }
});

// F10 Eksplorasi Tujuan (LANJUT_031). Hanya profil yang sudah terverifikasi
// (disaring di repositori). JSON bisa datang sebagai objek (MySQL) atau
// teks (MariaDB menyimpan JSON sebagai LONGTEXT) — keduanya diterima.
const jsonDari = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

function bentukProfilProdi(b) {
  return {
    id: b.id,
    nama: b.nama,
    rumpun: b.rumpun,
    jenjang: b.jenjang,
    badge_relevan_smk: !!b.badge_relevan_smk,
    peminat:
      b.peminat_jumlah === null
        ? null
        : {
            jumlah: b.peminat_jumlah,
            kampus: b.peminat_kampus,
            tahun: b.peminat_tahun,
            jalur: b.peminat_jalur,
            sumber: b.peminat_sumber,
          },
    diterima: b.diterima,
    mata_kuliah: jsonDari(b.mata_kuliah),
    profesi: jsonDari(b.profesi),
    kampus: jsonDari(b.kampus),
    status_sumber: jsonDari(b.status_sumber),
    catatan_studi: b.catatan_studi,
    sumber: b.sumber,
    pemilik: b.pemilik,
    status_verifikasi: b.status_verifikasi,
    asal: b.asal,
    url_sumber: b.url_sumber,
    diperiksa_pada: keTanggal(b.diperiksa_pada),
  };
}

router.get('/eksplorasi-tujuan', async (req, res, next) => {
  try {
    const baris = await konten.ambilProfilProdiTerverifikasi(null);
    sukses(res, baris.map(bentukProfilProdi));
  } catch (err) {
    next(err);
  }
});

// Profil yang belum terverifikasi dijawab 404 yang SAMA dengan id yang tidak
// ada, supaya isi yang belum dicek tidak bocor lewat jalur mana pun.
router.get('/eksplorasi-tujuan/:id', async (req, res, next) => {
  try {
    const [b] = await konten.ambilProfilProdiTerverifikasi(req.params.id);
    if (!b) return galat(res, 'TIDAK_DITEMUKAN', 'Profil prodi tidak ditemukan.');
    sukses(res, bentukProfilProdi(b));
  } catch (err) {
    next(err);
  }
});

router.get('/checklist', async (req, res, next) => {
  try {
    const baris = await konten.ambilChecklist({
      kelas: req.query.kelas,
      jalur: req.query.jalur,
      // `?rumpun=a&rumpun=b` jadi array di Express — abaikan, jangan 500.
      rumpun: typeof req.query.rumpun === 'string' ? req.query.rumpun : null,
    });

    // Kelompokkan per kategori — bentuk yang sama seperti app/data/checklist.json.
    const petaKategori = new Map();
    for (const b of baris) {
      if (!petaKategori.has(b.kategori_id)) {
        petaKategori.set(b.kategori_id, {
          id: b.kategori_id,
          nama: b.kategori_nama,
          urutan: b.kategori_urutan,
          butir: [],
        });
      }
      petaKategori.get(b.kategori_id).butir.push({
        id: b.id,
        judul: b.judul,
        urutan: b.urutan,
        berlaku_untuk_kelas: b.berlaku_untuk_kelas.split(','),
        berlaku_untuk_jalur: b.berlaku_untuk_jalur.split(','),
        // null = butir umum (semua rumpun); array = butir khusus rumpun itu.
        berlaku_untuk_rumpun: b.berlaku_untuk_rumpun ? b.berlaku_untuk_rumpun.split(',') : null,
        sumber: b.sumber,
        pemilik: b.pemilik,
        status_verifikasi: b.status_verifikasi,
        asal: b.asal,
        url_sumber: b.url_sumber,
        diperiksa_pada: keTanggal(b.diperiksa_pada),
      });
    }
    const kategori = Array.from(petaKategori.values()).sort((a, b) => a.urutan - b.urutan);
    sukses(res, { kategori, total_butir: baris.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
