// Mengenali jenis foto dari isinya dan membuang semua metadata (LANJUT_010 seri v2). Modul murni,
// tanpa dependensi.
//
// Foto siswa adalah data pribadi, dan foto dari HP bisa memuat lokasi rumah. Berkas dibaca bagian
// per bagian, dan hanya bagian yang memang dibutuhkan untuk menampilkan gambar yang disalin
// (daftar izin). Bagian lain, termasuk apa pun sesudah akhir gambar, tidak ikut. Berkas yang
// strukturnya tidak bisa dibaca utuh ditolak, jadi tidak ada berkas yang lolos tanpa dibersihkan.

class GalatFoto extends Error {
  constructor(kode, pesan) {
    super(pesan);
    this.name = 'GalatFoto';
    this.kode = kode;
  }
}

const rusak = () => new GalatFoto('FOTO_RUSAK', 'Foto ini tidak bisa dibaca. Coba pilih foto lain.');
const jenisDitolak = () => new GalatFoto('FOTO_JENIS_DITOLAK', 'Jenis berkas ini tidak diterima. Pakai foto JPEG, PNG, atau WebP.');
const heicDitolak = () => new GalatFoto('FOTO_HEIC_DITOLAK', 'Foto HEIC belum bisa diterima. Ubah dulu ke JPEG, PNG, atau WebP.');

const JENIS = {
  jpeg: { mime: 'image/jpeg', ekstensi: 'jpg' },
  png: { mime: 'image/png', ekstensi: 'png' },
  webp: { mime: 'image/webp', ekstensi: 'webp' },
};

const TANDA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MEREK_HEIC = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);
const MEREK_AVIF = new Set(['avif', 'avis']);

const ascii = (buf, awal, akhir) => buf.toString('latin1', awal, akhir);

/** Merek berkas keluarga ISO (HEIC, AVIF): merek utama dan daftar merek yang cocok. */
function merekIso(buf) {
  if (buf.length < 12 || ascii(buf, 4, 8) !== 'ftyp') return null;
  const panjangKotak = Math.min(buf.readUInt32BE(0), buf.length);
  const merek = [ascii(buf, 8, 12)];
  for (let i = 16; i + 4 <= panjangKotak; i += 4) merek.push(ascii(buf, i, i + 4));
  return merek;
}

/** Jenis ditentukan dari isi berkas. Nama berkas dan Content-Type dari klien tidak dipakai. */
function kenaliJenis(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(TANDA_PNG)) return 'png';
  if (buf.length >= 12 && ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return 'webp';
  const merek = merekIso(buf);
  if (merek && !merek.some((m) => MEREK_AVIF.has(m)) && merek.some((m) => MEREK_HEIC.has(m))) throw heicDitolak();
  throw jenisDitolak();
}

