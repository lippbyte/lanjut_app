# Lingkungan development

Server di komputer sendiri selalu memakai MySQL lokal, terpisah dari produksi. Pagar di kode menjaganya:

| Pagar | Letak | Akibatnya |
|---|---|---|
| Di luar `NODE_ENV=production`, `DB_HOST` harus `localhost` atau `127.0.0.1` | `server/src/config/env.js` | Server, skrip, dan tes menolak mulai bila mengarah ke host lain |
| Di luar produksi, `DB_NAME` tidak boleh diawali `lanjut_db` | `server/src/config/env.js` | Nama basis data produksi tidak bisa dipakai di lokal |
| Tes hanya jalan di basis data yang diawali `lanjut_test` | `server/tests/bantuan.js`, `server/src/db/koneksi.js` | `npm test` berhenti bila `DB_NAME` lain |
| `migrasi`, `migrasi-turun`, `benih`, dan `pulihkan-db` mencetak tujuannya | `server/src/db/pagar-tujuan.js` | Host yang bukan lokal butuh `--ya`, dan pemulihan di produksi ditolak |
| `benih-dummy` hanya untuk lokal | `server/tools/benih-dummy.js` | Tidak ada tanda yang bisa melewatinya |

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

Hasilnya tiga akun contoh, yaitu `demo_kelas12`, `demo_kelas10`, dan `uji_smp`, dengan email `@contoh.test`. Masing-masing punya persetujuan kebijakan, satu kartu, satu sesi latihan, jalur minat, dan satu tujuan. Kata sandinya dicetak sekali di layar. Bila ingin sandi tetap, isi `DUMMY_KATA_SANDI` di `.env` sebelum menjalankan. Akun yang sudah ada dilewati, jadi aman diulang.

## 5. Menjalankan tes

Tes memakai basis data terpisah, yang namanya harus diawali `lanjut_test`. Arahkan `DB_NAME` ke `lanjut_test`, jalankan `npm run migrasi` dan `npm run benih` sekali di sana, lalu `npm test`. Kembalikan `DB_NAME` ke `lanjut_dev` sesudahnya.

## Yang tidak dilakukan di lokal

- Jangan mengarahkan `.env` lokal ke basis data produksi. Pagar di atas menolaknya.
- Perintah untuk server produksi ada di bagian produksi `server/README.md`, dijalankan di kontainer server, bukan dari komputer sendiri.
