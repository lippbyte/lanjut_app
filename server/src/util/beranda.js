// Penentu kartu Beranda per jenjang (LANJUT_064).
// Cermin dari LANJUT_App/lib/beranda.ts untuk pengujian server.

function kelompokJenjang(kelas) {
  if (kelas === '7' || kelas === '8' || kelas === '9') return 'smp';
  if (kelas === '10' || kelas === '11') return 'kelas10_11';
  if (kelas === '12') return 'kelas12';
  return null;
}

const KARTU_ARSIP = {
  id: 'arsip',
  judul: 'Arsip Belajar',
  labelPendek: 'Arsip Belajar',
  keterangan: 'Catatan dan soal buatanmu, disimpan per mapel.',
  ikon: 'mapel',
  href: '/arsip',
};

const KARTU_LEVEL_IN = {
  id: 'level-in',
  judul: 'Level-In',
  labelPendek: 'Level-In',
  keterangan: 'Seberapa kuat kamu di tiap mapel, dari latihanmu.',
  ikon: 'ok',
  href: '/level-in',
};

// LANJUT_075b: kartu Ngobrol dihapus dari grid semua jenjang (tab tengah navigasi).

const KARTU_CERITA_ALUMNI = {
  id: 'cerita-alumni',
  judul: 'Cerita Alumni',
  labelPendek: 'Cerita Alumni',
  keterangan: 'Mereka sudah lewat jalan ini.',
  ikon: 'alumni',
  href: '/cerita-alumni',
  varian: 'outline',
};

const KARTU_CEK_POSISI = {
  id: 'cek-posisi',
  judul: 'Jalur Saya',
  labelPendek: 'Jalur Saya',
  keterangan: 'Lihat kamu lagi di tahap mana dan langkah yang cocok berikutnya.',
  ikon: 'posisi',
  href: '/cek-posisi',
};

const KARTU_PILIH_MAPEL = {
  id: 'pilih-mapel',
  judul: 'Pilih Mapel',
  labelPendek: 'Pilih Mapel',
  keterangan: 'Lihat mapel yang mendukung jurusan incaranmu, dan mana yang ada di sekolahmu.',
  ikon: 'mapel',
  href: '/pilih-mapel',
};

// LANJUT_075: grid memakai nama "Eksplorasi Kampus" untuk /eksplorasi-tujuan.
const KARTU_EKSPLORASI_TUJUAN = {
  id: 'eksplorasi-tujuan',
  judul: 'Eksplorasi Kampus',
  labelPendek: 'Eksplorasi Kampus',
  keterangan: 'Intip prodi kuliah: belajar apa dan lulusannya kerja di mana.',
  ikon: 'posisi',
  href: '/eksplorasi-tujuan',
};

// LANJUT_075c: SMP & 10–11 — keterangan netral tanpa "prodi"; kelas 12 tetap yang lama.
const KARTU_EKSPLORASI_KAMPUS_MINAT = {
  ...KARTU_EKSPLORASI_TUJUAN,
  keterangan: 'Kenali bidang yang cocok untukmu.',
};

const KARTU_GAYA_BELAJAR = {
  id: 'gaya-belajar',
  judul: 'Gaya Belajar',
  labelPendek: 'Gaya Belajar',
  keterangan: 'Kenali cara belajar yang paling nyambung buat kamu.',
  ikon: 'info',
  href: '/gaya-belajar',
};

const KARTU_DAFTAR_PERIKSA = {
  id: 'daftar-periksa',
  judul: 'Daftar Periksa',
  labelPendek: 'Daftar Periksa',
  keterangan: 'Satu per satu, tidak perlu sekaligus.',
  ikon: 'checklist',
  href: '/daftar-periksa',
};

function daftarKartuBeranda(kelas) {
  const kelompok = kelompokJenjang(kelas);

  if (kelompok === 'smp') {
    return [
      KARTU_EKSPLORASI_KAMPUS_MINAT,
      KARTU_GAYA_BELAJAR,
      KARTU_ARSIP,
      KARTU_LEVEL_IN,
      KARTU_CERITA_ALUMNI,
    ];
  }

  if (kelompok === 'kelas10_11') {
    return [
      KARTU_PILIH_MAPEL,
      KARTU_EKSPLORASI_KAMPUS_MINAT,
      KARTU_GAYA_BELAJAR,
      KARTU_ARSIP,
      KARTU_LEVEL_IN,
      KARTU_DAFTAR_PERIKSA,
      KARTU_CERITA_ALUMNI,
    ];
  }

  if (kelompok === 'kelas12') {
    return [
      KARTU_CEK_POSISI,
      KARTU_EKSPLORASI_TUJUAN,
      KARTU_ARSIP,
      KARTU_LEVEL_IN,
      KARTU_CERITA_ALUMNI,
    ];
  }

  return [
    KARTU_ARSIP,
    KARTU_LEVEL_IN,
    KARTU_CERITA_ALUMNI,
  ];
}

