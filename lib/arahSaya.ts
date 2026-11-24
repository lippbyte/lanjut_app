/**
 * Logika murni dan teks draf layar Arah Saya (Beranda v2, LANJUT_031).
 * Modul murni (tanpa React/Expo) supaya bisa diuji langsung dari server/tests.
 *
 * TEKS DRAF — docs/draf-teks-navigasi-v2.md, belum disetujui Khalifa.
 * Nada: pendek, menenangkan, tanpa janji hasil, tanpa tekanan, tanpa klaim privasi baru.
 * Batas teks tetap per layar: maksimal 40 kata (di luar data milik siswa seperti nama,
 * judul langkah, dan daftar alat belajar yang dilipat).
 */
import type { ButirDaftarPeriksa, ButirPribadi, EventSekolah, JalurMinat, Kemajuan, PilihanJalur, TahapanLinimasa } from '../api/types';
import { eventTerdekat, labelJenis, selisihHari, teksHitungMundur, untukPersiapanEvent } from './eventSekolah';
import { jalurDisetujuiSaja, labelJalur } from './jalurSayaV2';
import { untukKelas12, type Kelas } from './jenjang';
import { formatTanggal, hariIniWib, tanggalMomen, turunkanLinimasa } from './linimasa';
import type { SaklarNavigasiV2 } from './navigasiV2';
import type { TandaArah } from './tandaArah';

/** Batas kata teks tetap per layar Arah Saya (LANJUT_031 §3). */
export const BATAS_KATA_ARAH_SAYA = 40;

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-navigasi-v2.md).
export const TEKS_ARAH_SAYA = {
  sapaanKosong: 'Halo',
  sapaanAwal: 'Halo,',

  arahkuJudul: 'Arahku',
  pilihArahmu: 'Pilih arahmu',
  belumTahu: 'Belum menentukan arah.',
  ubahArah: 'Ubah',
  // Aturan LANJUT_026: label netral untuk jalur yang masih draf/nonaktif; tidak pernah memuat id draf.
  jalurBelumTersedia: 'Jalur belum tersedia',

  langkahJudul: 'Langkah berikutnya',
  kosongJudul: 'Belum ada langkah',
  kosongTeks: 'Mulai pelan saja.',
  kosongTombolJelajah: 'Jelajah',
  kosongTombolLangkah: 'Langkah Saya',

  pintuRekamJejakJudul: 'Rekam Jejak',
  pintuRekamJejakKeterangan: 'Catat karya dan prosesmu.',
  pintuJelajahJudul: 'Jelajah',
  pintuJelajahKeterangan: 'Kenali bidang.',
  pintuJalurSayaJudul: 'Jalur Saya',
  pintuJalurSayaKeterangan: 'Atur tujuanmu.',
  pintuLangkahSayaJudul: 'Langkah Saya',
  pintuLangkahSayaKeterangan: 'Daftar langkahmu.',

  alatBelajarJudul: 'Alat belajar',

  memuatLabel: 'Memuat Arah Saya',
  galatJudul: 'Belum bisa memuat',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
  tutupArah: 'Tutup',
  kembali: 'Kembali',
  bukaAkunPrivasi: 'Akun & Privasi',
  bukaLangkahSaya: 'Langkah Saya',
} as const;

export function hitungKata(teks: string): number {
  const bersih = teks.trim();
  return bersih ? bersih.split(/\s+/).length : 0;
}

/** Sapaan dengan nama panggilan yang ada di profil; tanpa nama bila keduanya kosong. */
export function teksSapaanV2(
  pengguna: { nama_tampilan?: string | null; nama_pengguna?: string | null } | null | undefined
): string {
  const nama = pengguna?.nama_tampilan?.trim() || pengguna?.nama_pengguna?.trim() || '';
  return nama ? `${TEKS_ARAH_SAYA.sapaanAwal} ${nama}` : TEKS_ARAH_SAYA.sapaanKosong;
}

export type ChipArah = {
  id: string;
  label: string;
  tersembunyi: boolean;
};

export type HasilArahku =
  | { keadaan: 'ada_jalur'; chip: ChipArah[]; adaIdDrafTerbuang: boolean }
  | { keadaan: 'belum_tahu'; chip: []; adaIdDrafTerbuang: false }
  | { keadaan: 'belum_memilih'; chip: []; adaIdDrafTerbuang: false };

/**
 * Tiga keadaan Arahku (LANJUT_031 §3.2):
 * 1. `ada_jalur`: siswa punya minimal satu babak jalur berstatus aktif.
 *    Jalur yang `jalur_belum_tersedia` atau id-nya tidak ada di daftar disetujui
 *    ditampilkan dengan label netral — id mentah dan teks draf tidak pernah tampil.
 * 2. `belum_tahu`: belum punya jalur aktif, tetapi sudah menjawab di layar kecenderungan 030
 *    (tanda lokal `'dijawab'`).
 * 3. `belum_memilih`: belum memilih jalur dan belum menjawab (`tanda` null atau `'kosong'`).
 */
