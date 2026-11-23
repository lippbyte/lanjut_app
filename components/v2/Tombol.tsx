import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { garis, radius, ruang, type PeranWarna } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { PesanStatus } from './PesanStatus';
import { Sentuh } from './Sentuh';
import { Teks, type WarnaTeks } from './Teks';

export type VarianTombol = 'utama' | 'sekunder' | 'teks';

type Rupa = { latar: PeranWarna; latarTekan: PeranWarna; garis: PeranWarna; teks: WarnaTeks };

// Pasangan kontrasnya tercatat di theme/v2/warna.ts (PASANGAN).
// LANJUT_031b §2: tombol sekunder berlatar transparan dengan garis aksen; tautan/tombol teks bergaris bawah.
const RUPA: Record<VarianTombol, Rupa> = {
  utama: { latar: 'aksen', latarTekan: 'aksenTekan', garis: 'aksen', teks: 'teksPadaAksen' },
  sekunder: { latar: 'transparan', latarTekan: 'permukaanLembut', garis: 'aksen', teks: 'aksen' },
  teks: { latar: 'transparan', latarTekan: 'permukaanLembut', garis: 'transparan', teks: 'aksen' },
};
const RUPA_NONAKTIF: Rupa = { latar: 'nonaktifLatar', latarTekan: 'nonaktifLatar', garis: 'nonaktifLatar', teks: 'nonaktifTeks' };

/**
 * Tombol v2 (LANJUT_029, dua mode LANJUT_031b). Aturan: satu tombol "utama" per layar.
 * Keadaan memuat menampilkan putaran dan tetap menulis labelnya (bukan hanya putaran), nonaktif
 * berlatar abu-abu tanpa garis, galat menulis pesan dengan ikon di bawah tombol.
 */
export function Tombol({
  label,
  onPress,
  varian = 'utama',
  memuat = false,
  nonaktif = false,
  galat,
  penuh = false,
  petunjuk,
}: {
  label: string;
  onPress: () => void;
  varian?: VarianTombol;
  memuat?: boolean;
  nonaktif?: boolean;
  /** Kalimat galat terakhir dari aksi ini, mis. "Belum tersimpan. Coba lagi." */
  galat?: string;
  penuh?: boolean;
  petunjuk?: string;
}) {
  const { warna } = useTemaV2();
  const rupa = nonaktif ? RUPA_NONAKTIF : RUPA[varian];
  return (
    <View style={penuh ? s.penuh : s.pas}>
      <Sentuh
        peran="button"
        label={label}
        petunjuk={petunjuk}
        onPress={onPress}
        nonaktif={nonaktif}
        sibuk={memuat}
        gaya={({ ditekan }) => [
          s.tombol,
          varian === 'teks' && s.tombolTeks,
          { backgroundColor: warna[ditekan ? rupa.latarTekan : rupa.latar], borderColor: warna[rupa.garis] },
          !!galat && !nonaktif && varian !== 'teks' && { borderColor: warna.galat, borderWidth: garis.fokus },
        ]}
      >
        {memuat ? <ActivityIndicator color={warna[rupa.teks]} /> : null}
        <Teks varian="tombol" warna={rupa.teks} rata="center" garisBawah={varian === 'teks'}>
          {label}
        </Teks>
      </Sentuh>
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const s = StyleSheet.create({
  pas: { alignSelf: 'flex-start', gap: ruang.r1 },
  penuh: { alignSelf: 'stretch', gap: ruang.r1 },
  tombol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r3,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  tombolTeks: { paddingHorizontal: ruang.r2 },
});
