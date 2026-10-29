/**
 * api/types.ts — Bentuk data mengikuti docs/prd-sdd-lanjut.md Bagian 13
 * (Model Data), diverifikasi ulang lewat DUA sumber sungguhan (bukan
 * ditebak dari tabel PRD saja):
 *  1. Kolom SQL nyata di `server/src/modul/konten/konten.repo.js` dan skema
 *     migrasi `server/src/db/migrasi/002_konten_p0.sql` / `003_kemajuan.sql`.
 *  2. Respons `curl` sungguhan dari backend yang jalan lokal (bukan dugaan) —
 *     dari sinilah ketahuan seluruh kolom `id` di database bertipe
 *     VARCHAR(64) (slug, mis. "administrasi-bisnis"), BUKAN integer seperti
 *     draf pertama berkas ini — kalau hanya membaca Bagian 13 PRD ("id")
 *     tanpa mengecek nilai asli, kesalahan ini tidak akan ketahuan.
 */

// SDD Bagian 12: kolom wajib di SETIAP entitas konten resmi (linimasa,
// khusus-smk, prodi, mapel, cerita-alumni, daftar-periksa) — digabung jadi
// satu type supaya tidak ditulis ulang lima kali. `diperiksa_pada` nullable
// karena data seed saat ini benar-benar mengembalikan `null` (belum ada
// tanggal pengecekan resmi) — dikonfirmasi dari respons curl, bukan dugaan.
type MetaSumberResmi = {
  sumber: string;
  pemilik: string;
  status_verifikasi: string;
  asal: string;
  url_sumber: string;
  diperiksa_pada: string | null;
};

// F1 — tahapan_linimasa (konten.repo.js `ambilLinimasa`).
export type TahapanLinimasa = MetaSumberResmi & {
  id: string; // VARCHAR(64) slug, mis. "sosialisasi" — bukan angka
  judul: string;
  tanggal_mulai: string; // ISO date, dikonversi backend lewat util/waktu.keTanggal
  tanggal_selesai: string;
  jalur: 'TKA' | 'SNBP' | 'SNBT';
};

// LANJUT_073 — GET /konten/banner (konten.rute.js, server/src/modul/konten/banner.js).
// Hanya medan publik; status_verifikasi & diperiksa_pada sengaja TIDAK dikirim server.
export type BannerBeranda = {
  id: string;
  judul: string;
  isi: string;
  sumber: string;
  url_sumber: string; // selalu https:// (divalidasi server)
  tanggal_selesai: string; // YYYY-MM-DD, WIB
};

export type ResponsBanner = { banner: BannerBeranda[] };

// F2 — butir_khusus_smk (konten.repo.js `ambilKhususSmk`).
export type ButirKhususSmk = MetaSumberResmi & {
  id: string; // VARCHAR(64) slug, mis. "nilai-rapor"
  judul: string;
  apa_yang_beda: string;
  apa_yang_bisa_dilakukan: string;
  urutan: number;
};

// F3 — prodi (konten.repo.js `ambilProdi`).
export type Prodi = MetaSumberResmi & {
  id: string; // VARCHAR(64) slug, mis. "administrasi-bisnis"
  nama: string;
  rumpun: string;
};

// F10 — profil_prodi (konten.rute.js `bentukProfilProdi`, LANJUT_031). Server
// hanya mengirim profil yang sudah terverifikasi. Tidak ada gaji maupun rasio:
// rasio keketatan dihitung di lib/eksplorasi.ts.
export type StatusSumber = 'Terverifikasi' | 'Perkiraan';
export type KampusProfil = { nama: string; jenis: string; jalur_masuk: string[] };
export type ProfilProdi = MetaSumberResmi & {
  id: string;
  nama: string;
  rumpun: string;
  jenjang: string;
  badge_relevan_smk: boolean;
  peminat: { jumlah: number; kampus: string | null; tahun: number | null; jalur: string | null; sumber: string | null } | null;
  diterima: number | null;
  mata_kuliah: string[];
  profesi: string[];
  kampus: KampusProfil[];
  status_sumber: Partial<Record<'peminat' | 'mata_kuliah' | 'profesi' | 'kampus', StatusSumber>>;
  catatan_studi: string | null;
};

// F3 — mapel (konten.repo.js `ambilMapel`).
export type Mapel = MetaSumberResmi & {
  id: string; // VARCHAR(64) slug, mis. "bahasa-indonesia"
  nama: string;
  tersedia_di_smk: boolean;
};

