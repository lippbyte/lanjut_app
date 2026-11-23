import React from 'react';
import { StyleSheet, View } from 'react-native';

import { garis, radius, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { Teks } from './Teks';
import { Tombol } from './Tombol';

/**
 * Keadaan galat v2 (LANJUT_029, dua mode + Phosphor LANJUT_031b): untuk isi yang gagal dimuat.
 * Ikon waspada (bentuk), judul berwarna galat, kalimat apa yang bisa dilakukan, dan tombol coba
 * lagi. Dibacakan segera. Bukan untuk tenggat: tenggat tidak pernah memakai warna galat.
 */
export function KeadaanGalat({
  judul,
  pesan,
  onCobaLagi,
  labelCobaLagi = 'Coba lagi',
  mencobaLagi = false,
}: {
  judul: string;
  pesan: string;
  onCobaLagi?: () => void;
  labelCobaLagi?: string;
  mencobaLagi?: boolean;
}) {
  const { warna } = useTemaV2();
  return (
    <View
      style={StyleSheet.flatten([s.wadah, { borderColor: warna.galat, backgroundColor: warna.galatLatar }])}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={s.kepala}>
        <Ikon nama="waspada" ukuran={ukuran.ikon} warna={warna.galat} />
        <View style={s.isi}>
          <Teks varian="judulKecil" warna="galat">
            {judul}
          </Teks>
        </View>
      </View>
      <Teks varian="badanKecil">{pesan}</Teks>
      {onCobaLagi ? <Tombol varian="sekunder" label={labelCobaLagi} onPress={onCobaLagi} memuat={mencobaLagi} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: {
    gap: ruang.r1,
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
  kepala: { flexDirection: 'row', alignItems: 'center', gap: ruang.r1 },
  isi: { flex: 1, minWidth: 0 },
});
