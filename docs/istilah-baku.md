# Istilah Baku LANJUT

Istilah yang wajib dipakai di kode, skema, data, dan dokumen baru. Glosarium untuk pembaca umum ada terpisah di situs (repo induk, `landing/src/konten/glosarium.ts`).

| Istilah | Arti | Status |
|---|---|---|
| `jalur_seleksi` | Jalur masuk perguruan tinggi negeri: SNBP, SNBT, Mandiri. Kolom yang sama saat ini juga memuat nilai TKA. | Dipakai di database, API, dan kode aplikasi sejak LANJUT_001 seri v2 |
| `jalur_minat` | Jalur pengembangan siswa: Melanjutkan, Bekerja, Wirausaha. | Istilah sudah baku, entitasnya belum dibuat (Bagian 2 rencana v2) |

## Catatan pemakaian

- Kata `jalur` saja tidak dipakai untuk kedua arti di atas pada kode baru.
- Berkas konten (`server/data-konten`, salinan dari `MVP-PWA/data` di repo induk) masih memakai kunci lama `jalur`, `berlaku_untuk_jalur`, dan `jalur_masuk`, karena dibaca oleh PWA arsip. Kunci itu diterjemahkan saat benih, di `server/src/db/benih/benih.js`.
- API masih mengirim nama lama di samping `jalur_seleksi` untuk APK 1.0.0, hanya di `server/src/modul/konten/konten.rute.js`.
- "Jalur Saya" adalah nama fitur di layar `/cek-posisi`, bukan salah satu istilah di atas.
- Rincian seluruh pemakaian lama ada di `docs/audit-penamaan-jalur.md`.
