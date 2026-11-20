import React from 'react';
import { StyleSheet, View } from 'react-native';

import { garis, ruang, ukuran, warna } from '../../theme/v2';
import { Ikon } from '../ui/Ikon';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Baris daftar v2 (LANJUT_029): judul, keterangan satu baris opsional, nilai di kanan, panah.
 * Seluruh baris satu kontrol (peran "link" bila membuka layar lain, "button" bila menjalankan
 * aksi). Label pembaca layar = judul + nilai, supaya nilai tidak terlewat.
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
  if (memuat) {
    return (
      <View style={StyleSheet.flatten([s.baris, pemisah && s.pemisah])}>
        <View style={s.isi}>
          <PlaceholderMemuat baris={1} label={`Memuat ${judul}`} />
        </View>
      </View>
    );
  }
  const warnaUtama = nonaktif ? 'nonaktifTeks' : 'teks';
  const warnaKedua = nonaktif ? 'nonaktifTeks' : 'teksSekunder';
  return (
    <View style={pemisah ? s.pemisah : undefined}>
      <Sentuh
        peran={peran}
        label={nilai ? `${judul}, ${nilai}` : judul}
        petunjuk={keterangan}
        onPress={onPress}
        nonaktif={nonaktif}
        gaya={({ ditekan }) => [s.baris, ditekan && s.ditekan]}
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
  ditekan: { backgroundColor: warna.permukaanLembut },
  isi: { flex: 1, minWidth: 0 },
  pemisah: { borderBottomWidth: garis.tipis, borderBottomColor: warna.garisHalus },
  galat: { paddingHorizontal: ruang.tepi, paddingBottom: ruang.r1 },
});
