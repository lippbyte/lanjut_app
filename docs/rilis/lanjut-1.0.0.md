# LANJUT 1.0.0 (APK sekolah)

| Data | Nilai |
|---|---|
| `version` (versionName) | `1.0.0` |
| `versionCode` | `2` |
| Package | `com.edilakso.lanjut` |
| Profil EAS | `apk-sekolah` (environment EAS `production`) |
| ID build EAS | `371055ca-4bf3-4dc3-8aaf-71d3f3e14d18` |
| Build dimulai | 2026-11-01 05:12 WIB (2026-10-31 22:12 UTC) |
| Build selesai | 2026-11-01 05:31 WIB (2026-10-31 22:31 UTC) |
| Ukuran berkas | 106.505.024 byte (±101,6 MiB) |
| SHA-256 | `89bf56143b87a3ad142cc8c3da284f701fdfa9c15f2caaceedf88fb2011fb3fa` |
| Tautan unduh EAS | https://expo.dev/artifacts/eas/xSgBkFFjGnmpf6whfdrZO5z1MVCKtAjQjOqUDB58VxY.apk |
| Alamat API | `https://lanjut.smkn4bdg.sch.id/api/v1` |

Tautan EAS hanya untuk mengambil berkas. Halaman Unduh di landing menautkan salinan APK yang diunggah ke situs sendiri, bukan tautan ini. SHA-256 dan ukuran di atas dihitung dari berkas yang diunduh dari tautan EAS tersebut, jadi salinan di landing harus menghasilkan nilai yang sama.

## Cara memeriksa berkas

```powershell
Get-FileHash lanjut-1.0.0.apk -Algorithm SHA256
```

```bash
sha256sum lanjut-1.0.0.apk
```

## Yang sudah diperiksa dari isi APK

| Pemeriksaan | Hasil |
|---|---|
| `android:versionName` / `android:versionCode` di manifest | `1.0.0` / `2` |
| `android:usesCleartextTraffic` di manifest | `false` (HTTP polos diblokir) |
| `android:debuggable` | tidak ada (build rilis) |
| URL API di config yang tertanam (`assets/app.config`) | `https://lanjut.smkn4bdg.sch.id/api/v1` |
| Alamat dev (`10.0.2.2`, `localhost`) di config tertanam | tidak ada |
| Mikrofon Ngobrol | mati |
| Tanda tangan | keystore rilis yang dikelola EAS (kredensial jarak jauh proyek `lippbyte/lanjut`), bukan debug key |

## Belum diperiksa

- Uji di perangkat (Wi-Fi sekolah dan data seluler): login, Latihan, Arsip, Daftar Periksa, keluar, masuk ulang.
- Versi Android minimum yang sudah diuji (`minAndroidVersion` di landing tetap kosong sampai diuji).

## Catatan

- `android:allowBackup` bernilai `true` (bawaan template). Data app, termasuk token sesi di penyimpanan lokal, bisa ikut cadangan perangkat. Belum diubah; perlu keputusan sebelum rilis luas.
- Ukuran ±100 MB karena satu APK memuat semua arsitektur CPU. Bisa diperkecil nanti (APK per ABI), bukan untuk rilis ini.
- Rilis berikutnya wajib `versionCode` lebih besar dari `2` dan ditandatangani keystore yang sama; bila keystore berganti, pengguna harus menghapus app lebih dulu.
