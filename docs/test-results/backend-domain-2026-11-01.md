# Uji backend lewat domain sekolah

- **Waktu uji:** 2026-10-31T21:59:32.923Z (UTC)
- **Alamat:** `https://lanjut.smkn4bdg.sch.id/api/v1` (HTTPS, sertifikat Let's Encrypt sah, TLS 1.3, berlaku sampai 29 Jan 2027)
- **Hasil:** 37/37 lulus
- **Dijalankan dari:** komputer di jaringan sekolah, dengan Node.js `fetch` (skrip uji di luar repo)

Body respons hanya dicatat sebagai daftar kunci JSON. Token, kata sandi, dan nama akun uji tidak dicatat. Bentuk JSON dicocokkan dengan tipe di `api/types.ts`; satu-satunya kunci di luar tipe adalah `ButirDaftarPeriksa.berlaku_untuk_rumpun` (dikirim server, tidak dipakai tipe, tidak merusak).

| # | Bagian | Metode | Endpoint | Status | Hasil | Respons (ringkas) |
|---|---|---|---|---|---|---|
| 1 | Health | GET | `/health` | 200 (harap 200) | Lulus | HTML landing (nginx mengarahkan /health ke landing, bukan backend) |
| 2 | Health | GET | `/api/v1/health` | 200 (harap 200) | Lulus | {"ok":true} |
| 3 | Health | GET | `/api/v1/sehat` | 200 (harap 200) | Lulus | ok:true, data {status, waktu} |
| 4 | Publik | GET | `/api/v1/konten/mapel` | 200 (harap 200) | Lulus | ok:true, data larik(10) dari {id, nama, tersedia_di_smk, sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada} |
| 5 | Latihan | GET | `/api/v1/konfigurasi/levelin` | 200 (harap 200) | Lulus | ok:true, data {akses_ringkasan_kalibrasi_sesi, akses_tampilan_agregat_mapel, ambang_overconfident, aturan_versi, jendela_per_mapel, keyakinan_rendah_maksimal, keyakinan_tinggi_minimal, level_batas_atas, level_batas_bawah, level_minimum_kartu, minimum_kartu} |
| 6 | Daftar Periksa | GET | `/api/v1/konten/checklist?kelas=12&jalur=SNBP` | 200 (harap 200) | Lulus | ok:true, data {kategori, total_butir} |
| 7 | Auth: tanpa token | GET | `/api/v1/auth/saya` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 8 | Auth: tanpa token | GET | `/api/v1/kartu` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 9 | Auth: tanpa token | GET | `/api/v1/modul` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 10 | Auth: tanpa token | GET | `/api/v1/sesi-latihan` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 11 | Auth: tanpa token | GET | `/api/v1/kalibrasi/ringkasan` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 12 | Auth: tanpa token | GET | `/api/v1/saran-harian` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 13 | Auth: tanpa token | GET | `/api/v1/kemajuan` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 14 | Auth: tanpa token | GET | `/api/v1/butir-pribadi` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 15 | Auth: token palsu | GET | `/api/v1/auth/saya` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |
| 16 | Auth | POST | `/api/v1/auth/daftar` | 201 (harap 201) | Lulus | ok:true, data {token, kedaluwarsa_pada, pengguna} |
| 17 | Auth | POST | `/api/v1/auth/masuk` | 401 (harap 401) | Lulus | galat KREDENSIAL_SALAH: Nama pengguna atau kata sandi tidak cocok. |
| 18 | Auth | POST | `/api/v1/auth/masuk` | 200 (harap 200) | Lulus | ok:true, data {token, kedaluwarsa_pada, pengguna} |
| 19 | Auth | GET | `/api/v1/auth/saya` | 200 (harap 200) | Lulus | ok:true, data {id, nama_pengguna, nama_tampilan, email, email_terverifikasi, perlu_sandi_baru, peran, status, kelas, jenis_sekolah, prodi_impian, gaya_belajar, minat_rumpun, mapel_pilihan, kesiapan_ujian, dibuat_pada, terakhir_masuk_pada} |
| 20 | Arsip | GET | `/api/v1/kartu?sumber=pengguna` | 200 (harap 200) | Lulus | ok:true, data larik(0) |
| 21 | Arsip | POST | `/api/v1/kartu` | 201 (harap 201) | Lulus | ok:true, data {id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, dibuat_pada, diubah_pada} |
| 22 | Arsip | GET | `/api/v1/kartu?sumber=pengguna` | 200 (harap 200) | Lulus | ok:true, data larik(1) dari {id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, dibuat_pada, diubah_pada} |
| 23 | Arsip | GET | `/api/v1/modul` | 200 (harap 200) | Lulus | ok:true, data larik(0) |
| 24 | Latihan | POST | `/api/v1/sesi-latihan` | 201 (harap 201) | Lulus | ok:true, data {id} |
| 25 | Latihan | POST | `/api/v1/riwayat-latihan` | 201 (harap 201) | Lulus | ok:true, data {disimpan} |
| 26 | Latihan | PATCH | `/api/v1/sesi-latihan/{id}` | 200 (harap 200) | Lulus | ok:true, data {id, selesai_pada} |
| 27 | Latihan | GET | `/api/v1/sesi-latihan` | 200 (harap 200) | Lulus | ok:true, data larik(1) dari {id, dimulai_pada, selesai_pada, mapel_fokus_id, asal_mula, jumlah_kartu_direncanakan, jumlah_dijawab, jumlah_benar} |
| 28 | Latihan | GET | `/api/v1/kalibrasi/ringkasan` | 200 (harap 200) | Lulus | ok:true, data larik(10) dari {mapel_id, kartu_dikerjakan, n_overconfident, n_underconfident, n_selaras, n_netral, n_benar, rate_overconfident, status_data, pola, level_akurasi, dihitung_pada, konfig_versi} |
| 29 | Latihan | GET | `/api/v1/saran-harian` | 200 (harap 200) | Lulus | ok:true, data {jenis, mapel_id, alasan} |
| 30 | Daftar Periksa | GET | `/api/v1/kemajuan` | 200 (harap 200) | Lulus | ok:true, data larik(0) |
| 31 | Daftar Periksa | PUT | `/api/v1/kemajuan/ktp` | 200 (harap 200) | Lulus | ok:true, data {butir_id, selesai_pada} |
| 32 | Daftar Periksa | GET | `/api/v1/kemajuan` | 200 (harap 200) | Lulus | ok:true, data larik(1) dari {butir_id, selesai_pada} |
| 33 | Daftar Periksa | DELETE | `/api/v1/kemajuan/ktp` | 200 (harap 200) | Lulus | ok:true, data {butir_id, selesai_pada} |
| 34 | Daftar Periksa | GET | `/api/v1/butir-pribadi` | 200 (harap 200) | Lulus | ok:true, data larik(0) |
| 35 | Arsip | DELETE | `/api/v1/kartu/{id}` | 200 (harap 200) | Lulus | ok:true, data {dihapus} |
| 36 | Auth | POST | `/api/v1/auth/keluar` | 200 (harap 200) | Lulus | ok:true, data {keluar} |
| 37 | Auth: token sesudah keluar | GET | `/api/v1/auth/saya` | 401 (harap 401) | Lulus | galat TIDAK_MASUK: Anda harus masuk untuk mengakses ini. |

## Temuan

1. **Batas laju per IP bisa diakali dengan header palsu.** Permintaan dengan `X-Real-IP` atau `X-Forwarded-For` buatan klien mendapat kuota baru (`RateLimit-Remaining: 299`), sedangkan permintaan biasa terus berkurang (296, 295). Artinya pembatas percobaan masuk per IP tidak efektif. Kunci akun per akun (`percobaan_masuk`) tetap berlaku. Perlu dicek di konfigurasi nginx server: header IP klien harus ditimpa nginx (`proxy_set_header X-Real-IP $remote_addr;`), bukan diteruskan dari klien.
2. `GET /health` di akar domain dilayani landing (HTML), bukan backend. Health backend: `/api/v1/health`.
3. Port 3031 tertutup dari luar; backend hanya terjangkau lewat HTTPS di domain. Ini kondisi yang diinginkan.

## Data uji yang perlu dihapus manual oleh pihak server

Backend tidak punya endpoint hapus akun, hapus sesi Latihan, atau hapus riwayat Latihan.

- 1 akun uji dengan awalan nama pengguna `uji_apk_` (nama lengkap diberikan terpisah ke admin server, tidak ditulis di repo), beserta sesinya.
- 1 sesi Latihan dan 1 catatan riwayat Latihan milik akun itu.
- Kartu Arsip dan centang Daftar Periksa sudah dihapus oleh skrip (kartu dihapus lunak: baris tetap ada dengan `dihapus_pada` terisi).
