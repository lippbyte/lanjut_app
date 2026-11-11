# Audit pilot tanpa AI

**Task:** LANJUT_019 seri v2.
**Dasar:** commit `b81488f`.
**Sifat:** pembacaan kode dan tes. Penjaganya `server/tests/pilot-tanpa-ai.test.js`.

## Kesimpulan

Dengan `ai_aktif = 0`, kode tidak mengirim apa pun ke OpenRouter maupun mesin pencari, walau modul dan pencarian web menyala. Tidak ada blokir.

**Syaratnya ada di server, bukan di profil `pilot`.** `ai_aktif` adalah satu nilai di tabel `konfigurasi_levelin` dan berlaku untuk semua siswa. Profil build tidak punya saklar AI. Nilai bawaannya 0 hanya untuk instalasi baru. Basis data yang menjalankan migrasi 015 sebelum LANJUT_060 tetap 1 sampai diubah sendiri (`server/src/db/migrasi/015_ai_pengaturan.sql`). Nilai di produksi belum diperiksa:

```sql
SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'ai_aktif';
```

## Jalur AI

| Jalur | Lokasi | Syarat aktif | Dengan AI mati | Bukti |
|---|---|---|---|---|
| Balasan Ngobrol ke OpenRouter | `server/src/modul/ngobrol/penyedia-ai.js:70`, dipanggil `ngobrol.layanan.js:672` | Persetujuan, `ai_aktif = 1`, kunci terisi | Tidak mengirim. Berhenti di `ngobrol.layanan.js:617` dengan pesan uji coba | Tes "AI mati: pesan apa pun" |
| Pencarian web | `ngobrol.layanan.js:567`, dipanggil dari `:641` | Sama, ditambah `ai_web_aktif = 1` | Tidak mengirim. Letaknya sesudah saklar di `:617` | Tes yang sama, dengan `ai_web_aktif = 1` |
| Ringkasan modul, saran, dan event | `ngobrol.layanan.js` (`ambilPotongan`, `kumpulkanKonteks`) | Sesudah saklar | Tidak dibaca dan tidak dikirim | Tes "saklar diperiksa lebih dulu" |
| Tanda bahaya | `ngobrol.rute.js`, `keselamatan.js` | Selalu | Diproses di server. Kartu bantuan tetap tampil | Tes "kartu bantuan tetap ada" |
| Saran harian | `server/src/modul/levelin/keputusan.js` | Selalu | Dihitung di server, tanpa model | Tes "seluruh rute" |
| Ekstraksi PDF modul | `server/src/modul/modul/ekstrak-pdf.worker.mjs` | Saat unggah | Lokal. Modul jaringan justru dimatikan di worker itu (`:26-48`) | Pemindaian sumber |
| `npm run evaluasi-ai` | `server/tools/evaluasi-ai.js` | Dijalankan tim dengan `EVALUASI_AI_IZIN=ya` dan `--ya-panggil-penyedia` | Tidak bisa dipicu siswa. Tidak boleh dijalankan selama pilot | `server/tools/evaluasi-ai.js:50-51` |

Lapis kedua: tanpa `OPENROUTER_API_KEY`, AI juga tidak jalan (`ngobrol.layanan.js:621`).

## Jalur lain yang bisa dipicu siswa

| Jalur | Lokasi | Syarat | Catatan |
|---|---|---|---|
| Pengenal suara peramban | `lib/suara.ts`, `components/screens/NgobrolScreen.tsx:205` | Build dengan `EXPO_PUBLIC_MIKROFON_NGOBROL=1`, di web | **Tidak mengikuti `ai_aktif`.** Audio ke penyedia peramban. Mati di `eas.json` dan bawaan `docker-compose.yml`. Variabel di panel EAS dan Dokploy belum diperiksa |
| Tautan keluar | `Linking.openURL` di `LinimasaScreen.tsx:320`, `:411`, `CeritaAlumniScreen.tsx:36`, `PortofolioScreens.tsx:213` | Ditekan siswa | Membuka peramban. Tidak mengirim data akun |
| Tautan sumber web | `NgobrolScreen.tsx:130` | Ada hasil web | Tidak muncul saat AI mati |

Pemanggilan ke server sendiri ada di `api/client.ts`. `lib/portofolioFoto.ts:51` membaca berkas lokal.

Layanan email kode (`server/src/util/surel.js`) dan Google sign-in (`server/src/modul/auth/tokenGoogle.js`) bukan AI dan tidak memanggil model, jadi di luar audit ini. Keduanya masuk daftar berkas yang dijaga tes.

## Cara tes membuktikan

- Semua koneksi jaringan dipantau saat pesan dikirim dan seluruh rute dipanggil, dengan web dan modul menyala.
- Tes kontrol menyalakan AI dan memastikan permintaan keluar memang terdeteksi.
- Sumber server dan aplikasi dipindai, jadi jalur keluar baru harus ditinjau dulu.

## Yang perlu diperhatikan

Layar Ngobrol tetap ada saat AI mati. Siswa tanpa persetujuan melihat layar terkunci yang menawarkan persetujuan orang tua di aplikasi, untuk fitur yang sedang mati. Siswa dengan persetujuan menerima pesan "Fitur AI sedang dimatikan sementara". Tidak diubah di task ini.
