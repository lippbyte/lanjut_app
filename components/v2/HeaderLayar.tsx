import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Header layar v2 (LANJUT_029, dua mode + Phosphor LANJUT_031b): tombol kembali opsional,
 * judul H1, dan paling banyak satu kalimat ringkasan. Teks panjang tidak ditaruh di sini.
 */
export function HeaderLayar({
  judul,
  ringkasan,
  onKembali,
  kembaliNonaktif = false,
  memuat = false,
  galat,
  tanpaTepi = false,
}: {
  /** LANJUT_030: di dalam kerangka yang sudah bertepi (KerangkaV2), tepi kiri-kanan tidak diulang. */
  tanpaTepi?: boolean;
  judul: string;
  ringkasan?: string;
  onKembali?: () => void;
  kembaliNonaktif?: boolean;
  memuat?: boolean;
  galat?: string;
}) {
  const { warna } = useTemaV2();
  return (
    <View style={StyleSheet.flatten([s.wadah, { backgroundColor: warna.halaman }, tanpaTepi && s.tanpaTepi])}>
      {onKembali ? (
        <Sentuh peran="button" label="Kembali" onPress={onKembali} nonaktif={kembaliNonaktif} gaya={() => s.kembali}>
          <Ikon nama="kembali" ukuran={ukuran.ikon} warna={kembaliNonaktif ? warna.nonaktifTeks : warna.teks} />
        </Sentuh>
      ) : null}
      {memuat ? (
        <PlaceholderMemuat baris={2} label="Memuat judul" />
      ) : (
        <>
          <Teks varian="h1">{judul}</Teks>
          {ringkasan ? (
            <Teks varian="badan" warna="teksSekunder">
              {ringkasan}
            </Teks>
          ) : null}
        </>
      )}
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1, paddingHorizontal: ruang.tepi, paddingTop: ruang.r2, paddingBottom: ruang.r3 },
  tanpaTepi: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: ruang.r1 },
  kembali: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
});
