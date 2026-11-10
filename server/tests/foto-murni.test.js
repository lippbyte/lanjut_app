// LANJUT_010 seri v2: pengenalan jenis foto dan pembuangan metadata. Tanpa basis data.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { olahFoto, kenaliJenis, GalatFoto } = require('../src/modul/butir-bukti/foto-murni');
const f = require('./contoh/foto-uji');

const kode = (buf) => {
  try {
    olahFoto(buf);
  } catch (galat) {
    assert.ok(galat instanceof GalatFoto, String(galat));
    return galat.kode;
  }
  return null;
};

function tanpaPenanda(buf) {
  for (const p of f.SEMUA_PENANDA) assert.ok(!buf.includes(p), `${p} masih ada`);
}

/** Tag TIFF yang tersisa di blok Exif hasil pembersihan. */
function tagExif(buf) {
  const i = buf.indexOf('Exif\0\0');
  if (i < 0) return [];
  const t = buf.subarray(i + 6);
  const kecil = t.toString('latin1', 0, 2) === 'II';
  const u16 = (n) => (kecil ? t.readUInt16LE(n) : t.readUInt16BE(n));
  const jumlah = u16(8);
  return Array.from({ length: jumlah }, (_, n) => ({ tag: u16(10 + n * 12), nilai: u16(18 + n * 12) }));
}

test('Jenis dikenali dari isi berkas', () => {
  assert.equal(kenaliJenis(f.JPEG), 'jpeg');
  assert.equal(kenaliJenis(f.PNG), 'png');
  assert.equal(kenaliJenis(f.WEBP), 'webp');
  assert.deepEqual(
    [olahFoto(f.JPEG).mime, olahFoto(f.PNG).mime, olahFoto(f.WEBP).mime],
    ['image/jpeg', 'image/png', 'image/webp']
  );
});

