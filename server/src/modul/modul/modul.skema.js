// Skema zod modul (LANJUT_049). Daftar putih: medan lain dibuang (§8.3).

const { z } = require('zod');

const judul = z.string().trim().min(1, 'Judul belum diisi.').max(200, 'Judul terlalu panjang.');
const mapelId = z.string().trim().min(1, 'Pilih mapelnya.').max(64);

/** Medan teks di unggahan berkas (multipart). Isi modul dari berkas. */
const unggahBerkasSkema = z.object({ judul, mapel_id: mapelId });

/** Teks yang ditempel (JSON). Batas karakter dicek layanan dari konfigurasi. */
const unggahTeksSkema = z.object({
  judul,
  mapel_id: mapelId,
  teks: z.string().min(1, 'Teks modul belum diisi.'),
});

const cariSkema = z.object({ q: z.string().trim().min(3, 'Kata kunci minimal 3 huruf.').max(200) });

module.exports = { unggahBerkasSkema, unggahTeksSkema, cariSkema };
