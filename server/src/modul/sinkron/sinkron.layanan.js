// Aturan bisnis klaim data tamu — docs/SDD-Backend-Foundation.md §6.3.
// Tiga hal yang dikunci di sana dan dijaga di sini:
//   1. Klaim sekali & eksplisit — dipanggil manual oleh klien, bukan otomatis.
//   2. Idempoten — id/kunci gabungan yang sama tidak menggandakan apa pun.
//   3. Baris yang SUDAH dimiliki pengguna lain DITOLAK (TIDAK_BERHAK per baris),
//      TIDAK PERNAH memindahkan kepemilikan.
//
// LANJUT_042 (audit): rujukan di dalam setiap baris kini diperiksa SEBELUM
// baris itu ditulis (pola LANJUT_041), tetap dengan penolakan per baris:
//   - sesi_id / kartu_id yang bukan milik pengklaim → tautannya dilepas;
//   - mapel_id / butir_id tak dikenal → baris ditolak VALIDASI_GAGAL;
//   - kartu diklaim lebih dulu, supaya catatan boleh merujuk kartu tamu yang
//     diklaim di permintaan yang sama.
// Dulu akun B bisa menautkan riwayatnya ke sesi/kartu pribadi akun A, dan
// rujukan tak dikenal jatuh ke pelanggaran FK (500) setelah sebagian baris
// tertulis.

const { sekarangUntukDb, keDbDariKlien } = require('../../util/waktu');
const penggunaRepo = require('../pengguna/pengguna.repo');
const { petakanProdiTujuan } = require('../auth/auth.layanan');
const { tentukanJenisSekolah } = require('../../util/kelas');
const kontenRepo = require('../konten/konten.repo');
const kemajuanRepo = require('../kemajuan/kemajuan.repo');
const kartuRepo = require('../kartu/kartu.repo');
const levelinRepo = require('../levelin/levelin.repo');
const keputusan = require('../levelin/keputusan');
const { bentukKonfig } = require('../levelin/konfigurasi');
const sinkronRepo = require('./sinkron.repo');

async function klaimProfil(penggunaId, profil) {
  if (!profil) return;
  const perubahan = {};
  if (profil.kelas !== undefined) {
    perubahan.kelas = profil.kelas;
    // LANJUT_038: klaim tidak membawa jenis sekolah; selaraskan dengan kelas.
    const lama = await penggunaRepo.cariProfil(penggunaId);
    perubahan.jenisSekolah = tentukanJenisSekolah(profil.kelas, undefined, lama ? lama.jenis_sekolah : null);
  }
  if (profil.prodi_impian !== undefined) {
    const prodiTujuan = petakanProdiTujuan(profil.prodi_impian);
    // C-2b: klaim bersifat "gagal sebagian, bisa dicoba lagi" (§6.3/A4), jadi
    // prodi yang tidak dikenal TIDAK menggagalkan seluruh permintaan klaim
    // (yang bisa memuat kemajuan/peristiwa/kartu lain) — cukup diabaikan
    // diam-diam, bukan 500 karena pelanggaran FK.
    if (!prodiTujuan || (await kontenRepo.prodiAda(prodiTujuan))) {
      perubahan.prodiTujuan = prodiTujuan;
    }
  }
  if (Object.keys(perubahan).length > 0) {
    await penggunaRepo.updateProfil(penggunaId, perubahan);
  }
}

async function klaimKemajuan(penggunaId, daftar) {
  const hasil = { diterima: 0, ditolak: [] };
  for (const item of daftar || []) {
    // Butir umum tak dikenal dulu jatuh ke FK kemajuan → 500.
    if (!(await kemajuanRepo.butirAda(item.butir_id))) {
      hasil.ditolak.push({ butir_id: item.butir_id, alasan: 'VALIDASI_GAGAL' });
      continue;
    }
    if (item.selesai_pada) {
      await kemajuanRepo.tandaiSelesai(
        penggunaId,
        item.butir_id,
        keDbDariKlien(item.selesai_pada)
      );
    }
    hasil.diterima += 1;
  }
  return hasil;
}

/**
 * Rujukan satu catatan, diperiksa SEBELUM ditulis. Klaim tidak membawa sesi
 * (sesi tamu tidak pernah ada di server), jadi sesi_id/kartu_id yang bukan
 * milik pengklaim tidak menggagalkan baris — tautannya dilepas (NULL) dan
 * jawabannya tetap dibawa. "Milik akun lain" dan "tidak ada" diperlakukan
 * sama, supaya klaim tidak bisa dipakai menebak id milik orang lain.
 * Kartu yang sah: milik sendiri atau kurasi terverifikasi (LANJUT_040);
 * mapel_id lalu diambil dari kartunya.
 */
