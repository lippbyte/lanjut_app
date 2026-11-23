import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BELUM_TAHU, teksStatusPilihan, ubahPilihan, type ModePilihan } from '../../lib/pilihan';
import { garis, radius, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

export type OpsiPilihan = { nilai: string; label: string; keterangan?: string };

/**
 * Pilihan v2 (LANJUT_029, dua mode + Phosphor LANJUT_031b): satu (radio) atau banyak (kotak
 * centang), dengan opsi "Belum tahu" yang berdiri sendiri (lib/pilihan.ts). Terpilih ditandai tiga
 * cara: tanda centang di kotak (bentuk), garis lebih tebal, dan status yang dibacakan serta ditulis.
 */
export function Pilihan({
  judul,
  opsi,
  mode,
  terpilih,
  onUbah,
  belumTahu,
  memuat = false,
  nonaktif = false,
  galat,
  judulTersembunyi = false,
}: {
  /** Judul pertanyaan; selalu menjadi label kelompok untuk pembaca layar. */
  judul: string;
  /** LANJUT_030: judul sudah tertulis di HeaderLayar, jadi tidak ditulis dua kali. */
  judulTersembunyi?: boolean;
  opsi: readonly OpsiPilihan[];
  mode: ModePilihan;
  terpilih: readonly string[];
  onUbah: (berikut: string[]) => void;
  /** Label opsi "belum tahu"; kosongkan untuk menyembunyikannya. */
  belumTahu?: string;
  memuat?: boolean;
  nonaktif?: boolean;
  galat?: string;
}) {
  const { warna } = useTemaV2();
  const semua = belumTahu ? [...opsi, { nilai: BELUM_TAHU, label: belumTahu }] : opsi;
  return (
    <View style={s.wadah} accessibilityRole={mode === 'satu' ? 'radiogroup' : undefined} accessibilityLabel={judul}>
      {judulTersembunyi ? null : <Teks varian="judulKecil">{judul}</Teks>}
      <Teks varian="keterangan" warna="teksSekunder">
        {`${mode === 'satu' ? 'Pilih satu' : 'Boleh pilih lebih dari satu'} · ${teksStatusPilihan(terpilih.length, mode)}`}
      </Teks>
      {memuat ? (
        <PlaceholderMemuat baris={semua.length || 3} label={`Memuat pilihan ${judul}`} />
      ) : (
        semua.map((o) => {
          const pilih = terpilih.includes(o.nilai);
          return (
            <Sentuh
              key={o.nilai}
              peran={mode === 'satu' ? 'radio' : 'checkbox'}
              label={o.label}
              petunjuk={o.keterangan}
              dicentang={pilih}
              terpilih={mode === 'satu' ? pilih : undefined}
              nonaktif={nonaktif}
              onPress={() => onUbah(ubahPilihan(terpilih, o.nilai, mode))}
              gaya={({ ditekan }) => [
                s.opsi,
                { borderColor: warna.garisKontrol, backgroundColor: warna.permukaan },
                o.nilai === BELUM_TAHU && s.opsiBelumTahu,
                nonaktif
                  ? { backgroundColor: warna.nonaktifLatar, borderColor: warna.nonaktifLatar }
                  : pilih
                    ? { backgroundColor: warna.permukaanLembut, borderColor: warna.aksen, borderWidth: garis.fokus }
                    : ditekan
                      ? { backgroundColor: warna.permukaanLembut }
                      : null,
                !!galat && !nonaktif && !pilih && { borderColor: warna.galat },
              ]}
            >
              <View
                style={StyleSheet.flatten([
                  mode === 'satu' ? s.bulat : s.kotak,
                  { borderColor: warna.garisKontrol },
                  pilih && !nonaktif && { backgroundColor: warna.aksen, borderColor: warna.aksen },
                  nonaktif && { borderColor: warna.nonaktifTeks },
                ])}
              >
                {pilih ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={nonaktif ? warna.nonaktifTeks : warna.teksPadaAksen} /> : null}
              </View>
              <View style={s.isi}>
                <Teks varian="badan" warna={nonaktif ? 'nonaktifTeks' : 'teks'}>
                  {o.label}
                </Teks>
                {o.keterangan ? (
                  <Teks varian="keterangan" warna={nonaktif ? 'nonaktifTeks' : 'teksSekunder'}>
                    {o.keterangan}
                  </Teks>
                ) : null}
              </View>
            </Sentuh>
          );
        })
      )}
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const TANDA = ukuran.ikon + garis.fokus * 2;

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  opsi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
  },
  // "Belum tahu" sedikit terpisah dari opsi isi supaya terbaca sebagai jawaban tersendiri.
  opsiBelumTahu: { marginTop: ruang.r1 },
  kotak: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulat: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.pil,
    borderWidth: garis.fokus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isi: { flex: 1, minWidth: 0 },
});
