# Galeri komponen v2: tangkapan layar DEV (LANJUT_029)

> **DEV.** Galeri ini layar khusus pengembang, bukan layar produksi. Semua teks di dalamnya contoh.
> **Diperiksa di peramban (Edge headless, lebar 360 px), bukan di HP.** Belum dicoba di HP sungguhan.

## Cara melihat galeri

Galeri tidak butuh server API dan tidak membaca data akun. Jalankan perintah ini di PowerShell, di folder `LANJUT_App`:

```powershell
$env:EXPO_PUBLIC_GALERI_KOMPONEN = '1'
# Wajib: .env lokal berisi alamat API produksi. Galeri tidak memanggil API, tetapi app tetap memuat sesi.
$env:EXPO_PUBLIC_API_URL = 'http://localhost:4000/api/v1'
npx expo start --web
```

Lalu buka `http://localhost:8081/galeri-komponen`. Untuk mematikan galeri, tutup jendela PowerShell atau jalankan `Remove-Item Env:EXPO_PUBLIC_GALERI_KOMPONEN`.

Galeri hanya terdaftar bila kedua syarat ini terpenuhi:
1. bundel pengembangan (`__DEV__`);
2. `EXPO_PUBLIC_GALERI_KOMPONEN=1`.

Pada build rilis (`expo export` tanpa `--dev`, `eas build`), berkas rutenya dikeluarkan dari bundel walau saklarnya menyala. Profil EAS selain `development` selalu mematikannya (`app.config.ts`).

## Berkas

| Berkas | Isi |
|---|---|
| `01-galeri-penuh.png` | Seluruh galeri: Teks, Tombol, Kartu, Baris daftar, Pilihan, Header layar, Keadaan kosong, Keadaan galat, Pesan status, Placeholder memuat, Ringkasan dengan selengkapnya, masing-masing dengan keadaan memuat, nonaktif, dan galat |
| `02-pilihan-dua-arah.png` | Pilihan banyak: dua arah contoh terpilih, "belum tahu" terlepas. Tanda centang dan tulisan "2 dipilih", bukan hanya warna |
| `03-selengkapnya-terbuka.png` | Ringkasan dengan selengkapnya sesudah ditekan |
| `04-fokus-papan-ketik.png` | Fokus papan ketik (Tab) pada tombol Kembali: cincin 2 pt biru tua |
| `05-produksi-tanpa-galeri.png` | Build produksi yang dibuat dengan `EXPO_PUBLIC_GALERI_KOMPONEN=1`: `/galeri-komponen` tidak terdaftar ("Unmatched Route") |

Biru tua, sukses, dan galat di tangkapan layar memakai **opsi A**, yang masih menunggu keputusan (`docs/desain-token-v2.md`). Badan teks masih Poppins, karena Source Sans 3 belum dipasang.

## Hasil pemeriksaan di peramban (21/21 lolos)

**Saklar dan isi**
- Galeri tampil di build dev (`expo export --dev`) dengan saklar menyala.
- Tidak ada galat konsol.
- Tidak ada permintaan jaringan selain berkas build.

**Kontrol dan pembaca layar**
- 34 kontrol (16 tombol, 4 tautan, 7 radio, 7 kotak centang). Terkecil 44×44; semuanya punya peran dan label.
- Keadaan dibacakan lewat `aria-disabled`, `aria-busy`, `aria-checked`, dan `aria-expanded`.
- Judul berperan heading.
- Placeholder dibacakan "Memuat".

**Kurangi gerakan**
- Saat setelan mati, denyut placeholder berjalan: opasitas 0,55–1,00.
- Saat `prefers-reduced-motion: reduce` dinyalakan **tanpa muat ulang**, tulisan berubah menjadi "Kurangi gerakan: menyala" dan denyut berhenti di opasitas 1. Saat dimatikan lagi, tulisan kembali.

**Perilaku komponen**
- Pilihan banyak:
  - memilih dua arah melepas "belum tahu";
  - memilih "belum tahu" melepas yang lain;
  - status tertulis "2 dipilih".
- "Selengkapnya" membuka uraian, dengan `aria-expanded=true`.
- Fokus papan ketik menampilkan outline 2 px solid `rgb(69, 106, 140)`.

**Build produksi**
- Bundel produksi yang dibuat dengan saklar menyala tidak memuat string galeri maupun komponen v2.
- `/galeri-komponen` menampilkan halaman "Unmatched Route".

## Yang belum terbukti

- Tampilan dan sentuhan di HP sungguhan (Android, iOS, Expo Go).
- Pembacaan oleh TalkBack atau VoiceOver.
- Skala font besar (misalnya 200%) di HP.
- Di web, cincin fokus juga muncul sesudah klik mouse, karena kontrol yang diklik menjadi fokus. Di HP, fokus hanya dari papan ketik atau pembaca layar; ini belum diuji.
