import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ruang } from '../../theme/v2';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

/**
 * Teks bertahap v2 (LANJUT_029, dua mode LANJUT_031b): satu kalimat ringkasan selalu tampil;
 * uraian lengkap baru tampil setelah "Selengkapnya" ditekan. Tautan diberi garis bawah di kedua
 * mode. Tanpa animasi buka-tutup.
 */
export function RingkasanSelengkapnya({
  ringkasan,
  isi,
  labelBuka = 'Selengkapnya',
  labelTutup = 'Ringkas lagi',
  awalTerbuka = false,
  memuat = false,
  nonaktif = false,
  galat,
}: {
  ringkasan: string;
  isi: React.ReactNode;
  labelBuka?: string;
  labelTutup?: string;
  awalTerbuka?: boolean;
  memuat?: boolean;
  nonaktif?: boolean;
  galat?: string;
}) {
  const [terbuka, setTerbuka] = useState(awalTerbuka);
  if (memuat) return <PlaceholderMemuat baris={2} label="Memuat ringkasan" />;
  return (
    <View style={s.wadah}>
      <Teks varian="badan">{ringkasan}</Teks>
      {terbuka ? <View style={s.isi}>{typeof isi === 'string' ? <Teks varian="badan">{isi}</Teks> : isi}</View> : null}
      {galat ? (
        <PesanStatus jenis="galat">{galat}</PesanStatus>
      ) : (
        <Sentuh
          peran="button"
          label={terbuka ? labelTutup : labelBuka}
          terbuka={terbuka}
          nonaktif={nonaktif}
          onPress={() => setTerbuka((t) => !t)}
          gaya={() => s.tombol}
        >
          <Teks varian="tombol" warna={nonaktif ? 'nonaktifTeks' : 'aksen'} garisBawah>
            {terbuka ? labelTutup : labelBuka}
          </Teks>
        </Sentuh>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  isi: { gap: ruang.r1 },
  tombol: { alignSelf: 'flex-start', justifyContent: 'center' },
});
