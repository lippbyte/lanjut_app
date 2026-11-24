# Draf teks: navigasi v2 dan Arah Saya (LANJUT_031)

> **Status: DRAF, belum disetujui Khalifa.** Teks ini hanya tampil bila build dibuat dengan `EXPO_PUBLIC_NAVIGASI_V2=1` (mati bawaan). `npm run periksa-gerbang-rilis` menahan build yang menyalakan saklar itu sampai teks ini disetujui lewat `docs/persetujuan-teks-rilis.json`. Belum ada yang ditandai disetujui.
> **Sumber di kode:** `lib/arahSaya.ts` dan `lib/navigasiV2.ts`. Tes `server/tests/navigasi-v2.test.js` memastikan batas maksimal 40 kata teks tetap per layar Arah Saya dan kecocokan dengan dokumen ini.
> **Nada:** `docs/draf-teks-alur-masuk-v2.md` — pendek, menenangkan, tanpa janji hasil, tanpa tekanan, tanpa klaim privasi baru.

## 1. Label navigasi v2 (K47, label tampilan saja)

Nama rute, kunci API, tabel, dan saklar tidak berubah.

| Teks | Letak | Sumber |
|---|---|---|
| Arah Saya | Tab 1 (wajib) | DRAF |
| Jelajah | Tab 2 (`EXPO_PUBLIC_DISCOVER=1`) dan pintu besar Arah Saya | DRAF |
| Jejak Waktu | Tab 3 (wajib, membuka `/linimasa`) | DRAF |
| Profil Saya | Tab 4 (wajib, membuka `/discover-profil` atau `/akun`) | DRAF |
| Jalur Saya | Pintu besar Arah Saya dan judul bilah atas `/jalur-tujuan` | DRAF |
| Langkah Saya | Pintu besar Arah Saya, pintu di Jejak Waktu, dan judul bilah atas `/daftar-periksa` | DRAF |
| Rekam Jejak | Pintu besar utama Arah Saya dan judul bilah atas `/portofolio` | DRAF |
| Akun & Privasi | Pintu di tab Profil Saya dan judul bilah atas `/akun` | DRAF |
| Kembali | Label aksesibilitas tombol kembali bilah atas | DRAF |
| Tutup | Tombol tutup jendela pilih arah | DRAF |

## 2. Teks layar Arah Saya

Hitungan kata tetap per layar (kombinasi terpadat: semua saklar menyala + keadaan kosong + Belum tahu + Alat belajar terlipat): **35 kata** dari batas **40 kata** (di luar data milik siswa seperti nama, nama jalur, judul langkah, dan daftar Alat belajar saat dibuka).

| Bagian | Teks | Sumber |
|---|---|---|
| Sapaan (tanpa nama) | Halo | DRAF |
| Sapaan (dengan nama) | Halo, | DRAF |
| Arahku — judul | Arahku | DRAF |
| Arahku — belum memilih | Pilih arahmu | DRAF |
| Arahku — belum tahu | Belum menentukan arah. | DRAF |
| Arahku — tautan ubah | Ubah | DRAF |
| Arahku — jalur draf/nonaktif | Jalur belum tersedia | DRAF |
| Langkah berikutnya — judul | Langkah berikutnya | DRAF |
| Langkah berikutnya — kosong judul | Belum ada langkah | DRAF |
| Langkah berikutnya — kosong teks | Mulai pelan saja. | DRAF |
| Langkah berikutnya — tombol kosong (Discover menyala) | Jelajah | DRAF |
| Langkah berikutnya — tombol kosong (Discover mati) | Langkah Saya | DRAF |
| Pintu Rekam Jejak — judul | Rekam Jejak | DRAF |
| Pintu Rekam Jejak — keterangan | Catat karya dan prosesmu. | DRAF |
| Pintu Jelajah — judul | Jelajah | DRAF |
| Pintu Jelajah — keterangan | Kenali bidang. | DRAF |
| Pintu Jalur Saya — judul | Jalur Saya | DRAF |
| Pintu Jalur Saya — keterangan | Atur tujuanmu. | DRAF |
| Pintu Langkah Saya — judul | Langkah Saya | DRAF |
| Pintu Langkah Saya — keterangan | Daftar langkahmu. | DRAF |
| Bagian sekunder (lipat) | Alat belajar | DRAF |
| Memuat (label pembaca layar) | Memuat Arah Saya | DRAF |
| Galat jaringan — judul | Belum bisa memuat | DRAF |
| Galat jaringan — pesan | Periksa sambunganmu, lalu coba lagi. | DRAF |
| Galat jaringan — tombol | Coba lagi | DRAF |

## 3. Nama fitur di dalam "Alat belajar" (memakai nama v1 yang sudah ada)

`Arsip Belajar`, `Latihan`, `Level-In`, `Ngobrol Bareng LANJUT`, `Jenjang Saya`, `Pilih Mapel`, `Eksplorasi Kampus`, `Cek Posisi`, `Gaya Belajar`, `Cerita Alumni`.

## 4. Yang perlu kamu periksa

1. **Label "Cek Posisi" di Alat belajar:** di v1 layar `/cek-posisi` sempat dinamai "Profil Saya", tetapi di v2 "Profil Saya" sudah menjadi tab ke-4. Untuk menghindari dua tempat bernama sama, butir di Alat belajar dan bilah atasnya memakai "Cek Posisi".
2. **Keterangan singkat di pintu besar:** dibuat 2–4 kata (`Catat karya dan prosesmu.`, `Kenali bidang.`, `Atur tujuanmu.`, `Daftar langkahmu.`) agar seluruh layar Arah Saya tetap di bawah batas 40 kata saat keempat saklar menyala sekaligus.
3. **Label netral jalur draf:** memakai `Jalur belum tersedia` (lebih singkat dari v1 `Jalur yang kamu pilih (belum tersedia)` agar muat di chip).
