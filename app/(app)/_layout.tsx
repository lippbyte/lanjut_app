import React from 'react';
import { Redirect, Slot, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppShell } from '../../components/layout/AppShell';
import { LayarMemuat } from '../../components/layout/LayarMemuat';
import { BuatSandiBaruScreen } from '../../components/screens/BuatSandiBaruScreen';
import { IsiJenisSekolahScreen, IsiKelasScreen } from '../../components/screens/IsiKelasScreen';
import { PromptKebijakan } from '../../components/screens/TerimaKebijakan';
import { belumIsiJenisSekolah } from '../../lib/jenjang';
import { perluBuatSandiBaru } from '../../lib/sandiBaru';
import { useSesi } from '../../providers/AuthProvider';
import { ObrolanProvider } from '../../providers/ObrolanProvider';

// Satu-satunya layar yang tetap terbuka selama gerbang isi kelas / jenis
// sekolah: Data Akun (tempat mengisi keduanya, juga tombol Keluar).
const TERBUKA_TANPA_KELAS = '/akun';

// Pelindung rute, berurutan:
//   1. auth        — hanya untuk pengguna yang sudah masuk;
//   1b. sandi baru — LANJUT_083d: kata sandi lama dicabut (pemilik email mengambil alih akun);
//      layar "Buat kata sandi baru" menutup SEMUA rute (termasuk Data Akun), tanpa tombol
//      lewati, sampai sandi baru tersimpan. Gerbang lain menunggu sesudahnya;
//   2. isi kelas   — akun tanpa kelas wajib mengisinya dulu (LANJUT_036);
//      lalu kelas 10–12 tanpa jenis sekolah memilih SMA/SMK/MA (LANJUT_038)
//      — dua langkah berurutan, tidak pernah satu layar;
//   3. layar biasa — di dalamnya gerbang kelas 12 vs placeholder (LANJUT_035);
//   4. prompt kebijakan privasi (LANJUT_048) — HANYA sesudah gerbang 2 beres
//      (tidak menggantikan atau menumpuk di atas gerbang), bila kebijakan versi
//      berlaku belum diterima. Tidak memblokir: "Nanti saja" menutupnya untuk
//      sisa sesi login. Tidak tampil di /terima-kebijakan (layar yang sama).
// Gerbang 2 dibaca dari kelas & jenis sekolah AKUN (bukan state layar), jadi menutup app di
// tengah gerbang lalu membukanya lagi kembali ke gerbang yang sama, dan
// gerbang hilang begitu keduanya tersimpan.
export default function AppLayout() {
  const { status, pengguna } = useSesi();
  const pathname = usePathname();
  if (status === 'memuat') return <LayarMemuat />;
  if (status === 'keluar') return <Redirect href="/masuk" />;

  const perluSandi = perluBuatSandiBaru(pengguna);
  const tanpaKelas = !!pengguna && !pengguna.kelas;
  const tanpaJenis = !!pengguna && belumIsiJenisSekolah(pengguna.kelas, pengguna.jenis_sekolah);
  const tertahan = perluSandi || ((tanpaKelas || tanpaJenis) && pathname !== TERBUKA_TANPA_KELAS);
  const bolehPromptKebijakan = !!pengguna && !perluSandi && !tanpaKelas && !tanpaJenis && pathname !== '/terima-kebijakan';
  return (
    // key: riwayat obrolan (hanya di memori) tidak terbawa ke akun lain dan
    // hilang saat keluar — layout ini tidak dirender lagi saat status 'keluar'.
    <ObrolanProvider key={pengguna?.id} namaTampilan={pengguna?.nama_tampilan}>
      {/* <Slot/> TETAP terpasang selama gerbang tampil: melepasnya membuat
          navigator expo-router kehilangan state (tab dari /akun tidak bisa
          pindah halaman lagi). display:none menyembunyikannya dari layar,
          fokus, dan pembaca layar. */}
      <View style={tertahan ? s.tersembunyi : s.penuh}>
        <AppShell>
          <Slot />
        </AppShell>
      </View>
      {perluSandi ? <BuatSandiBaruScreen /> : tertahan ? tanpaKelas ? <IsiKelasScreen /> : <IsiJenisSekolahScreen /> : null}
      {bolehPromptKebijakan ? <PromptKebijakan /> : null}
    </ObrolanProvider>
  );
}

const s = StyleSheet.create({
  penuh: { flex: 1 },
  tersembunyi: { display: 'none' },
});
