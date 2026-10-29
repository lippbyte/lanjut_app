// Aturan modul Arsip Belajar (LANJUT_049). Tidak ada SQL di sini.
//
// - Batas (ukuran berkas, karakter, jumlah modul) dibaca dari tabel
//   konfigurasi setiap unggahan — tidak ada nilai cadangan di kode; bila
//   konfigurasi tidak lengkap, unggahan ditolak.
// - Tidak ada panggilan ke layanan luar: ekstraksi (ekstrak.js) dan pencarian
//   (FULLTEXT MySQL) berjalan di server sendiri. Isi modul tidak dikirim ke
//   mana pun. Pengambilan konteks untuk AI BUKAN bagian dari modul ini.
// - Hapus permanen; indeks FULLTEXT dirapikan sesudahnya (lihat bawah).

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const { GalatApi } = require('../../util/respons');
const repo = require('./modul.repo');
const { ekstrakBerkas, rapikanTeks, jumlahKarakter, TolakModul } = require('./ekstrak');
const { potongTeks } = require('./potong');

const HASIL_CARI_MAKS = 10;
const JEDA_RAPIKAN_INDEKS_MS = 30000;
// Sama dengan BATAS_SESI di LANJUT_App/lib/latihan.ts: satu sesi penuh dari satu mapel.
const POTONGAN_LATIHAN_PER_MAPEL = 12;

// Salinan teks §4.5 (LANJUT_049) — DRAF belum disetujui Khalifa.
const PESAN = {
  TIPE_BERKAS: 'Berkas ini tidak bisa dipakai. Unggah berkas .txt, .md, atau PDF yang berisi teks.',
  PDF_TERENKRIPSI: 'PDF ini dikunci dengan kata sandi atau perlindungan. Buka kuncinya dulu, atau tempel teksnya langsung.',
  PDF_TANPA_TEKS: 'PDF ini tidak berisi teks yang bisa dibaca, mungkin hasil pindai atau foto. Unggah PDF yang teksnya bisa diblok, atau tempel teksnya langsung.',
  PDF_GAGAL: 'PDF ini tidak bisa dibaca. Coba simpan ulang sebagai PDF, atau tempel teksnya langsung.',
};
const KODE_API = {
  TIPE_BERKAS: 'TIPE_BERKAS_DITOLAK',
  PDF_TERENKRIPSI: 'PDF_TERENKRIPSI',
  PDF_TANPA_TEKS: 'PDF_TANPA_TEKS',
  PDF_GAGAL: 'PDF_GAGAL_DIBACA',
};
const mb = (byte) => String(Math.round((byte / (1024 * 1024)) * 10) / 10).replace('.', ',');
const angka = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Batas dari konfigurasi; tanpa cadangan di kode. */
async function batas() {
  const nilai = Object.fromEntries((await repo.ambilKonfigurasi()).map((b) => [b.kunci, Number(b.nilai)]));
  const hasil = {
    ukuranByte: nilai.modul_ukuran_maks_byte,
    karakterMaks: nilai.modul_karakter_maks,
    jumlahMaks: nilai.modul_jumlah_maks,
  };
  if (!Object.values(hasil).every((n) => Number.isInteger(n) && n > 0)) {
    throw new GalatApi('GALAT_SERVER', 'Konfigurasi batas modul belum lengkap.');
  }
  return hasil;
}

// `medan` membawa angka batas supaya app bisa menyusun kalimatnya sendiri
// (app tidak menampilkan `pesan` mentah dari server, SDD §4.2).
const galatBerkasBesar = (ukuranByte) =>
  new GalatApi('BERKAS_TERLALU_BESAR', `Berkas terlalu besar. Ukuran maksimal ${mb(ukuranByte)} MB.`, {
    ukuran_maks_mb: mb(ukuranByte),
  });
const galatBatasModul = (jumlahMaks) =>
  new GalatApi('BATAS_MODUL', `Kamu sudah punya ${jumlahMaks} modul. Hapus salah satu dulu untuk mengunggah yang baru.`, {
    jumlah_maks: String(jumlahMaks),
  });

const ringkas = (m) => ({
  id: m.id,
  judul: m.judul,
  mapel_id: m.mapel_id,
  jumlah_karakter: m.jumlah_karakter,
  jenis: m.jenis,
  nama_berkas: m.nama_berkas,
  diunggah_pada: keIso(m.diunggah_pada),
});

/** Nama berkas hanya untuk tampilan: nama dasar saja, tanpa karakter kendali, maks. 255. */
function namaTampilan(nama) {
  const dasar = String(nama || '').split(/[\\/]/).pop();
  return dasar.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 255) || null;
}

/**
 * Unggah modul: `berkas` (multer, di memori) ATAU `teks` yang ditempel.
 * Urutan cek: konfigurasi → mapel → jumlah (cepat) → ukuran → ekstraksi →
 * karakter → simpan (jumlah dicek ULANG di transaksi).
 */
