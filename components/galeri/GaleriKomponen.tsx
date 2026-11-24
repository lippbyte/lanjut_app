import React, { useState } from 'react';
import { useFonts } from 'expo-font';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKurangiGerak } from '../../hooks/useKurangiGerak';
import { BELUM_TAHU } from '../../lib/pilihan';
import { garis, ruang, tataLetak } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import {
  BarisDaftar,
  HeaderLayar,
  Kartu,
  KeadaanGalat,
  KeadaanKosong,
  PesanStatus,
  Pilihan,
  PlaceholderMemuat,
  RingkasanSelengkapnya,
  Teks,
  Tombol,
} from '../v2';

/**
 * Galeri komponen v2 — KHUSUS PENGEMBANG (LANJUT_029, dua mode LANJUT_031b). Hanya terdaftar bila
 * __DEV__ dan EXPO_PUBLIC_GALERI_KOMPONEN=1 (lib/galeriKomponen.ts). Semua teks di sini contoh,
 * bukan teks layar, dan tidak ada data akun atau permintaan jaringan.
 */
const ARAH_CONTOH = [
  { nilai: 'melanjutkan', label: 'Contoh: Melanjutkan' },
  { nilai: 'bekerja', label: 'Contoh: Bekerja' },
  { nilai: 'wirausaha', label: 'Contoh: Wirausaha', keterangan: 'Contoh keterangan satu kalimat.' },
];

const tidakApaApa = () => {};

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  const { warna } = useTemaV2();
  return (
    <View style={StyleSheet.flatten([s.bagian, { borderTopColor: warna.garisHalus }])}>
      <Teks varian="h2">{judul}</Teks>
      {children}
    </View>
  );
}

