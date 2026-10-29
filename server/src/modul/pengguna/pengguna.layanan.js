const { GalatApi } = require('../../util/respons');
const { tentukanJenisSekolah } = require('../../util/kelas');
const penggunaRepo = require('./pengguna.repo');
const kontenRepo = require('../konten/konten.repo');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');
const mapelPilihan = require('./mapel-pilihan');
const {
  petakanProdiTujuan,
  pastikanProdiValid,
  bentukProfil,
  larikMinat,
} = require('../auth/auth.layanan');

/**
 * LANJUT_075: bidang minat hanya disimpan bila akun sudah menerima kebijakan
 * privasi versi yang berlaku (siswa di bawah 18 tahun; berlaku untuk semua
 * kelas). Gerbang dulu, baru isi — akun tanpa persetujuan tidak mendapat
 * petunjuk daftar rumpun yang sah. Nilai harus persis salah satu prodi.rumpun.
 */
async function pastikanMinatRumpunBoleh(penggunaId, minatRumpun) {
  if (!(await persetujuanLayanan.kebijakanDiterima(penggunaId))) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu supaya bidang minatmu bisa disimpan.');
  }
  const sah = new Set(await kontenRepo.ambilDaftarRumpun());
  if (minatRumpun.some((r) => !sah.has(r))) {
    throw new GalatApi('RUMPUN_TIDAK_SAH', 'Bidang minat tidak dikenal.', { minat_rumpun: 'tidak dikenal' });
  }
}

/**
 * LANJUT_079: mapel pilihan harus id mapel yang ada; untuk kelas 12 juga harus
 * termasuk kelompok rumpun favoritnya. Batas 5 sudah dicek skema. Tanpa gerbang
 * AI/kebijakan (task 079 §C.12).
 */
