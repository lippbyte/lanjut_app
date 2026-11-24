import React from 'react';
import { StyleSheet, View } from 'react-native';

import { garis, radius, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { PesanStatus } from './PesanStatus';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Kotak centang tunggal v2 (LANJUT_030, dua mode + Phosphor LANJUT_031b), mis. "Tetap masuk di
 * HP ini" dan "Saya sudah membaca kebijakan privasi". Tercentang ditandai bentuk (tanda centang),
 * bukan hanya warna, dan dibacakan lewat peran "checkbox" dan aria-checked.
 */
export function Centang({
  label,
  keterangan,
  dicentang,
  onUbah,
  nonaktif = false,
  galat,
}: {
  label: string;
  keterangan?: string;
  dicentang: boolean;
  onUbah: (berikut: boolean) => void;
  nonaktif?: boolean;
  galat?: string;
}) {
  const { warna } = useTemaV2();
  return (
    <View style={s.wadah}>
      <Sentuh
        peran="checkbox"
        label={label}
        petunjuk={keterangan}
        dicentang={dicentang}
        nonaktif={nonaktif}
        onPress={() => onUbah(!dicentang)}
        gaya={({ ditekan }) => [s.baris, ditekan && { backgroundColor: warna.permukaanLembut }]}
      >
        <View
          style={StyleSheet.flatten([
            s.kotak,
            { borderColor: warna.garisKontrol },
            dicentang && !nonaktif && { backgroundColor: warna.aksen, borderColor: warna.aksen },
            !!galat && !dicentang && { borderColor: warna.galat },
          ])}
        >
          {dicentang ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={nonaktif ? warna.nonaktifTeks : warna.teksPadaAksen} /> : null}
        </View>
        <View style={s.isi}>
          <Teks varian="badan" warna={nonaktif ? 'nonaktifTeks' : 'teks'}>
            {label}
          </Teks>
          {keterangan ? (
            <Teks varian="keterangan" warna={nonaktif ? 'nonaktifTeks' : 'teksSekunder'}>
              {keterangan}
            </Teks>
          ) : null}
        </View>
      </Sentuh>
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const TANDA = ukuran.ikon + garis.fokus * 2;

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  baris: { flexDirection: 'row', alignItems: 'center', gap: ruang.r2, paddingVertical: ruang.r1, borderRadius: radius.kecil },
  kotak: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isi: { flex: 1, minWidth: 0 },
});