/** Nilai Orientation dari blok EXIF, atau null. Hanya nilai ini yang boleh bertahan. */
function orientasiExif(tiff) {
  try {
    const kecil = ascii(tiff, 0, 2) === 'II';
    if (!kecil && ascii(tiff, 0, 2) !== 'MM') return null;
    const u16 = (i) => (kecil ? tiff.readUInt16LE(i) : tiff.readUInt16BE(i));
    const u32 = (i) => (kecil ? tiff.readUInt32LE(i) : tiff.readUInt32BE(i));
    if (u16(2) !== 42) return null;
    const ifd = u32(4);
    const jumlah = u16(ifd);
    for (let n = 0; n < jumlah; n += 1) {
      const entri = ifd + 2 + n * 12;
      if (u16(entri) === 0x0112 && u16(entri + 2) === 3 && u32(entri + 4) === 1) {
        const nilai = u16(entri + 8);
        return nilai >= 1 && nilai <= 8 ? nilai : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Blok APP1 yang isinya hanya arah putar foto, supaya foto dari HP tidak tampil miring. */
function segmenOrientasi(nilai) {
  const data = Buffer.alloc(34);
  data.writeUInt16BE(0xffe1, 0);
  data.writeUInt16BE(32, 2);
  data.write('Exif\0\0', 4, 'latin1');
  data.write('II', 10, 'latin1');
  data.writeUInt16LE(42, 12);
  data.writeUInt32LE(8, 14);
  data.writeUInt16LE(1, 18);
  data.writeUInt16LE(0x0112, 20);
  data.writeUInt16LE(3, 22);
  data.writeUInt32LE(1, 24);
  data.writeUInt16LE(nilai, 28);
  data.writeUInt32LE(0, 30);
  return data;
}

function bersihkanJpeg(buf) {
  const jfif = [];
  const isi = [];
  let orientasi = null;
  let adaSof = false;
  let adaSos = false;
  let selesai = false;
  let i = 2;

  while (i < buf.length) {
    if (buf[i] !== 0xff) throw rusak();
    while (i < buf.length && buf[i] === 0xff) i += 1;
    if (i >= buf.length) throw rusak();
    const penanda = buf[i];
    i += 1;
    if (penanda === 0xd9) {
      selesai = true;
      break; // apa pun sesudah akhir gambar tidak ikut
    }
    if (penanda === 0x00 || penanda === 0x01 || (penanda >= 0xd0 && penanda <= 0xd8)) throw rusak();
    if (i + 2 > buf.length) throw rusak();
    const panjang = buf.readUInt16BE(i);
    if (panjang < 2 || i + panjang > buf.length) throw rusak();
    const awalSegmen = i - 2;
    const akhirSegmen = i + panjang;
    const data = buf.subarray(i + 2, akhirSegmen);

    if (penanda === 0xda) {
      // Sesudah SOS ada data gambar, sampai penanda berikutnya yang bukan bagian data itu.
      let j = akhirSegmen;
      for (;;) {
        if (j + 1 >= buf.length) throw rusak();
        if (buf[j] !== 0xff) j += 1;
        else if (buf[j + 1] === 0x00 || (buf[j + 1] >= 0xd0 && buf[j + 1] <= 0xd7)) j += 2;
        else if (buf[j + 1] === 0xff) j += 1;
        else break;
      }
      isi.push(buf.subarray(awalSegmen, j));
      adaSos = true;
      i = j;
    } else {
      if (penanda === 0xe0) {
        if (jfif.length === 0 && data.length >= 14 && ascii(data, 0, 5) === 'JFIF\0') {
          // Hanya kepala JFIF. Gambar kecil di dalamnya dibuang.
          const kepala = Buffer.from(buf.subarray(awalSegmen, awalSegmen + 18));
          kepala.writeUInt16BE(16, 2);
          kepala[16] = 0;
          kepala[17] = 0;
          jfif.push(kepala);
        }
      } else if (penanda === 0xe1) {
        if (data.length > 6 && ascii(data, 0, 6) === 'Exif\0\0') orientasi = orientasiExif(data.subarray(6));
      } else if (penanda === 0xee) {
        // Blok Adobe berisi cara membaca warna, dibutuhkan untuk menampilkan gambar. Isi sahnya
        // tepat 12 byte. Sisanya tidak ikut.
        if (data.length >= 12 && ascii(data, 0, 5) === 'Adobe') {
          const kepala = Buffer.from(buf.subarray(awalSegmen, awalSegmen + 16));
          kepala.writeUInt16BE(14, 2);
          isi.push(kepala);
        }
      } else if (penanda === 0xfe || (penanda >= 0xe2 && penanda <= 0xef)) {
        // Komentar dan blok APP lain: lewati.
      } else if ([0xdb, 0xc4, 0xdd, 0xcc, 0xdc].includes(penanda)) {
        isi.push(buf.subarray(awalSegmen, akhirSegmen));
      } else if (penanda >= 0xc0 && penanda <= 0xcf && penanda !== 0xc8) {
        adaSof = true;
        isi.push(buf.subarray(awalSegmen, akhirSegmen));
      } else {
        throw rusak();
      }
      i = akhirSegmen;
    }
  }
  if (!selesai || !adaSof || !adaSos) throw rusak();

  const potongan = [Buffer.from([0xff, 0xd8]), ...jfif];
  if (orientasi !== null && orientasi !== 1) potongan.push(segmenOrientasi(orientasi));
  return Buffer.concat([...potongan, ...isi, Buffer.from([0xff, 0xd9])]);
}

const TABEL_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABEL_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const POTONGAN_PNG = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'pHYs', 'bKGD']);

function bersihkanPng(buf) {
  const keluar = [TANDA_PNG];
  let i = 8;
  let pertama = true;
  let adaIdat = false;
  for (;;) {
    if (i + 12 > buf.length) throw rusak();
    const panjang = buf.readUInt32BE(i);
    const akhir = i + 12 + panjang;
    if (akhir > buf.length) throw rusak();
    const tipe = ascii(buf, i + 4, i + 8);
    if (crc32(buf.subarray(i + 4, i + 8 + panjang)) !== buf.readUInt32BE(i + 8 + panjang)) throw rusak();
    if (pertama && tipe !== 'IHDR') throw rusak();
    pertama = false;
    if (POTONGAN_PNG.has(tipe)) {
      keluar.push(buf.subarray(i, akhir));
      if (tipe === 'IDAT') adaIdat = true;
    } else if (tipe[0] === tipe[0].toUpperCase()) {
      throw rusak(); // potongan wajib yang tidak dikenal: gambarnya tidak bisa dijamin
    }
    i = akhir;
    if (tipe === 'IEND') break;
  }
  if (!adaIdat) throw rusak();
  return Buffer.concat(keluar);
}

const POTONGAN_WEBP = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH']);
const BIT_VP8X_DIBUANG = 0x20 | 0x08 | 0x04; // profil warna, EXIF, XMP

function bersihkanWebp(buf) {
  const akhirRiff = buf.readUInt32LE(4) + 8;
  if (akhirRiff > buf.length || akhirRiff < 12) throw rusak();
  const keluar = [];
  let adaGambar = false;
  let i = 12;
  while (i < akhirRiff) {
    if (i + 8 > akhirRiff) throw rusak();
    const tipe = ascii(buf, i, i + 4);
    const panjang = buf.readUInt32LE(i + 4);
    const akhirData = i + 8 + panjang;
    if (akhirData > akhirRiff) throw rusak();
    const akhir = akhirData + (panjang % 2);
    if (tipe === 'ANIM' || tipe === 'ANMF') throw jenisDitolak();
    if (POTONGAN_WEBP.has(tipe)) {
      const potongan = Buffer.from(buf.subarray(i, Math.min(akhir, akhirRiff)));
      if (tipe === 'VP8X') {
        if (panjang < 10) throw rusak();
        if (potongan[8] & 0x02) throw jenisDitolak(); // animasi
        potongan[8] &= ~BIT_VP8X_DIBUANG;
      }
      if (tipe === 'VP8 ' || tipe === 'VP8L') adaGambar = true;
      keluar.push(potongan);
    }
    i = akhir;
  }
  if (!adaGambar) throw rusak();
  const isi = Buffer.concat(keluar);
  const kepala = Buffer.alloc(12);
  kepala.write('RIFF', 0, 'latin1');
  kepala.writeUInt32LE(isi.length + 4, 4);
  kepala.write('WEBP', 8, 'latin1');
  return Buffer.concat([kepala, isi]);
}

const PEMBERSIH = { jpeg: bersihkanJpeg, png: bersihkanPng, webp: bersihkanWebp };

/** Mengembalikan { isi, mime, ekstensi }. Melempar GalatFoto bila berkas tidak diterima. */
function olahFoto(buf) {
  const jenis = kenaliJenis(buf);
  let isi;
  try {
    isi = PEMBERSIH[jenis](buf);
  } catch (galat) {
    if (galat instanceof GalatFoto) throw galat;
    throw rusak(); // pembacaan keluar batas berarti strukturnya tidak utuh
  }
  return { isi, ...JENIS[jenis] };
}

module.exports = { olahFoto, kenaliJenis, GalatFoto };
