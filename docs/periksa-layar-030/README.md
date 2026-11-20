# Periksa layar alur masuk v2: tangkapan layar DEV (LANJUT_030)

> **DEV.** Dibuat di peramban (Edge headless, lebar 360 px), **bukan di HP**, dan **belum dengan pembaca layar**.
> **Data:** semua dari `lanjut_dev`. Teks bertanda `[DUMMY]` berasal dari `npm run benih-persetujuan-dummy`, yang dicabut lagi sesudahnya. Akun `uji_v2_030_*` adalah akun uji di `lanjut_dev`.
> **Build:** web produksi dengan `EXPO_PUBLIC_ALUR_MASUK_V2=1`, API dev di 127.0.0.1:4100. Pembanding v1 dibuat tanpa saklar itu. Keduanya dibangun dengan `--clear`, karena cache Metro bisa membawa nilai saklar dari build sebelumnya.

## Berkas

| Berkas | Isi |
|---|---|
| `01`–`03-pengantar-*` | Tiga kartu pengantar: Lewati, Berikutnya, Mulai, Saya sudah punya akun. Kalimat unduh/hapus data tidak tampil karena Kelola data mati |
| `04-daftar-1-akun-galat` | Langkah 1: Lanjut tanpa isi, pesan galat dengan ikon |
| `05-daftar-2-email` | Langkah 2: email boleh dikosongkan |
| `06-daftar-3-privasi` | Langkah 3: ringkasan kebijakan dari JSON (tidak diubah), kalimat data pribadi v1, centang |
| `07-daftar-3-kebijakan-lengkap` | "Baca lengkap": teks kebijakan penuh dari JSON |
| `08-daftar-4-jenjang` | Langkah 4: jenjang, satu pertanyaan |
| `09-daftar-6-jenis` | Langkah 6: jenis sekolah (hanya kelas 10–12) |
| `10-daftar-7-prodi` | Langkah 7: prodi impian, "belum" jawaban sah |
| `11-daftar-8-siap` | Langkah 8: ringkasan isian (tanpa sandi) dan "Tetap masuk di HP ini" |
| `12-arah-kosong` | Kecenderungan arah saat semua jalur masih draf: "Pilihan jalur sedang disiapkan" |
| `13-beranda-sesudah-daftar` | Selesai: Beranda yang ada |
| `14-arah-pilih` | Kecenderungan arah dengan satu jalur `[DUMMY]` disetujui; "Belum tahu" eksklusif |
| `15-masuk` | Masuk v2, "Tetap masuk di HP ini" bawaan aktif |
| `16-tanpa-tetap-masuk-sesudah-muat-ulang` | Masuk dengan "Tetap masuk" mati, lalu app dimuat ulang: kembali ke pengantar |
| `17-v1-saklar-mati` | Saklar mati: onboarding v1, tidak berubah |

## Hasil pemeriksaan (47/47 lolos)

**Layar pembuka**
- v2 tampil 1.349 ms: minimal 800 ms ditambah pudar 550 ms.
- v1 tampil 2.543 ms, tidak berubah.

**Pengantar dan Daftar**
- Semua kontrol di layar yang diukur minimal 44×44, dan semua isian punya label untuk pembaca layar.
- Lanjut tanpa isi ditolak dengan pesan. Pesan hilang sesudah isian diubah.
- Kembali mempertahankan isian.
- Langkah Privasi menolak Lanjut sebelum dicentang.
- "Baca lengkap" menampilkan 116 kalimat kebijakan persis dari JSON.
- Centang dibacakan `aria-checked`.
- Payload `POST /auth/daftar` hanya berisi medan v1: `nama_pengguna`, `kata_sandi`, `kelas`, `versi_kebijakan` (1), `jenis_sekolah`.

**Kecenderungan arah**
- Saat semua jalur draf, layar tampil rapi dan bisa dilewati. Tanda lokal `kosong` tersimpan, dan tidak ada permintaan jalur ke server.
- Sesudah satu jalur `[DUMMY]` disetujui, pertanyaan muncul sekali lagi.
  - Hanya jalur disetujui yang tampil.
  - "Belum tahu" melepas pilihan lain, dan sebaliknya.
  - Simpan mengirim `POST /jalur-minat/saya` dengan `jalur_minat_id: "melanjutkan"` saja.

**Tetap masuk**
- Mati: tidak ada token atau profil tersimpan, dan sesudah dimuat ulang harus masuk lagi.
- Aktif: sesudah dimuat ulang tetap masuk.

**Saklar mati**
- Onboarding dan Masuk v1 tampil, tanpa pilihan "Tetap masuk".

**Umum**
- Tidak ada galat konsol dan tidak ada permintaan ke luar localhost.

## Yang tidak terbukti di sini

- **Penyimpanan aman.** Web tidak punya penyimpanan aman: token disimpan di penyimpanan lama (localStorage), sama dengan sebelum LANJUT_030. Penyimpanan aman dan migrasi token dari APK 1.0.0 hanya bisa dibuktikan di HP (APK), dan **paket `expo-secure-store` belum terpasang**.
- **Perangkat dan aksesibilitas.** Tampilan di HP sungguhan, papan ketik HP, TalkBack/VoiceOver, ukuran huruf besar, dan "Hapus animasi" di Android belum diuji. Langkah ujinya ada di `docs/uji-hp-expo-go.md` bagian 10.
