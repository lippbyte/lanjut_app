// Skema rute Discover (LANJUT_024 seri v2). Medan yang tidak disebut di sini dibuang zod.

const { z } = require('zod');

/** Batas refleksi dan catatan profil, dalam karakter. Sama dengan kolom di 033_discover.sql. */
const BATAS_DISCOVER = { refleksi: 280, catatan: 500 };

/** Isian kosong disimpan sebagai NULL. */
const kosongJadiNull = (nilai) => (nilai === '' ? null : nilai);
const teks = (maks) => z.string().trim().max(maks).transform(kosongJadiNull).nullable().optional();

const POLA_ID_KARTU = /^[a-z0-9-]{1,64}$/;

const refleksiSkema = z.object({
  ketertarikan: z.enum(['tertarik', 'belum_yakin', 'tidak_tertarik']),
  yang_menarik: teks(BATAS_DISCOVER.refleksi),
  yang_kurang_menarik: teks(BATAS_DISCOVER.refleksi),
});

const profilSkema = z.object({ catatan: teks(BATAS_DISCOVER.catatan) });

module.exports = { refleksiSkema, profilSkema, BATAS_DISCOVER, POLA_ID_KARTU };
