# Lingkungan development

Server di komputer sendiri selalu memakai MySQL lokal, terpisah dari produksi. Pagar di kode menjaganya:

| Pagar | Letak | Akibatnya |
|---|---|---|
| Di luar `NODE_ENV=production`, `DB_HOST` harus `localhost` atau `127.0.0.1` | `server/src/config/env.js` | Server, skrip, dan tes menolak mulai bila mengarah ke host lain |
| Di luar produksi, `DB_NAME` tidak boleh diawali `lanjut_db` | `server/src/config/env.js` | Nama basis data produksi tidak bisa dipakai di lokal |
| Tes hanya jalan di basis data yang diawali `lanjut_test` | `server/tests/bantuan.js`, `server/src/db/koneksi.js` | `npm test` berhenti bila `DB_NAME` lain |
| `migrasi`, `migrasi-turun`, `benih`, dan `pulihkan-db` mencetak tujuannya | `server/src/db/pagar-tujuan.js` | Host yang bukan lokal butuh `--ya`, dan pemulihan di produksi ditolak |
| `benih-dummy` hanya untuk lokal | `server/tools/benih-dummy.js` | Tidak ada tanda yang bisa melewatinya |
| `benih-persetujuan-dummy` hanya untuk basis data yang diawali `lanjut_dev` | `server/tools/benih-persetujuan-dummy.js` | Menolak produksi, host yang bukan lokal, dan nama basis data lain, tanpa tanda yang bisa melewatinya. Tidak menulis berkas di `server/data-konten` |

## 1. Nyalakan MySQL lokal

Butuh Docker. Di folder `LANJUT_App`, buat berkas `.env.dev.local`. Berkas ini sudah diabaikan git, jadi isinya tidak ikut di-commit. Pilih sandi sendiri:

```
DEV_DB_ROOT_PASSWORD=
DEV_DB_PASSWORD=
DEV_DB_PORT=3307
```

Isi kedua sandi itu, lalu jalankan:

```
docker compose --env-file .env.dev.local -f docker-compose.dev.yml up -d
```

Hasilnya MySQL di `127.0.0.1:3307` dengan dua basis data, `lanjut_dev` dan `lanjut_test`, dan pengguna `lanjut`. Port hanya terbuka untuk komputer ini. Untuk mematikannya, ganti `up -d` dengan `down`. Isi basis data tetap tersimpan di volume `lanjut_dev_data`.

Kontainer ini tidak menyala sendiri sesudah komputer dinyalakan ulang. Bila port sudah dipakai kontainer proyek lain, ganti `DEV_DB_PORT` di `.env.dev.local` dan `DB_PORT` di `server/.env` ke port yang kosong, lalu jalankan perintah di atas lagi. Isi volume tetap.

Bila sudah punya MySQL lokal lain, misalnya Laragon, langkah ini boleh dilewati. Buat sendiri `lanjut_dev` dan `lanjut_test` di sana.

## 2. Arahkan server ke basis data dev

Di folder `server`, salin `.env.example` menjadi `.env`. Nilai bawaannya sudah untuk development:

