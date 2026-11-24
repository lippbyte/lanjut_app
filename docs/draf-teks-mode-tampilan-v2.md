# Draf teks mode tampilan v2 (LANJUT_031b)

> **Status: DRAF — belum disetujui.** Tidak boleh dinyalakan pada build rilis sebelum Khalifa membaca dan menyetujui teks di bawah ini.
> **Saklar:** `EXPO_PUBLIC_MODE_GELAP` (mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` dengan id `mode-gelap-v2`.
> **Sumber kode:** `lib/modeTampilan.ts` (`TEKS_MODE_TAMPILAN`), ditampilkan oleh `components/screens/v2/PilihModeTampilanV2.tsx` di layar **Akun & Privasi** (`/akun`) lewat `AppShellV2` saat saklar menyala.
> **Catatan:** tidak ada klaim privasi baru; pilihan mode hanya tersimpan secara lokal di perangkat (AsyncStorage biasa) dan tidak dikirim ke server.

## Kartu pengaturan tampilan (layar Akun & Privasi `/akun`)

- **Judul seksi:** `Tampilan`
- **Ringkasan:** `Pilih tampilan terang, gelap, atau ikuti setelan perangkat.`

### Pilihan (kelompok radio, tiga opsi)

| Nilai internal | Label tampil | Keterangan perilaku |
|---|---|---|
| `sistem` | `Ikuti sistem` | Bawaan saat saklar menyala. Mengikuti setelan terang/gelap HP (`useColorScheme()`); bila tidak diketahui, jatuh ke mode terang. |
| `terang` | `Terang` | Menampilkan layar v2 dalam mode terang (menimpa setelan HP). |
| `gelap` | `Gelap` | Menampilkan layar v2 dalam mode gelap Midnight Navy (menimpa setelan HP). |
