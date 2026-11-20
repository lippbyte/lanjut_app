import React from 'react';
import { StyleSheet, View } from 'react-native';

import { garis, radius, ruang, ukuran, warna } from '../../theme/v2';
import { Ikon } from '../ui/Ikon';
import { PesanStatus } from './PesanStatus';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Kotak centang tunggal v2 (LANJUT_030), mis. "Tetap masuk di HP ini" dan "Saya sudah membaca
 * kebijakan privasi". Tercentang ditandai bentuk (tanda centang), bukan hanya warna, dan
 * dibacakan lewat peran "checkbox" dan aria-checked.
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
  return (
    <View style={s.wadah}>
      <Sentuh
        peran="checkbox"
        label={label}
        petunjuk={keterangan}
        dicentang={dicentang}
        nonaktif={nonaktif}
        onPress={() => onUbah(!dicentang)}
        gaya={({ ditekan }) => [s.baris, ditekan && s.ditekan]}
      >
        <View style={StyleSheet.flatten([s.kotak, dicentang && !nonaktif && s.kotakTerisi, !!galat && !dicentang && s.kotakGalat])}>
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
  ditekan: { backgroundColor: warna.permukaanLembut },
  kotak: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    borderColor: warna.garisKontrol,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotakTerisi: { backgroundColor: warna.aksen, borderColor: warna.aksen },
  kotakGalat: { borderColor: warna.galat },
  isi: { flex: 1, minWidth: 0 },
});