async function pastikanMapelPilihanBoleh(kelas, minatRumpun, daftar) {
  const ada = new Set((await kontenRepo.ambilMapel()).map((m) => m.id));
  if (daftar.some((id) => !ada.has(id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel pilihan tidak dikenal.', { mapel_pilihan: 'Mapel tidak dikenal.' });
  }
  if (mapelPilihan.modePilihan(kelas) === 'rumpun') {
    const boleh = await mapelPilihan.mapelBoleh(kelas, minatRumpun);
    if (daftar.some((id) => !boleh.has(id))) {
      throw new GalatApi('VALIDASI_GAGAL', 'Mapel pilihan harus dari rumpun favoritmu.', {
        mapel_pilihan: 'Mapel harus dari rumpun favoritmu.',
      });
    }
  }
}

/**
 * Kesiapan ujian (pilihan percakapan 15 Okt 2026, belum disetujui PM): penilaian
 * siswa tentang dirinya sendiri, jadi — seperti bidang minat (LANJUT_075) — hanya
 * disimpan bila kebijakan privasi versi berlaku sudah diterima. Mengosongkan (null)
 * tidak perlu gerbang.
 */
async function pastikanKesiapanBoleh(penggunaId, kesiapan) {
  if (kesiapan !== null && !(await persetujuanLayanan.kebijakanDiterima(penggunaId))) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu supaya kesiapanmu bisa disimpan.');
  }
}

async function ubahProfil(
  penggunaId,
  { kelas, jenis_sekolah, prodi_impian, nama_tampilan, gaya_belajar, minat_rumpun, mapel_pilihan, kesiapan_ujian }
) {
  const perubahan = {};
  const perluLama = kelas !== undefined || jenis_sekolah !== undefined || minat_rumpun !== undefined || mapel_pilihan !== undefined;
  const lama = perluLama ? await penggunaRepo.cariProfil(penggunaId) : null;
  if (perluLama && !lama) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  const kelasBaru = kelas !== undefined ? kelas : lama && lama.kelas;

  if (kelas !== undefined) perubahan.kelas = kelas;
  // LANJUT_038: jenis sekolah selalu diselaraskan dengan kelas yang berlaku
  // sesudah perubahan (mis. kelas 8 → 11 mengosongkan SMP lama).
  if (kelas !== undefined || jenis_sekolah !== undefined) {
    perubahan.jenisSekolah = tentukanJenisSekolah(kelasBaru, jenis_sekolah, lama.jenis_sekolah);
  }
  if (prodi_impian !== undefined) {
    perubahan.prodiTujuan = petakanProdiTujuan(prodi_impian);
    // C-2b: validasi keberadaan prodi juga di jalur PATCH /pengguna/saya,
    // supaya prodi yang tidak dikenal tidak jatuh ke pelanggaran FK (500).
    await pastikanProdiValid(perubahan.prodiTujuan);
  }
  if (nama_tampilan !== undefined) perubahan.namaTampilan = nama_tampilan;
  if (gaya_belajar !== undefined) perubahan.gayaBelajar = gaya_belajar;
  // Semua pemeriksaan selesai sebelum menulis: permintaan yang ditolak tidak
  // mengubah medan lain yang ikut dikirim.
  if (minat_rumpun !== undefined) {
    await pastikanMinatRumpunBoleh(penggunaId, minat_rumpun);
    // LANJUT_079: rumpun favorit kelas 12 paling banyak 3 (kelas lain tetap batas skema, 5).
    if (mapelPilihan.modePilihan(kelasBaru) === 'rumpun' && minat_rumpun.length > mapelPilihan.MAKS_RUMPUN_KELAS12) {
      throw new GalatApi('VALIDASI_GAGAL', `Rumpun favorit paling banyak ${mapelPilihan.MAKS_RUMPUN_KELAS12}.`, {
        minat_rumpun: `Paling banyak ${mapelPilihan.MAKS_RUMPUN_KELAS12} untuk kelas 12.`,
      });
    }
    perubahan.minatRumpun = minat_rumpun;
  }
  const minatBaru = minat_rumpun !== undefined ? minat_rumpun : lama && larikMinat(lama.minat_rumpun);
  if (mapel_pilihan !== undefined) {
    await pastikanMapelPilihanBoleh(kelasBaru, minatBaru, mapel_pilihan);
    perubahan.mapelPilihan = mapel_pilihan;
  } else if (mapelPilihan.modePilihan(kelasBaru) === 'rumpun' && (minat_rumpun !== undefined || kelas !== undefined)) {
    // LANJUT_079: kelas 12 yang mengganti rumpun (atau baru naik ke kelas 12) —
    // mapel tersimpan yang tidak lagi termasuk rumpun favoritnya dilepas.
    const tersimpan = larikMinat(lama.mapel_pilihan);
    const boleh = await mapelPilihan.mapelBoleh(kelasBaru, minatBaru);
    const sisa = tersimpan.filter((id) => boleh.has(id));
    if (sisa.length !== tersimpan.length) perubahan.mapelPilihan = sisa;
  }
  if (kesiapan_ujian !== undefined) {
    await pastikanKesiapanBoleh(penggunaId, kesiapan_ujian);
    perubahan.kesiapanUjian = kesiapan_ujian;
  }

  await penggunaRepo.updateProfil(penggunaId, perubahan);

  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  return bentukProfil(profil);
}

/** GET /pengguna/saya — profil yang sama dengan /auth/saya. */
async function profilSaya(penggunaId) {
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  return bentukProfil(profil);
}

/** GET /pengguna/saya/pilihan-mapel — isi layar Pilih Mapel (kelas 12) / Mapel Saya (kelas lain). */
async function pilihanMapel(penggunaId) {
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  return mapelPilihan.isiLayar({
    kelas: profil.kelas,
    minatRumpun: larikMinat(profil.minat_rumpun),
    mapelPilihan: larikMinat(profil.mapel_pilihan),
  });
}

module.exports = { ubahProfil, profilSaya, pilihanMapel };