// F3 — prodi_mapel, tabel penghubung (Bagian 13: prodi_id, mapel_id, bobot).
// `GET /konten/prodi/:id/mapel` mengembalikan mapel hasil JOIN + `bobot` dari
// prodi_mapel (lihat `ambilMapelUntukProdi`), TANPA kolom sumber/pemilik dkk
// karena baris ini representasi relasi, bukan konten mandiri.
export type MapelUntukProdi = {
  id: string;
  nama: string;
  tersedia_di_smk: boolean;
  bobot: number;
};

// F3 — jalur "belum tahu prodi". `GET /konten/mapel/agregasi-lintas-prodi`
// mengembalikan, per mapel, `jumlah_prodi` yang membutuhkannya — dihitung
// backend lewat satu query SQL (JOIN prodi_mapel + GROUP BY mapel_id), BUKAN
// diagregasi di klien dari banyak panggilan `/konten/prodi/:id/mapel`
// (lihat konten.repo.js `ambilAgregasiMapelLintasProdi`).
export type MapelAgregasiLintasProdi = {
  id: string;
  nama: string;
  tersedia_di_smk: boolean;
  jumlah_prodi: number;
};

// F4 — cerita_alumni (konten.repo.js `ambilCeritaAlumniTayang` — sudah
// disaring server-side `izin_tayang=1 AND tayang=1`, dua kolom itu sendiri
// TIDAK dikirim ke klien). Data seed saat ini mengembalikan array KOSONG —
// dikonfirmasi via curl, bukan tebakan — ini kondisi asli PRD Bagian 10
// "Risiko: konten alumni tidak terkumpul", bukan bug lapisan data ini.
export type CeritaAlumni = MetaSumberResmi & {
  id: string;
  nama: string;
  asal_smk: string;
  jurusan_smk: string;
  ptn: string;
  prodi: string;
  jalur: string;
  hambatan: string;
  yang_dilakukan: string;
};

// F5 — butir_daftar_periksa, dikelompokkan per kategori oleh endpoint
// `/konten/checklist` (konten.rute.js) — bentuk ini mengikuti pengelompokan
// itu, bukan tabel mentah, supaya hook tidak mengulang logika pengelompokan.
export type ButirDaftarPeriksa = {
  id: string;
  judul: string;
  urutan: number;
  berlaku_untuk_kelas: string[];
  berlaku_untuk_jalur: string[];
  sumber: string;
  pemilik: string;
  status_verifikasi: string;
  asal: string;
  url_sumber: string | null;
  diperiksa_pada: string | null;
};

export type KategoriDaftarPeriksa = {
  id: string;
  nama: string;
  urutan: number;
  butir: ButirDaftarPeriksa[];
};

export type DaftarPeriksaResponse = {
  kategori: KategoriDaftarPeriksa[];
  total_butir: number;
};

// F5 — kemajuan (Bagian 13: pengguna_id, butir_id, selesai_pada). Endpoint
// `/kemajuan` tidak mengirim balik `pengguna_id` (sudah tersirat dari sesi
// login yang wajib — lihat kemajuan.rute.js `wajibLogin`), jadi tipe ini
// hanya dua kolom yang benar-benar dikembalikan. `butir_id` VARCHAR(64),
// sama seperti `butir_daftar_periksa.id` di atas — bukan angka.
export type Kemajuan = {
  butir_id: string;
  selesai_pada: string | null;
};

// Butir Daftar Periksa milik akun (LANJUT_034, butir-pribadi.layanan.js
// `bentukButir`). Hasil "Simpan" di F3 (mapel_tka) dan F10 (riset_kampus);
// centangnya ada di butir ini sendiri, bukan di /kemajuan.
export type JenisButirPribadi = 'mapel_tka' | 'riset_kampus';
export type ButirPribadi = {
  id: string;
  jenis: JenisButirPribadi;
  prodi_id: string;
  judul: string;
  kategori_id: string;
  kategori_nama: string;
  selesai_pada: string | null;
  dibuat_pada: string;
};
export type SimpanButirPribadi =
  | { jenis: 'mapel_tka'; prodi_id: string; mapel_ids: string[] }
  | { jenis: 'riset_kampus'; prodi_id: string };

// F6 Arsip Belajar (LANJUT_039) — kartu.layanan.js `bentukKartu`. Kategori
// kartu = `mapel_id` (tabel `mapel`, daftar yang sama dengan F3). "Soal" bila
// ada jawaban, "Catatan" bila tidak — diturunkan seperti di PWA, bukan kolom.
export type Kartu = {
  id: string;
  pemilik_id: string | null;
  mapel_id: string;
  judul: string;
  isi: string;
  jawaban: string | null;
  sumber: 'resmi' | 'pengguna' | 'mitra';
  penyedia: string | null;
  dibuat_pada: string;
  diubah_pada: string;
};
export type IsiKartu = { mapel_id: string; judul: string; isi: string; jawaban: string | null };