| Variabel | Isi |
|---|---|
| `NODE_ENV` | `development` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3307` bila memakai langkah 1 |
| `DB_USER` | `lanjut` |
| `DB_PASSWORD` | Sama dengan `DEV_DB_PASSWORD` |
| `DB_NAME` | `lanjut_dev` |

## 3. Buat tabel dan isi konten

Di folder `server`:

```
npm run migrasi
npm run benih
```

Baris pertama keduanya menyebut tujuan, misalnya `Tujuan: host 127.0.0.1, basis data lanjut_dev`. Periksa baris itu sebelum melanjutkan.

## 4. Isi data dummy

```
npm run benih-dummy
```

Hasilnya empat akun contoh, yaitu `demo_kelas12`, `demo_kelas10`, `uji_smp`, dan `uji_belum_memilih`, dengan email `@contoh.test`. Masing-masing punya persetujuan kebijakan, satu kartu, dan satu sesi latihan. Untuk Jalur & Tujuan (LANJUT_023): `demo_kelas10` memilih dua jalur, `demo_kelas12` punya tujuan yang sudah diperbarui sekali (dua versi), dan `uji_belum_memilih` belum memilih jalur maupun tujuan. Untuk Discover (LANJUT_024): `demo_kelas12` punya refleksi di dua kartu dan profil eksplorasi dua versi, dan `uji_belum_memilih` belum mengisi apa pun. Kata sandinya dicetak sekali di layar. Bila ingin sandi tetap, isi `DUMMY_KATA_SANDI` di `.env` sebelum menjalankan. Akun yang sudah ada dilewati, jadi aman diulang.

## 5. Menjalankan tes

Tes memakai basis data terpisah, yang namanya harus diawali `lanjut_test`. Arahkan `DB_NAME` ke `lanjut_test`, jalankan `npm run migrasi` dan `npm run benih` sekali di sana, lalu `npm test`. Kembalikan `DB_NAME` ke `lanjut_dev` sesudahnya.

## 6. Mencoba Jalur & Tujuan (LANJUT_023)

Fitur ini mati di mana pun sampai sengaja dinyalakan, dan teksnya masih draf (`docs/draf-teks-jalur-tujuan.md`). Untuk mencobanya di dev:

1. Di `server/.env`, isi `JALUR_TUJUAN_AKTIF=1`, lalu nyalakan ulang server. Tanpa itu, rute `/api/v1/jalur-minat` dan `/api/v1/tujuan` menjawab 404.
2. Jalankan aplikasi dengan `EXPO_PUBLIC_JALUR_TUJUAN=1`, misalnya `EXPO_PUBLIC_JALUR_TUJUAN=1 npx expo start --web`. Pintunya muncul di Beranda, tepat di bawah grid menu.
3. Masuk dengan akun dummy dari langkah 4.

Jangan isi kedua saklar itu di Dokploy, EAS, atau `eas.json`. Rute dan kontraknya ada di `docs/kontrak-data-v2.md` bagian 5.

## 7. Mencoba Discover (LANJUT_024)

Butuh migrasi 033 di basis data dev (`npm run migrasi`, lalu `npm run benih`). Untuk mencobanya, isi `DISCOVER_AKTIF=1` di `server/.env` dan jalankan aplikasi dengan `EXPO_PUBLIC_DISCOVER=1`. Selama isi `server/data-konten/discover.json` masih draf, daftar kartu kosong: kartu draf tidak pernah terkirim. Menyetujui kartu sungguhan hanya lewat `status_teks` di berkas itu, sesudah sumbernya diisi. Untuk melihat layarnya di dev sebelum itu, pakai bagian 8. Profil eksplorasi tetap bisa disusun dari data akun.

Jangan isi kedua saklar itu di Dokploy, EAS, atau `eas.json`. Rute dan kontraknya ada di `docs/kontrak-data-v2.md` bagian 6.

## 8. Melihat layar dengan konten dummy (LANJUT_025)

Karena semua jalur dan kartu masih draf, daftar di kedua layar kosong. Untuk mencobanya di dev:

```
npm run benih-persetujuan-dummy
```

Skrip ini menandai satu jalur (`melanjutkan`) dan satu kartu Discover (`bidang-kesehatan`) sebagai disetujui, **hanya di basis data**. Nama, teks, dan sumbernya diganti teks yang terbaca palsu, diawali `[DUMMY]` atau "[DUMMY – bukan sumber nyata]". Berkas di `server/data-konten` tidak ditulis. Skrip menolak jalan bila `NODE_ENV=production`, bila host bukan lokal, atau bila nama basis data tidak diawali `lanjut_dev`, dan tidak ada flag untuk melewatinya. Setiap perubahan dicetak dan dicatat di `server/benih-persetujuan-dummy.log`.

Untuk membaliknya:

```
npm run benih-persetujuan-dummy -- --cabut
```

Kedua baris kembali persis seperti isi berkas konten (draf), dan daftar kembali kosong. `npm run benih` juga mengembalikannya.

Hasil pemeriksaan layar di peramban 360 px ada di `docs/periksa-layar-025/`. Bagian Data Saya (unduh data dan hapus akun) di layar Akun butuh saklar ketiga, `EXPO_PUBLIC_KELOLA_DATA_AKUN=1`, juga hanya di lingkungan lokal.

## Yang tidak dilakukan di lokal

- Jangan mengarahkan `.env` lokal ke basis data produksi. Pagar di atas menolaknya.
- Perintah untuk server produksi ada di bagian produksi `server/README.md`, dijalankan di kontainer server, bukan dari komputer sendiri.
