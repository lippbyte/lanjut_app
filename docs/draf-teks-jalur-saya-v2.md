# Draf Teks Jalur Saya v2 (LANJUT_033)

> **Status: DRAF — belum disetujui Khalifa.**
> **Saklar:** `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan) bersama `EXPO_PUBLIC_JALUR_TUJUAN` (mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` pada entri `navigasi-v2`; profil build mana pun di `eas.json` yang menyalakan `EXPO_PUBLIC_NAVIGASI_V2` akan ditahan selama berkas ini dan `lib/jalurSayaV2.ts` masih bertanda DRAF.
> **Nada:** mengikuti `docs/draf-teks-alur-masuk-v2.md` — pendek, menenangkan, tanpa janji hasil, tanpa tekanan, dan tanpa menyalin teks jalur draf ataupun mengarang deskripsi jalur.
> **Batas kata:** maksimal **40 kata teks tetap per keadaan layar** (di luar data milik siswa dan teks jalur disetujui dari server).

---

## 1. Aturan Keras Penyamaran Jalur (K37, K44, K47)

1. **Hanya jalur berstatus `status_teks === 'disetujui'`** yang boleh menampilkan nama dan `deskripsi_singkat` dari server (`jalurDisetujuiSaja` + `labelJalur` di `lib/jalurSayaV2.ts`). Dokumen ini **tidak** menyalin nama atau deskripsi draf dari `server/data-konten/jalur-minat.json` dan **tidak** mengarang deskripsi jalur baru.
2. **Jalur yang kembali draf** (`jalur_belum_tersedia: true` atau `jalur_minat_id` tidak ada di daftar jalur disetujui) selalu tampil dengan label netral **`Jalur belum tersedia`** dan satu tombol **`Jeda`**.
3. **Id jalur mentah** (mis. `melanjutkan`, `bekerja`, `wirausaha`) **tidak pernah** tampil di layar, judul, label aksesibilitas, pilihan formulir, atau pesan galat.

---

## 2. Daftar Salinan Teks (`TEKS_JALUR_SAYA_V2` di `lib/jalurSayaV2.ts`)