// F7 Latihan (LANJUT_041) — levelin.layanan.js `daftarSesi` (GET /sesi-latihan).
export type SesiLatihan = {
  id: string;
  dimulai_pada: string;
  selesai_pada: string | null;
  mapel_fokus_id: string | null;
  asal_mula: 'beranda_saran' | 'arsip' | 'arsip_detail';
  jumlah_kartu_direncanakan: number;
  jumlah_dijawab: number;
  jumlah_benar: number;
};
// Satu catatan POST /riwayat-latihan (levelin.skema.js `catatanRiwayatSkema`).
// LANJUT_058: `keyakinan` opsional, skala PWA 1–5 (pemetaan di lib/latihan.ts).
// Jawaban kartu: kartu_id (server mengambil mapelnya dari kartu). Jawaban potongan modul
// (15 Okt 2026): mapel_id saja, tanpa kartu_id — levelin.skema.js menerima keduanya.
export type CatatanLatihan = {
  id: string;
  sesi_id: string;
  kartu_id?: string;
  mapel_id?: string;
  benar: boolean;
  waktu: string;
  keyakinan?: number;
};

// LANJUT_058 — GET /kalibrasi/ringkasan (levelin.layanan.js `ringkasanKalibrasi`):
// satu baris per mapel yang dikenal. Kalibrasi = jawaban BERKEYAKINAN saja;
// level_akurasi = semua jawaban.
export type LevelAkurasi = 'belum_cukup_data' | 'perlu_penguatan_dasar' | 'cukup_lanjut_latihan' | 'sudah_kuat';
export type RingkasanMapel = {
  mapel_id: string;
  kartu_dikerjakan: number;
  n_overconfident: number;
  n_underconfident: number;
  n_selaras: number;
  n_netral: number;
  n_benar: number;
  rate_overconfident: number | null;
  status_data: 'cukup_data' | 'belum_cukup_data';
  pola: 'overconfident' | 'selaras' | 'belum_cukup_data';
  level_akurasi: { kartu_dijawab: number; n_benar: number; rate_benar: number | null; level: LevelAkurasi };
  dihitung_pada: string;
  konfig_versi: number;
};
// GET /saran-harian — rantai fallback PWA §6.1f.
export type SaranHarian = {
  jenis: 'arsip_kosong' | 'saran' | 'kalibrasi_selaras' | 'belum_cukup_data' | 'pengguna_baru';
  mapel_id: string | null;
  alasan: { rate_overconfident: number; kartu_dikerjakan: number } | null;
};
// GET /konfigurasi/levelin (publik) — nilai teks per kunci.
export type KonfigurasiLevelIn = Record<string, { nilai: string; versi: number; dasar: string; diubah_pada: string | null }>;

// LANJUT_047 — GET /persetujuan/saya (persetujuan.layanan.js `statusSaya`).
// Status = catatan terakhir per jenis; riwayat lengkap tidak dikirim.
export type CatatanPersetujuan = {
  status: 'setuju' | 'cabut';
  versi: number;
  sumber: 'mandiri' | 'surat_sekolah' | 'admin' | 'konfirmasi_di_app';
  dicatat_pada: string;
};
export type StatusPersetujuan = {
  kebijakan_privasi: CatatanPersetujuan | null;
  ortu_wali: CatatanPersetujuan | null;
  versi_kebijakan_berlaku: number | null;
  kebijakan_terkini: boolean;
  ortu_wali_aktif: boolean;
  boleh_pakai_ai: boolean;
};

// LANJUT_049 — modul di Arsip Belajar (modul.layanan.js). Isi hanya di GET /modul/:id.
export type JenisModul = 'txt' | 'md' | 'pdf' | 'tempel';
export type ModulRingkas = {
  id: string;
  judul: string;
  mapel_id: string;
  jumlah_karakter: number;
  jenis: JenisModul;
  nama_berkas: string | null;
  diunggah_pada: string;
};
export type Modul = ModulRingkas & { isi: string };
// GET /modul/latihan (modul.layanan.js `untukLatihan`, 15 Okt 2026): potongan modul sebagai bahan Latihan.
export type PotonganLatihan = { modul_id: string; judul: string; mapel_id: string; urutan: number; jumlah_bagian: number; isi: string };
export type BahanModulLatihan = { per_mapel: { mapel_id: string; jumlah: number }[]; potongan: PotonganLatihan[] };
export type HasilCariModul = {
  q: string;
  hasil: { modul_id: string; judul: string; mapel_id: string; urutan: number; potongan: string; skor: number }[];
};

