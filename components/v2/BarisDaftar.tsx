import React from 'react';
import { StyleSheet, View } from 'react-native';

import { garis, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Baris daftar v2 (LANJUT_029, dua mode + Phosphor LANJUT_031b): judul, keterangan satu baris
 * opsional, nilai di kanan, panah. Seluruh baris satu kontrol (peran "link" bila membuka layar
 * lain, "button" bila menjalankan aksi). Label pembaca layar = judul + nilai.
 */
export function BarisDaftar({
  judul,
  keterangan,
  nilai,
  onPress,
  peran = 'link',
  memuat = false,
  nonaktif = false,
  galat,
  pemisah = true,
}: {
  judul: string;
  keterangan?: string;
  nilai?: string;
  onPress: () => void;
  peran?: 'link' | 'button';
  memuat?: boolean;
  nonaktif?: boolean;
  galat?: string;
  pemisah?: boolean;
}) {
  const { warna } = useTemaV2();
  const gayaPemisah = { borderBottomWidth: garis.tipis, borderBottomColor: warna.garisHalus };

  if (memuat) {
    return (
      <View style={StyleSheet.flatten([s.baris, pemisah && gayaPemisah])}>
        <View style={s.isi}>
          <PlaceholderMemuat baris={1} label={`Memuat ${judul}`} />
        </View>
      </View>
    );
  }
  const warnaUtama = nonaktif ? 'nonaktifTeks' : 'teks';
  const warnaKedua = nonaktif ? 'nonaktifTeks' : 'teksSekunder';
  return (
    <View style={pemisah ? gayaPemisah : undefined}>
      <Sentuh
        peran={peran}
        label={nilai ? `${judul}, ${nilai}` : judul}
        petunjuk={keterangan}
        onPress={onPress}
        nonaktif={nonaktif}
        gaya={({ ditekan }) => [s.baris, ditekan && { backgroundColor: warna.permukaanLembut }]}
      >
        <View style={s.isi}>
          <Teks varian="badan" warna={warnaUtama}>
            {judul}
          </Teks>
          {keterangan ? (
            <Teks varian="keterangan" warna={warnaKedua}>
              {keterangan}
            </Teks>
          ) : null}
        </View>
        {nilai ? (
          <Teks varian="badanKecil" warna={warnaKedua}>
            {nilai}
          </Teks>
        ) : null}
        <Ikon nama="panah" ukuran={ukuran.ikon} warna={warna[warnaKedua]} />
      </Sentuh>
      {galat ? (
        <View style={s.galat}>
          <PesanStatus jenis="galat">{galat}</PesanStatus>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: ruang.r2, paddingVertical: ruang.r1, paddingHorizontal: ruang.tepi },
  isi: { flex: 1, minWidth: 0 },
  galat: { paddingHorizontal: ruang.tepi, paddingBottom: ruang.r1 },
});