test('Berkas bukan gambar ditolak, apa pun namanya', () => {
  for (const buf of [Buffer.alloc(0), Buffer.from('ini berkas teks'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from('%PDF-1.7 isi')]) {
    assert.equal(kode(buf), 'FOTO_JENIS_DITOLAK');
  }
});

test('HEIC dan HEIF ditolak dengan kode sendiri; AVIF ditolak sebagai jenis lain', () => {
  for (const merek of ['heic', 'heix', 'hevc', 'mif1']) assert.equal(kode(f.heic(merek)), 'FOTO_HEIC_DITOLAK', merek);
  const avif = f.heic('avif');
  avif.write('avif', 16, 'latin1');
  assert.equal(kode(avif), 'FOTO_JENIS_DITOLAK');
});

test('JPEG: EXIF, GPS, XMP, IPTC, komentar, dan data sesudah akhir gambar hilang', () => {
  const masuk = f.jpegDenganMetadata();
  for (const p of f.SEMUA_PENANDA.filter((x) => x !== 'TEKS-RAHASIA')) assert.ok(masuk.includes(p), `gambar uji harus memuat ${p}`);
  const { isi } = olahFoto(masuk);
  tanpaPenanda(isi);
  assert.ok(!isi.includes(Buffer.from([0x25, 0x88])), 'tag GPSInfo masih ada');
});

test('JPEG: yang tersisa dari EXIF hanya arah putar', () => {
  for (const kecil of [true, false]) {
    const tag = tagExif(olahFoto(Buffer.concat([f.JPEG.subarray(0, 2), f.segmenExif({ orientasi: 6, kecil }), f.JPEG.subarray(2)])).isi);
    assert.deepEqual(tag, [{ tag: 0x0112, nilai: 6 }]);
  }
});

test('JPEG: arah putar normal tidak perlu blok EXIF', () => {
  const { isi } = olahFoto(Buffer.concat([f.JPEG.subarray(0, 2), f.segmenExif({ orientasi: 1 }), f.JPEG.subarray(2)]));
  assert.equal(isi.indexOf('Exif\0\0'), -1);
});

test('JPEG: data gambar tidak berubah', () => {
  const polos = olahFoto(f.JPEG).isi;
  const bersih = olahFoto(Buffer.concat([f.JPEG.subarray(0, 2), f.segmenJpeg(0xfe, Buffer.from('komentar')), f.JPEG.subarray(2)])).isi;
  assert.ok(polos.equals(bersih));
  assert.equal(polos[polos.length - 2], 0xff);
  assert.equal(polos[polos.length - 1], 0xd9);
});

test('JPEG: gambar kecil di kepala JFIF dibuang', () => {
  const data = Buffer.concat([Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\x02\x02', 'latin1'), Buffer.from('THUMBNAIL-RAHASIA', 'latin1')]);
  const { isi } = olahFoto(Buffer.concat([f.JPEG.subarray(0, 2), f.segmenJpeg(0xe0, data), f.JPEG.subarray(2)]));
  assert.ok(!isi.includes('THUMBNAIL-RAHASIA'));
  assert.equal(isi.readUInt16BE(4), 16);
  assert.equal(isi[18], 0);
  assert.equal(isi[19], 0);
});

test('JPEG: blok Adobe dipertahankan 12 byte saja', () => {
  const kepala = Buffer.from('Adobe\0\x64\0\0\0\0\x01', 'latin1');
  const data = Buffer.concat([kepala, Buffer.from('DATA-MENUMPANG', 'latin1')]);
  const { isi } = olahFoto(Buffer.concat([f.JPEG.subarray(0, 2), f.segmenJpeg(0xee, data), f.JPEG.subarray(2)]));
  assert.ok(!isi.includes('DATA-MENUMPANG'));
  const i = isi.indexOf('Adobe');
  assert.equal(isi.readUInt16BE(i - 2), 14);
  assert.ok(isi.subarray(i, i + 12).equals(kepala));
});

test('JPEG rusak ditolak, tidak pernah lolos tanpa dibersihkan', () => {
  assert.equal(kode(f.JPEG.subarray(0, f.JPEG.length - 2)), 'FOTO_RUSAK');
  assert.equal(kode(f.JPEG.subarray(0, 40)), 'FOTO_RUSAK');
  assert.equal(kode(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), 'FOTO_RUSAK');
  const panjangPalsu = Buffer.from(f.JPEG);
  panjangPalsu.writeUInt16BE(0xffff, 4);
  assert.equal(kode(panjangPalsu), 'FOTO_RUSAK');
});

test('PNG: teks, eXIf, dan data sesudah IEND hilang; gambar tidak berubah', () => {
  const { isi } = olahFoto(f.pngDenganMetadata());
  tanpaPenanda(isi);
  assert.ok(!isi.includes('eXIf'));
  assert.ok(isi.equals(f.PNG));
});

test('PNG rusak ditolak: CRC salah, potongan wajib tak dikenal, terpotong', () => {
  const crcSalah = Buffer.from(f.PNG);
  crcSalah[crcSalah.length - 1] ^= 0xff;
  assert.equal(kode(crcSalah), 'FOTO_RUSAK');
  assert.equal(kode(f.PNG.subarray(0, 30)), 'FOTO_RUSAK');
  const sesudahIhdr = 8 + 12 + f.PNG.readUInt32BE(8);
  assert.equal(kode(Buffer.concat([f.PNG.subarray(0, sesudahIhdr), f.potonganPng('ABCD', Buffer.alloc(2)), f.PNG.subarray(sesudahIhdr)])), 'FOTO_RUSAK');
});

test('WebP: EXIF, XMP, dan data sesudah akhir RIFF hilang; tanda VP8X ikut dimatikan', () => {
  const { isi } = olahFoto(f.webpDenganMetadata());
  tanpaPenanda(isi);
  assert.ok(!isi.includes('EXIF') && !isi.includes('XMP '));
  assert.equal(isi.toString('latin1', 12, 16), 'VP8X');
  assert.equal(isi[20] & (0x20 | 0x08 | 0x04), 0);
  assert.equal(isi.readUInt32LE(4) + 8, isi.length, 'ukuran RIFF harus sesuai isi');
});

test('WebP animasi dan WebP rusak ditolak', () => {
  const animasi = Buffer.from(f.WEBP);
  animasi[20] |= 0x02;
  assert.equal(kode(animasi), 'FOTO_JENIS_DITOLAK');
  assert.equal(kode(f.WEBP.subarray(0, 20)), 'FOTO_RUSAK');
});