// LANJUT_076 — Persiapan Event (GET/POST /pengguna/event, PATCH/DELETE /pengguna/event/:id).
// LANJUT_076b: + PAS, TKA; hanya kelas 7–9; materi bisa kartu kurasi terverifikasi.
export type JenisEvent = 'UTS' | 'UAS' | 'PAS' | 'Ulangan' | 'TKA' | 'Lainnya';
/** Keterangan kartu yang terhubung, disusun server. `tersedia: false` = kartu dihapus / tidak sah lagi. */
export type MateriEvent =
  | { tersedia: false }
  | { tersedia: true; jenis: 'milik'; judul: string }
  | { tersedia: true; jenis: 'kurasi'; judul: string; isi: string; sumber_nama: string };
export type EventSekolah = {
  id: string;
  jenis: JenisEvent;
  tanggal: string; // YYYY-MM-DD (tanggal WIB)
  mapel_id: string | null;
  materi_teks: string | null;
  kartu_id: string | null;
  materi: MateriEvent | null; // null = tidak ada kartu_id
  dibuat_pada: string;
  diubah_pada: string;
};
/** GET /pengguna/event/pilihan-kartu — kartu yang boleh jadi materi. */
export type PilihanKartuEvent = {
  id: string;
  judul: string;
  mapel_id: string;
  jenis: 'milik' | 'kurasi';
  sumber_nama: string | null;
};
export type IsiEvent = {
  jenis?: JenisEvent;
  tanggal?: string;
  mapel_id?: string | null;
  materi_teks?: string | null;
  kartu_id?: string | null;
};

// LANJUT_051 — Ngobrol dengan AI (POST /ngobrol)
export type PesanNgobrol = { peran: 'pengguna' | 'bot'; teks: string };
// LANJUT_053 — kartu bantuan dibuat server dari berkas konfigurasi (hanya layanan terverifikasi).
export type LayananBantuan = { nama: string; nomor_atau_alamat: string; keterangan: string };
export type KartuBantuan = { judul: string; layanan: LayananBantuan[]; penutup: string };
// LANJUT_055 — sumber jawaban materi; disusun server (bukan ditulis AI).
export type SumberModul = { label: string; judul: string };
export type SumberWeb = { label: string; judul: string; url: string };
export type BalasanNgobrol = {
  balasan: string;
  /** Ada bila server mendeteksi tanda bahaya (atau model menandainya). */
  kartu_bantuan: KartuBantuan | null;
  /** Saklar ai_aktif = 0: balasan uji coba, bukan dari AI. */
  uji_coba: boolean;
  /** Data pribadi di pesan terbaru disamarkan sebelum dikirim ke AI. */
  data_pribadi_disamarkan: boolean;
  /** Modul (label + judul) dan halaman web (dari anotasi penyedia) yang dipakai jawaban. */
  sumber: { modul: SumberModul[]; web: SumberWeb[] };
  /** Kuota pencarian web harian akun habis; jawaban tanpa web. */
  web_habis: boolean;
  /** LANJUT_078: konteks fitur yang ringkasannya ikut ke AI (null = kosong / AI mati). */
  konteks: 'modul' | 'saran' | 'event' | null;
  /** LANJUT_078: kartu tautan (≤3, satu per jenis) disusun server; kosong saat AI mati. */
  tautan: TautanNgobrol[];
};
// LANJUT_078 — kartu tautan di bawah jawaban Ngobrol; tombolnya membuka layar yang sudah ada.
export type TautanNgobrol =
  | { jenis: 'modul'; modul_id: string; judul: string }
  | { jenis: 'saran'; mapel_id: string; judul: string }
  | { jenis: 'event'; jenis_event: JenisEvent; tanggal: string; judul: string | null };
/** GET /ngobrol/status (LANJUT_078). */
export type StatusNgobrol = { ai_aktif: boolean };

/**
 * GET /pengguna/saya/pilihan-mapel (LANJUT_079). Kelas 12 → 'rumpun': hanya kelompok
 * rumpun favoritnya (kosong bila belum memilih rumpun), tidak pernah daftar semua mapel.
 * Kelas lain → 'mapel_saya': semua mapel sekolah, tanpa rumpun.
 */
export type MapelRingkas = { id: string; nama: string };
export type PilihanMapel =
  | {
      mode: 'rumpun';
      maks_mapel: number;
      maks_rumpun: number;
      mapel_pilihan: string[];
      minat_rumpun: string[];
      kelompok: { rumpun: string; mapel: MapelRingkas[] }[];
      pengelompokan_terverifikasi: boolean;
    }
  | { mode: 'mapel_saya'; maks_mapel: number; mapel_pilihan: string[]; mapel: MapelRingkas[] };