| Kunci | Teks DRAF | Keterangan pemakaian |
|---|---|---|
| `judul` | `Jalur Saya` | Judul layar di bilah atas v2 (`/jalur-tujuan`, K47) |
| `ringkasan` | `Boleh lebih dari satu, dan boleh berubah.` | Subjudul tenang di atas pilihan jalur |
| `penandaDipilih` | `Dipilih` | Penanda tertulis pada kartu jalur yang sedang aktif (mendampingi ikon centang, bukan hanya warna) |
| `petunjukKetukPilih` | `Ketuk untuk memilih jalur ini` | Petunjuk pembaca layar pada kartu jalur yang belum dipilih |
| `petunjukKetukJeda` | `Ketuk untuk menjeda jalur ini` | Petunjuk pembaca layar pada kartu jalur yang sedang dipilih |
| `jalurBelumTersedia` | `Jalur belum tersedia` | Satu-satunya label netral untuk jalur yang belum disetujui / kembali draf |
| `jalurDrafKeterangan` | `Sedang disiapkan kembali.` | Keterangan singkat pada kartu pilihan siswa yang jalurnya kembali draf |
| `jeda` | `Jeda` | Label tombol menjeda pilihan jalur yang kembali draf |
| `labelAksiJedaDraf` | `Jeda jalur yang belum tersedia` | Label aksesibilitas tombol Jeda pada kartu jalur draf |
| `kosongJalurJudul` | `Pilihan jalur sedang disiapkan` | Judul keadaan kosong saat belum ada jalur disetujui (bersama maskot di lingkaran `latarMaskot`) |
| `kosongJalurTeks` | `Kamu tetap bisa menulis tujuanmu di bawah.` | Kalimat penjelas keadaan kosong jalur |
| `tujuanJudul` | `Tujuanmu` | Judul seksi tujuan tertulis siswa |
| `kosongTujuanTeks` | `Belum ada tujuan tertulis.` | Kalimat tenang saat siswa belum menulis tujuan |
| `tulisTujuan` | `Tulis tujuan` | Tombol membuka isian tujuan pertama |
| `tambahTujuan` | `Tambah tujuan` | Tombol teks membuka isian tujuan tambahan saat sudah ada tujuan |
| `ubahTujuan` | `Ubah` | Tombol pada kartu tujuan aktif untuk membuat versi baru |
| `tandaiTercapai` | `Tandai tercapai` | Tombol menandai tujuan aktif telah tercapai |
| `lihatRiwayat` | `Lihat perubahan` | Tombol membuka daftar versi lama tujuan (bernomor & berjam seperti 026) |
| `tutupRiwayat` | `Tutup perubahan` | Tombol menutup daftar versi lama tujuan |
| `targetAwalan` | `Target` | Awalan tanggal target tujuan, mis. `Target 30 Juni 2027` |
| `prodiKeterangan` | `Prodi impian · Data Akun` | Keterangan kartu baca-saja `prodi_impian` dari Data Akun |
| `prodiBelumTersedia` | `Prodi pilihan` | Label cadangan aman bila nama `prodi_impian` kosong |
| `perjalananJudul` | `Perjalananmu` | Judul seksi terlipat catatan perjalanan pilihan & tujuan |
| `perjalananKosong` | `Riwayat pilihanmu akan tercatat di sini.` | Teks saat bagian Perjalananmu dibuka tetapi belum ada peristiwa |
| `formJudulBaru` | `Tulis Tujuan` | Judul modal/layar saat membuat tujuan baru |
| `formJudulUbah` | `Ubah Tujuan` | Judul modal/layar saat memperbarui tujuan berversi |
| `formCatatanVersi` | `Versi lama tetap tersimpan di riwayatmu.` | Catatan tenang di atas formulir ubah tujuan |
| `labelJudul` | `Tujuan` | Label kolom judul tujuan (`maks 200 karakter`) |
| `labelJalur` | `Jalur (opsional)` | Label kelompok pilihan jalur terkait tujuan |
| `tanpaJalur` | `Belum terkait jalur` | Pilihan radio tujuan tanpa kaitan jalur |
| `labelUraian` | `Cerita singkat (opsional)` | Label kolom uraian tujuan (`maks 2000 karakter`) |
| `labelTarget` | `Target waktu (opsional)` | Label kolom tanggal target |
| `petunjukTarget` | `Contoh: 2027-06-30` | Petunjuk format tanggal di atas/bawah kolom target |
| `simpan` | `Simpan` | Tombol simpan tujuan |
| `batal` | `Batal` | Tombol menutup formulir tanpa menyimpan |
| `berhasilSimpanJalur` | `Pilihan jalur tersimpan.` | Umpan balik hangat 1 kalimat sesudah memilih jalur |
| `berhasilJedaJalur` | `Jalur dijeda.` | Umpan balik hangat 1 kalimat sesudah menjeda jalur |
| `berhasilSimpanTujuan` | `Tujuanmu tersimpan.` | Umpan balik hangat 1 kalimat sesudah menyimpan tujuan |
| `berhasilTercapai` | `Tujuan ditandai tercapai.` | Umpan balik hangat 1 kalimat sesudah menandai tujuan tercapai |
| `memuatLabel` | `Memuat Jalur Saya` | Label pembaca layar pada kerangka memuat |
| `fiturMatiJudul` | `Fitur ini belum tersedia` | Judul saat server mengembalikan 404 (saklar server mati) |
| `fiturMatiTeks` | `Coba buka kembali nanti.` | Keterangan saat fitur di server belum dinyalakan |
| `perluKebijakanJudul` | `Terima kebijakan privasi dulu` | Judul saat kebijakan privasi terkini belum disetujui |
| `perluKebijakanTeks` | `Setelah itu kamu bisa memakai fitur ini.` | Keterangan pengarah ke penerimaan kebijakan |
| `bacaKebijakan` | `Baca kebijakan` | Tombol menuju `/terima-kebijakan` |
| `galatJudul` | `Belum bisa memuat data` | Judul `KeadaanGalat` |
| `galatPesan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan `KeadaanGalat` |
| `cobaLagi` | `Coba lagi` | Tombol muat ulang pada `KeadaanGalat` |
| `tidakDitemukanJudul` | `Tujuan tidak ditemukan` | Judul di `/jalur-tujuan-tulis?id=...` bila id bukan versi aktif terkini |
| `tidakDitemukanTeks` | `Mungkin sudah diperbarui ke versi baru.` | Keterangan tenang saat id tujuan lama dibuka langsung |
| `kembaliKeJalur` | `Kembali` | Tombol kembali ke `/jalur-tujuan` |

> **Catatan teks bersama v1 (`lib/jalurTujuan.ts`):** label status tujuan (`Aktif`, `Tercapai`, `Ditinggalkan`), format riwayat versi (`Versi ke-<nomor> (<tanggal> pukul <jam>): <judul>`), kalimat peristiwa perjalanan, serta pesan validasi dan kode galat server (`GALAT_ISIAN_TUJUAN`, `pesanGalatJalurTujuan`) memakai ulang fungsi yang sudah tercatat DRAF di `docs/draf-teks-jalur-tujuan.md`.

---

## 3. Hitungan Kata Teks Tetap per Keadaan Layar (`teksTetapJalurSayaV2`)

- **Keadaan siap berisi lengkap** (judul + ringkasan + lencana `Dipilih` + kartu draf `Jalur belum tersedia` + `Jeda` + `Tujuanmu` + keterangan prodi + status + `Target` + `Ubah` + `Tandai tercapai` + `Lihat perubahan` + `Tambah tujuan` + `Perjalananmu`): **`32 kata`** (`≤ 40`).
- **Keadaan belum ada jalur disetujui (`kosong_jalur`)**: **`32 kata`** (`≤ 40`).
- **Formulir tulis/ubah tujuan (`form_tujuan`)**: **`27 kata`** (`≤ 40`).
- **Keadaan galat (`galat`)**: **`20 kata`** (`≤ 40`).
- **Keadaan perlu kebijakan (`perlu_kebijakan`)**: **`15 kata`** (`≤ 40`).
- **Keadaan fitur server mati (`fitur_mati`)**: **`10 kata`** (`≤ 40`).