export function GaleriKomponen() {
  // LANJUT_030: huruf isi v2 (Source Sans 3) dimuat galeri sendiri; root layout hanya memuatnya untuk alur v2.
  useFonts({
    SourceSans3_400Regular: require('../../assets/fonts/SourceSans3_400Regular.ttf'),
    SourceSans3_600SemiBold: require('../../assets/fonts/SourceSans3_600SemiBold.ttf'),
  });
  const { warna } = useTemaV2();
  const { top, bottom } = useSafeAreaInsets();
  const kurangiGerak = useKurangiGerak();
  const [satu, setSatu] = useState<string[]>(['melanjutkan']);
  const [banyak, setBanyak] = useState<string[]>([BELUM_TAHU]);
  const [memuatTombol, setMemuatTombol] = useState(false);

  return (
    <ScrollView
      style={StyleSheet.flatten([s.akar, { backgroundColor: warna.halaman }])}
      contentContainerStyle={StyleSheet.flatten([s.gulir, { paddingTop: top, paddingBottom: bottom + ruang.r6 }])}
    >
      <View style={s.kolom}>
        <View style={StyleSheet.flatten([s.pita, { backgroundColor: warna.aksen }])} accessibilityRole="text">
          <Teks varian="judulKecil" warna="teksPadaAksen">
            DEV · Galeri komponen v2 (LANJUT_029)
          </Teks>
          <Teks varian="keterangan" warna="teksPadaAksen">
            Bukan layar produksi. Semua teks di sini contoh. Kurangi gerakan: {kurangiGerak ? 'menyala' : 'mati'}.
          </Teks>
        </View>

        <HeaderLayar judul="Contoh judul layar" ringkasan="Contoh ringkasan satu kalimat di bawah judul." onKembali={tidakApaApa} />

        <Bagian judul="Teks">
          <Teks varian="h1">Contoh H1</Teks>
          <Teks varian="h2">Contoh H2</Teks>
          <Teks varian="judulKecil">Contoh judul kecil</Teks>
          <Teks varian="badan">Contoh badan teks untuk isi utama.</Teks>
          <Teks varian="badanKecil" warna="teksSekunder">
            Contoh badan kecil, warna sekunder.
          </Teks>
          <Teks varian="keterangan" warna="teksSekunder">
            Contoh keterangan.
          </Teks>
        </Bagian>

        <Bagian judul="Tombol">
          <Tombol
            label="Contoh aksi utama"
            memuat={memuatTombol}
            onPress={() => {
              setMemuatTombol(true);
              setTimeout(() => setMemuatTombol(false), 1500);
            }}
          />
          <Tombol varian="sekunder" label="Contoh sekunder" onPress={tidakApaApa} />
          <Tombol varian="teks" label="Contoh tombol teks" onPress={tidakApaApa} />
          <Tombol label="Contoh sedang memuat" memuat onPress={tidakApaApa} />
          <Tombol label="Contoh nonaktif" nonaktif onPress={tidakApaApa} />
          <Tombol varian="sekunder" label="Contoh dengan galat" galat="Contoh: belum tersimpan. Coba lagi." onPress={tidakApaApa} />
          <Tombol label="Contoh lebar penuh" penuh onPress={tidakApaApa} />
        </Bagian>

        <Bagian judul="Kartu">
          <Kartu judul="Contoh kartu" keterangan="Contoh keterangan satu kalimat." />
          <Kartu judul="Contoh kartu lembut" keterangan="Contoh: bisa ditekan, membuka layar lain." varian="lembut" onPress={tidakApaApa} />
          <Kartu judul="Contoh kartu brand" keterangan="Contoh: latar bagian biru, teks utama." varian="brand" />
          <Kartu judul="Contoh kartu memuat" memuat />
          <Kartu judul="Contoh kartu nonaktif" keterangan="Contoh: belum bisa dibuka." nonaktif onPress={tidakApaApa} />
          <Kartu judul="Contoh kartu galat" keterangan="Contoh isi." galat="Contoh: gagal memuat bagian ini." />
        </Bagian>

        <Bagian judul="Baris daftar">
          <View style={{ backgroundColor: warna.permukaan }}>
            <BarisDaftar judul="Contoh baris" onPress={tidakApaApa} />
            <BarisDaftar judul="Contoh dengan nilai" nilai="Contoh nilai" keterangan="Contoh keterangan." onPress={tidakApaApa} />
            <BarisDaftar judul="Contoh baris memuat" memuat onPress={tidakApaApa} />
            <BarisDaftar judul="Contoh baris nonaktif" nonaktif onPress={tidakApaApa} />
            <BarisDaftar judul="Contoh baris galat" galat="Contoh: belum bisa dibuka." onPress={tidakApaApa} pemisah={false} />
          </View>
        </Bagian>

        <Bagian judul="Pilihan">
          <Pilihan judul="Contoh pilih satu" mode="satu" opsi={ARAH_CONTOH} terpilih={satu} onUbah={setSatu} belumTahu="Contoh: Belum tahu" />
          <Pilihan judul="Contoh pilih banyak" mode="banyak" opsi={ARAH_CONTOH} terpilih={banyak} onUbah={setBanyak} belumTahu="Contoh: Belum tahu" />
          <Pilihan judul="Contoh pilihan memuat" mode="satu" opsi={ARAH_CONTOH} terpilih={[]} onUbah={tidakApaApa} memuat />
          <Pilihan judul="Contoh pilihan nonaktif" mode="banyak" opsi={ARAH_CONTOH} terpilih={['bekerja']} onUbah={tidakApaApa} nonaktif />
          <Pilihan judul="Contoh pilihan galat" mode="satu" opsi={ARAH_CONTOH} terpilih={[]} onUbah={tidakApaApa} galat="Contoh: pilih satu dulu." />
        </Bagian>

        <Bagian judul="Header layar">
          <HeaderLayar judul="Contoh header memuat" memuat />
          <HeaderLayar judul="Contoh header galat" galat="Contoh: sebagian isi belum termuat." onKembali={tidakApaApa} kembaliNonaktif />
        </Bagian>

        <Bagian judul="Keadaan kosong">
          <KeadaanKosong judul="Contoh: belum ada isi" teks="Contoh kalimat apa yang bisa dilakukan." aksi={{ label: 'Contoh aksi', onPress: tidakApaApa }} />
        </Bagian>

        <Bagian judul="Keadaan galat">
          <KeadaanGalat judul="Contoh: belum bisa dimuat" pesan="Contoh kalimat apa yang bisa dilakukan." onCobaLagi={tidakApaApa} />
          <KeadaanGalat judul="Contoh: sedang mencoba lagi" pesan="Contoh kalimat." onCobaLagi={tidakApaApa} mencobaLagi />
        </Bagian>

        <Bagian judul="Pesan status">
          <PesanStatus jenis="sukses">Contoh: tersimpan.</PesanStatus>
          <PesanStatus jenis="sukses" berlatar>
            Contoh: tersimpan, dengan latar.
          </PesanStatus>
          <PesanStatus jenis="galat" berlatar>
            Contoh: belum tersimpan, dengan latar.
          </PesanStatus>
        </Bagian>

        <Bagian judul="Placeholder memuat">
          <PlaceholderMemuat />
        </Bagian>

        <Bagian judul="Ringkasan dengan selengkapnya">
          <RingkasanSelengkapnya
            ringkasan="Contoh ringkasan satu kalimat."
            isi="Contoh uraian lengkap yang baru tampil setelah tombol Selengkapnya ditekan. Uraian ini boleh beberapa kalimat."
          />
          <RingkasanSelengkapnya ringkasan="Contoh ringkasan, tombol nonaktif." isi="Contoh." nonaktif />
          <RingkasanSelengkapnya ringkasan="Contoh ringkasan memuat." isi="Contoh." memuat />
          <RingkasanSelengkapnya ringkasan="Contoh ringkasan galat." isi="Contoh." galat="Contoh: uraian belum bisa dimuat." />
        </Bagian>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
  gulir: { flexGrow: 1 },
  kolom: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center' },
  pita: { paddingHorizontal: ruang.tepi, paddingVertical: ruang.r1 },
  bagian: { gap: ruang.r2, paddingHorizontal: ruang.tepi, paddingVertical: ruang.r3, borderTopWidth: garis.tipis },
});