export function keadaanArahku(p: {
  pilihan: readonly PilihanJalur[] | null | undefined;
  daftarJalur: readonly JalurMinat[] | null | undefined;
  tanda: TandaArah | null | undefined;
}): HasilArahku {
  const aktif = (p.pilihan ?? []).filter((x) => x.status === 'aktif');
  if (aktif.length > 0) {
    const idDisetujui = new Set(jalurDisetujuiSaja(p.daftarJalur).map((j) => j.id));
    let adaIdDrafTerbuang = false;
    const chip: ChipArah[] = aktif.map((b) => {
      const label = labelJalur(b, p.daftarJalur) ?? TEKS_ARAH_SAYA.jalurBelumTersedia;
      if (b.jalur_belum_tersedia || !b.jalur_minat_id) {
        return { id: b.id, label, tersembunyi: true };
      }
      if (!idDisetujui.has(b.jalur_minat_id)) {
        // Penjaga lapis kedua: bila id draf sempat muncul di data, jangan pernah ditampilkan.
        adaIdDrafTerbuang = true;
        return { id: b.id, label, tersembunyi: true };
      }
      return { id: b.id, label, tersembunyi: false };
    });
    return { keadaan: 'ada_jalur', chip, adaIdDrafTerbuang };
  }
  if (p.tanda === 'dijawab') {
    return { keadaan: 'belum_tahu', chip: [], adaIdDrafTerbuang: false };
  }
  return { keadaan: 'belum_memilih', chip: [], adaIdDrafTerbuang: false };
}

export type SumberLangkah = 'butir_pribadi' | 'butir_daftar_periksa' | 'event_sekolah' | 'tahapan_linimasa';

export type LangkahBerikutnya = {
  judul: string;
  keterangan?: string;
  href: '/langkah-saya' | '/jejak-waktu';
  sumber: SumberLangkah;
};

/**
 * Memilih tepat satu "Langkah berikutnya" dari data nyata milik siswa atau data terverifikasi
 * di basis data (tanpa mengarang tanggal atau butir):
 *   1. `butir_pribadi`: butir pribadi pertama yang belum selesai;
 *   2. `butir_daftar_periksa` + `kemajuan_pengguna` (kelas 12): butir pertama yang belum dicentang;
 *   3. `event_sekolah` (kelas 7–9): event sekolah terdekat (≤ 7 hari);
 *   4. `tahapan_linimasa` (kelas 12): tahapan linimasa terverifikasi aktif/terdekat.
 * Bila semua kosong → null (layar menampilkan keadaan kosong ramah dengan maskot kelinci).
 */
export function pilihLangkahBerikutnya(p: {
  kelas: Kelas | null | undefined;
  butirPribadi?: readonly ButirPribadi[] | null;
  butirUmum?: readonly ButirDaftarPeriksa[] | null;
  kemajuan?: readonly Kemajuan[] | null;
  eventSekolah?: readonly EventSekolah[] | null;
  namaMapel?: Readonly<Record<string, string>>;
  tahapanLinimasa?: readonly TahapanLinimasa[] | null;
  hariIniMs?: number;
}): LangkahBerikutnya | null {
  const pribadiBelum = (p.butirPribadi ?? []).find((b) => !b.selesai_pada);
  if (pribadiBelum) {
    return {
      judul: pribadiBelum.judul,
      href: '/langkah-saya',
      sumber: 'butir_pribadi',
    };
  }

  if (untukKelas12(p.kelas)) {
    const selesai = new Set((p.kemajuan ?? []).filter((k) => Boolean(k.selesai_pada)).map((k) => k.butir_id));
    const umumBelum = (p.butirUmum ?? [])
      .slice()
      .sort((a, b) => a.urutan - b.urutan)
      .find((b) => !selesai.has(b.id));
    if (umumBelum) {
      return {
        judul: umumBelum.judul,
        href: '/langkah-saya',
        sumber: 'butir_daftar_periksa',
      };
    }
  }

  const hariIni = p.hariIniMs ?? hariIniWib();

  if (untukPersiapanEvent(p.kelas)) {
    const terdekat = eventTerdekat(p.eventSekolah ?? [], hariIni);
    if (terdekat) {
      const jenis = labelJenis(terdekat.jenis);
      const mapel = terdekat.mapel_id ? p.namaMapel?.[terdekat.mapel_id] : undefined;
      const judul = mapel ? `${jenis} · ${mapel}` : jenis;
      const sisa = selisihHari(terdekat.tanggal, hariIni) ?? 0;
      return {
        judul,
        keterangan: teksHitungMundur(sisa),
        href: '/langkah-saya',
        sumber: 'event_sekolah',
      };
    }
  }

  if (untukKelas12(p.kelas) && (p.tahapanLinimasa?.length ?? 0) > 0) {
    const { terdekat, momen } = turunkanLinimasa([...p.tahapanLinimasa!], hariIni);
    if (terdekat && momen) {
      return {
        judul: terdekat.judul,
        keterangan: formatTanggal(tanggalMomen(terdekat, momen)),
        href: '/jejak-waktu',
        sumber: 'tahapan_linimasa',
      };
    }
  }

  return null;
}