/**
 * Informasi Kartu "Mulai dari Sini" per jenjang (LANJUT_065 §B).
 */
function infoMulaiDariSini(kelas) {
  const kelompok = kelompokJenjang(kelas);

  if (kelompok === 'smp') {
    return {
      judul: 'Mulai dari Sini',
      penjelas: 'Kenali minat, cara belajar, dan pilihan jenjang berikutnya pelan-pelan.',
      labelTombol: 'Buka Jenjang Saya',
      href: '/jenjang-saya',
    };
  }

  if (kelompok === 'kelas10_11') {
    return {
      judul: 'Mulai dari Sini',
      penjelas: 'Lihat mata pelajaran pendukung yang cocok untuk jurusan incaranmu.',
      labelTombol: 'Pilih Mapel',
      href: '/pilih-mapel',
    };
  }

  if (kelompok === 'kelas12') {
    return {
      judul: 'Mulai dari Sini',
      penjelas: 'Cek posisi persiapanmu sekarang dan langkah yang perlu diambil.',
      labelTombol: 'Jalur Saya',
      href: '/cek-posisi',
    };
  }

  return {
    judul: 'Mulai dari Sini',
    penjelas: 'Mulai kenali pilihan jenjang dan arah langkahmu.',
    labelTombol: 'Buka Jenjang Saya',
    href: '/jenjang-saya',
  };
}

/**
 * Jumlah centang Daftar Periksa milik akun (LANJUT_070): butir umum di
 * /kemajuan DITAMBAH butir pribadi di /butir-pribadi. Siswa kelas 7–11 hanya
 * mencentang butir pribadi, jadi /kemajuan saja tidak cukup.
 */
function hitungJumlahCentang(data = {}) {
  const selesai = (daftar) => (daftar ?? []).filter((b) => b.selesai_pada).length;
  return selesai(data.kemajuan) + selesai(data.butirPribadi);
}

/**
 * Kriteria kemajuan pengguna (LANJUT_065 §B). `jumlahCentang` berasal dari
 * hitungJumlahCentang (LANJUT_070).
 */
function apakahPunyaKemajuan(data = {}) {
  const centang = data.jumlahCentang ?? 0;
  const latihan = data.jumlahLatihan ?? 0;
  const kartu = data.jumlahKartu ?? 0;
  return centang > 0 || latihan > 0 || kartu > 0;
}

/**
 * Hitungan progres sederhana Beranda (LANJUT_065 §C, diperbaiki LANJUT_067 §A).
 * Langkah isi_kelas dihapus karena onboarding mewajibkan kelas, menyisakan 3 langkah.
 */
function hitungProgresBeranda(data = {}) {
  const langkah = [
    {
      id: 'isi_prodi_impian',
      label: 'Isi prodi impian',
      selesai: Boolean(data.prodiImpian && String(data.prodiImpian).trim() !== ''),
    },
    {
      id: 'centang_daftar_periksa',
      label: 'Centang Daftar Periksa',
      selesai: (data.jumlahCentang ?? 0) > 0,
    },
    {
      id: 'coba_latihan',
      label: 'Coba Latihan',
      selesai: (data.jumlahLatihan ?? 0) > 0,
    },
  ];

  const selesai = langkah.filter((l) => l.selesai).length;
  return {
    selesai,
    total: langkah.length,
    langkah,
  };
}

module.exports = {
  kelompokJenjang,
  daftarKartuBeranda,
  infoMulaiDariSini,
  hitungJumlahCentang,
  apakahPunyaKemajuan,
  hitungProgresBeranda,
  KARTU_ARSIP,
  KARTU_LEVEL_IN,
  KARTU_CERITA_ALUMNI,
  KARTU_CEK_POSISI,
  KARTU_PILIH_MAPEL,
  KARTU_EKSPLORASI_TUJUAN,
  KARTU_GAYA_BELAJAR,
  KARTU_DAFTAR_PERIKSA,
};
