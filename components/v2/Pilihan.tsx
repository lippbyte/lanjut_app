import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BELUM_TAHU, teksStatusPilihan, ubahPilihan, type ModePilihan } from '../../lib/pilihan';
import { garis, radius, ruang, ukuran, warna } from '../../theme/v2';
import { Ikon } from '../ui/Ikon';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

export type OpsiPilihan = { nilai: string; label: string; keterangan?: string };

/**
 * Pilihan v2 (LANJUT_029): satu (radio) atau banyak (kotak centang), dengan opsi "Belum tahu"
 * yang berdiri sendiri (lib/pilihan.ts). Disiapkan untuk kecenderungan arah, belum terhubung
 * ke data. Terpilih ditandai tiga cara: tanda centang di kotak (bentuk), garis lebih tebal,
 * dan status yang dibacakan (accessibilityState) serta ditulis ("2 dipilih").
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
                o.nilai === BELUM_TAHU && s.opsiBelumTahu,
                nonaktif ? s.opsiNonaktif : pilih ? s.opsiTerpilih : ditekan ? s.opsiDitekan : null,
                !!galat && !nonaktif && !pilih && s.opsiGalat,
              ]}
            >
              <View style={StyleSheet.flatten([mode === 'satu' ? s.bulat : s.kotak, pilih && !nonaktif && s.tandaTerisi, nonaktif && s.tandaNonaktif])}>
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
    borderColor: warna.garisKontrol,
    backgroundColor: warna.permukaan,
  },
  // "Belum tahu" sedikit terpisah dari opsi isi supaya terbaca sebagai jawaban tersendiri.
  opsiBelumTahu: { marginTop: ruang.r1 },
  opsiDitekan: { backgroundColor: warna.permukaanLembut },
  opsiTerpilih: { backgroundColor: warna.permukaanLembut, borderColor: warna.aksen, borderWidth: garis.fokus },
  opsiNonaktif: { backgroundColor: warna.nonaktifLatar, borderColor: warna.nonaktifLatar },
  opsiGalat: { borderColor: warna.galat },
  kotak: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    borderColor: warna.garisKontrol,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulat: {
    width: TANDA,
    height: TANDA,
    borderRadius: radius.pil,
    borderWidth: garis.fokus,
    borderColor: warna.garisKontrol,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tandaTerisi: { backgroundColor: warna.aksen, borderColor: warna.aksen },
  tandaNonaktif: { borderColor: warna.nonaktifTeks },
  isi: { flex: 1, minWidth: 0 },
});