export type PintuArahSaya = {
  id: 'rekam_jejak' | 'jelajah' | 'jalur_saya' | 'langkah_saya';
  judul: string;
  keterangan: string;
  href: '/portofolio' | '/discover' | '/jalur-tujuan' | '/langkah-saya';
  /** Rekam Jejak diberi bobot visual terbesar (`utama`) bila saklarnya menyala. */
  bobot: 'utama' | 'biasa';
};

/**
 * Daftar kartu pintu besar di Arah Saya.
 * - Rekam Jejak HANYA tampil bila `EXPO_PUBLIC_PORTOFOLIO` menyala, dengan bobot visual terbesar.
 * - Jelajah HANYA tampil bila `EXPO_PUBLIC_DISCOVER` menyala.
 * - Jalur Saya HANYA tampil bila `EXPO_PUBLIC_JALUR_TUJUAN` menyala.
 * - Langkah Saya selalu tampil.
 */
export function daftarPintuArahSaya(saklar: SaklarNavigasiV2): PintuArahSaya[] {
  const daftar: PintuArahSaya[] = [];
  if (saklar.portofolio) {
    daftar.push({
      id: 'rekam_jejak',
      judul: TEKS_ARAH_SAYA.pintuRekamJejakJudul,
      keterangan: TEKS_ARAH_SAYA.pintuRekamJejakKeterangan,
      href: '/portofolio',
      bobot: 'utama',
    });
  }
  if (saklar.discover) {
    daftar.push({
      id: 'jelajah',
      judul: TEKS_ARAH_SAYA.pintuJelajahJudul,
      keterangan: TEKS_ARAH_SAYA.pintuJelajahKeterangan,
      href: '/discover',
      bobot: 'biasa',
    });
  }
  if (saklar.jalurTujuan) {
    daftar.push({
      id: 'jalur_saya',
      judul: TEKS_ARAH_SAYA.pintuJalurSayaJudul,
      keterangan: TEKS_ARAH_SAYA.pintuJalurSayaKeterangan,
      href: '/jalur-tujuan',
      bobot: 'biasa',
    });
  }
  daftar.push({
    id: 'langkah_saya',
    judul: TEKS_ARAH_SAYA.pintuLangkahSayaJudul,
    keterangan: TEKS_ARAH_SAYA.pintuLangkahSayaKeterangan,
    href: '/langkah-saya',
    bobot: 'biasa',
  });
  return daftar;
}

/** Tujuan tombol pada keadaan kosong "Langkah berikutnya": Jelajah bila menyala, else Langkah Saya. */
export function aksiKosongLangkah(discoverAktif: boolean): { label: string; href: '/discover' | '/langkah-saya' } {
  return discoverAktif
    ? { label: TEKS_ARAH_SAYA.kosongTombolJelajah, href: '/discover' }
    : { label: TEKS_ARAH_SAYA.kosongTombolLangkah, href: '/langkah-saya' };
}

/**
 * Daftar teks tetap yang tampil di layar Arah Saya untuk pemeriksaan batas 40 kata (di luar
 * data milik siswa seperti nama, judul langkah, dan isi Alat belajar yang terlipat).
 */
export function teksTetapArahSaya(p: {
  saklar: SaklarNavigasiV2;
  arahku: 'ada_jalur' | 'ada_jalur_draf' | 'belum_tahu' | 'belum_memilih';
  langkahKosong: boolean;
}): string[] {
  const hasil: string[] = [TEKS_ARAH_SAYA.sapaanKosong, TEKS_ARAH_SAYA.arahkuJudul];
  if (p.arahku === 'ada_jalur_draf') hasil.push(TEKS_ARAH_SAYA.jalurBelumTersedia);
  if (p.arahku === 'belum_memilih') hasil.push(TEKS_ARAH_SAYA.pilihArahmu);
  if (p.arahku === 'belum_tahu') hasil.push(TEKS_ARAH_SAYA.belumTahu, TEKS_ARAH_SAYA.ubahArah);

  hasil.push(TEKS_ARAH_SAYA.langkahJudul);
  if (p.langkahKosong) {
    hasil.push(TEKS_ARAH_SAYA.kosongJudul, TEKS_ARAH_SAYA.kosongTeks, aksiKosongLangkah(p.saklar.discover).label);
  }
  for (const pintu of daftarPintuArahSaya(p.saklar)) {
    hasil.push(pintu.judul, pintu.keterangan);
  }
  hasil.push(TEKS_ARAH_SAYA.alatBelajarJudul);
  return hasil;
}