async function unggah(penggunaId, { judul, mapel_id, teks, berkas }) {
  const b = await batas();
  if (!(await repo.mapelAda(mapel_id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak dikenali.', { mapel_id: 'tidak dikenali' });
  }
  if ((await repo.jumlahMilik(penggunaId)) >= b.jumlahMaks) throw galatBatasModul(b.jumlahMaks);

  let isi;
  let jenis;
  if (berkas) {
    if (berkas.size > b.ukuranByte) throw galatBerkasBesar(b.ukuranByte);
    try {
      ({ teks: isi, jenis } = await ekstrakBerkas(berkas, b.karakterMaks));
    } catch (galat) {
      if (galat instanceof TolakModul) throw new GalatApi(KODE_API[galat.kode], PESAN[galat.kode]);
      throw galat;
    }
  } else {
    if (Buffer.byteLength(teks || '', 'utf8') > b.ukuranByte) throw galatBerkasBesar(b.ukuranByte);
    isi = rapikanTeks(teks || '');
    jenis = 'tempel';
  }
  if (!isi) throw new GalatApi('VALIDASI_GAGAL', 'Isi modul kosong.', { teks: 'kosong' });

  const panjang = jumlahKarakter(isi);
  if (panjang > b.karakterMaks) {
    throw new GalatApi(
      'TEKS_TERLALU_PANJANG',
      `Teks modul terlalu panjang (${angka(panjang)} karakter). Maksimal ${angka(b.karakterMaks)} karakter; bagi menjadi beberapa modul.`,
      { karakter_maks: angka(b.karakterMaks), jumlah_karakter: angka(panjang) }
    );
  }

  const potongan = potongTeks(isi);
  const modul = {
    id: buatUuid(),
    penggunaId,
    mapelId: mapel_id,
    judul,
    isi,
    jumlahKarakter: panjang,
    jenis,
    namaBerkas: berkas ? namaTampilan(berkas.originalname) : null,
    waktu: sekarangUntukDb(),
    potongan,
  };
  if (!(await repo.simpanDenganBatas(modul, b.jumlahMaks))) throw galatBatasModul(b.jumlahMaks);
  return {
    ...ringkas({ ...modul, mapel_id, jumlah_karakter: panjang, nama_berkas: modul.namaBerkas, diunggah_pada: modul.waktu }),
    jumlah_potongan: potongan.length,
  };
}

async function daftar(penggunaId) {
  return (await repo.daftarMilik(penggunaId)).map(ringkas);
}

async function ambil(penggunaId, id) {
  const m = await repo.ambilMilik(penggunaId, id);
  if (!m) throw new GalatApi('TIDAK_DITEMUKAN', 'Modul tidak ditemukan.');
  return { ...ringkas(m), isi: m.isi };
}

async function cari(penggunaId, q) {
  const baris = await repo.cariMilik(penggunaId, q, HASIL_CARI_MAKS);
  return baris.map((p) => ({
    modul_id: p.modul_id,
    judul: p.judul,
    mapel_id: p.mapel_id,
    urutan: p.urutan,
    potongan: p.isi,
    skor: Math.round(Number(p.skor) * 1000) / 1000,
  }));
}

/**
 * Bahan Latihan dari modul sendiri (pilihan percakapan 15 Okt 2026, belum disetujui PM): modul
 * yang diunggah ikut menjadi Arsip Belajar yang bisa dilatih, jadi ikut dihitung Level-In.
 * `per_mapel` = semua potongan per mapel (untuk pilihan mapel di Latihan); `potongan` = contoh
 * acak per mapel, cukup untuk satu sesi (BATAS_SESI di LANJUT_App/lib/latihan.ts).
 */
async function untukLatihan(penggunaId) {
  const [perMapel, potongan] = await Promise.all([
    repo.jumlahPotonganPerMapel(penggunaId),
    repo.potonganUntukLatihan(penggunaId, POTONGAN_LATIHAN_PER_MAPEL),
  ]);
  return {
    per_mapel: perMapel,
    potongan: potongan.map((p) => ({
      modul_id: p.modul_id,
      judul: p.judul,
      mapel_id: p.mapel_id,
      urutan: Number(p.urutan),
      jumlah_bagian: Number(p.jumlah_bagian),
      isi: p.isi,
    })),
  };
}

// --- hapus permanen & perapian indeks FULLTEXT ---------------------------------
// InnoDB menyimpan kata dari baris FULLTEXT yang dihapus sampai tabel
// dirapikan. Setelah setiap penghapusan, perapian dijadwalkan (digabung bila
// banyak hapus berdekatan) supaya kata modul yang dihapus tidak tertinggal.
let jadwalRapikan = null;

function jadwalkanRapikanIndeks() {
  if (jadwalRapikan) return;
  jadwalRapikan = setTimeout(() => {
    jadwalRapikan = null;
    repo.rapikanIndeks().catch((galat) => console.error(`[modul] perapian indeks gagal: ${galat.message}`));
  }, JEDA_RAPIKAN_INDEKS_MS);
  jadwalRapikan.unref();
}

/** Untuk tes & skrip: rapikan sekarang dan batalkan jadwal yang tertunda. */
async function rapikanIndeksSekarang() {
  if (jadwalRapikan) clearTimeout(jadwalRapikan);
  jadwalRapikan = null;
  await repo.rapikanIndeks();
}

async function hapus(penggunaId, id) {
  if (!(await repo.hapusMilik(penggunaId, id))) throw new GalatApi('TIDAK_DITEMUKAN', 'Modul tidak ditemukan.');
  jadwalkanRapikanIndeks();
}

async function hapusSemua(penggunaId) {
  const jumlah = await repo.hapusSemuaMilik(penggunaId);
  if (jumlah) jadwalkanRapikanIndeks();
  return jumlah;
}

module.exports = {
  batas,
  unggah,
  daftar,
  ambil,
  cari,
  untukLatihan,
  hapus,
  hapusSemua,
  rapikanIndeksSekarang,
  galatBerkasBesar,
  PESAN,
  POTONGAN_LATIHAN_PER_MAPEL,
};