async function periksaRujukanCatatan(penggunaId, catatan) {
  let dilepas = false;
  let sesiId = null;
  if (catatan.sesi_id) {
    if (await levelinRepo.sesiMilikSendiri(penggunaId, catatan.sesi_id)) sesiId = catatan.sesi_id;
    else dilepas = true;
  }
  let kartuId = null;
  let mapelId = catatan.mapel_id || null;
  if (catatan.kartu_id) {
    const kartu = await kartuRepo.ambilUntukDijawab(penggunaId, catatan.kartu_id);
    if (kartu) {
      kartuId = kartu.id;
      mapelId = kartu.mapel_id;
    } else {
      dilepas = true;
    }
  }
  const mapelSah = kartuId || !mapelId || (await levelinRepo.mapelAda(mapelId));
  return { sesiId, kartuId, mapelId, dilepas, mapelSah };
}

async function klaimPeristiwa(penggunaId, daftar) {
  const hasil = { diterima: 0, ditolak: [], tautan_dilepas: 0 };
  let cfg = null; // ambang berlaku, dimuat sekali bila ada catatan berkeyakinan
  for (const catatan of daftar || []) {
    const pemilikSaatIni = await sinkronRepo.pemilikRiwayat(catatan.id);
    if (pemilikSaatIni !== undefined && pemilikSaatIni !== penggunaId) {
      hasil.ditolak.push({ id: catatan.id, alasan: 'TIDAK_BERHAK' });
      continue;
    }
    const rujukan = await periksaRujukanCatatan(penggunaId, catatan);
    if (!rujukan.mapelSah) {
      hasil.ditolak.push({ id: catatan.id, alasan: 'VALIDASI_GAGAL' });
      continue;
    }
    let gapNumerik = null;
    let kelasGap = null;
    let aturanVersi = catatan.aturan_versi;
    if (catatan.keyakinan !== null && catatan.keyakinan !== undefined) {
      if (!cfg) cfg = bentukKonfig(await levelinRepo.ambilSemuaKonfigurasi());
      gapNumerik = keputusan.gapNumerik(catatan.keyakinan, catatan.benar);
      kelasGap = keputusan.klasifikasiKartu(catatan.keyakinan, catatan.benar, cfg);
      aturanVersi = cfg.aturan_versi;
    }
    await levelinRepo.simpanSatuRiwayat(penggunaId, {
      id: catatan.id,
      kartuId: rujukan.kartuId,
      benar: catatan.benar,
      dijawabPada: keDbDariKlien(catatan.waktu),
      sesiId: rujukan.sesiId,
      keyakinan: catatan.keyakinan,
      mapelId: rujukan.mapelId,
      gapNumerik,
      kelasGap,
      aturanVersi,
    });
    if (rujukan.dilepas) hasil.tautan_dilepas += 1;
    hasil.diterima += 1;
  }
  return hasil;
}

async function klaimKartu(penggunaId, daftar) {
  const hasil = { diterima: 0, ditolak: [] };
  for (const kartu of daftar || []) {
    const pemilikSaatIni = await sinkronRepo.pemilikKartu(kartu.id);
    if (pemilikSaatIni !== undefined && pemilikSaatIni !== penggunaId) {
      hasil.ditolak.push({ id: kartu.id, alasan: 'TIDAK_BERHAK' });
      continue;
    }
    if (pemilikSaatIni === undefined) {
      const mapelAda = await kartuRepo.mapelAda(kartu.mapel_id);
      if (!mapelAda) {
        hasil.ditolak.push({ id: kartu.id, alasan: 'VALIDASI_GAGAL' });
        continue;
      }
      const waktu = kartu.dibuat_pada ? keDbDariKlien(kartu.dibuat_pada) : sekarangUntukDb();
      await kartuRepo.buatKartu({
        id: kartu.id,
        pemilikId: penggunaId,
        mapelId: kartu.mapel_id,
        judul: kartu.judul,
        isi: kartu.isi,
        jawaban: kartu.jawaban,
        waktu,
      });
    }
    // Sudah ada & milik sendiri → idempoten, tidak ditulis ulang (bukan
    // "tulisan terbaru menang" di sini karena ini klaim satu-kali, bukan
    // sinkronisasi berkelanjutan §6.4).
    hasil.diterima += 1;
  }
  return hasil;
}

async function klaim(penggunaId, body) {
  await klaimProfil(penggunaId, body.profil);
  const kemajuan = await klaimKemajuan(penggunaId, body.kemajuan);
  // Kartu lebih dulu: catatan boleh merujuk kartu yang diklaim bersamanya.
  const kartu = await klaimKartu(penggunaId, body.kartu);
  const peristiwa = await klaimPeristiwa(penggunaId, body.peristiwa);
  return { kemajuan, peristiwa, kartu };
}

module.exports = { klaim };
