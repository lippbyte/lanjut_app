import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { garis, radius, ruang, tipografi, ukuran, warna } from '../../theme/v2';
import { PesanStatus } from './PesanStatus';
import { Teks } from './Teks';

export type JenisIsian = 'teks' | 'namaPengguna' | 'email' | 'sandi' | 'sandiBaru' | 'kode';

const PERILAKU: Record<JenisIsian, TextInputProps> = {
  teks: {},
  namaPengguna: { autoCapitalize: 'none', autoCorrect: false, autoComplete: 'username', textContentType: 'username' },
  email: { autoCapitalize: 'none', autoCorrect: false, keyboardType: 'email-address', autoComplete: 'email', textContentType: 'emailAddress' },
  sandi: { autoCapitalize: 'none', autoCorrect: false, secureTextEntry: true, autoComplete: 'current-password', textContentType: 'password' },
  sandiBaru: { autoCapitalize: 'none', autoCorrect: false, secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword' },
  kode: { keyboardType: 'number-pad', autoComplete: 'one-time-code', textContentType: 'oneTimeCode', maxLength: 6 },
};

/**
 * Kolom isian v2 (LANJUT_030). Label tertulis di atas kolom DAN menjadi accessibilityLabel, jadi
 * pembaca layar menyebut nama kolom (temuan audit 029: 14 dari 32 isian v1 tanpa nama). Tanpa
 * placeholder: petunjuk ditulis sebagai teks biasa yang kontrasnya cukup. Galat memakai ikon dan
 * kalimat, juga garis galat. Skala font sistem dihormati (tanpa tinggi tetap).
 */
export function Isian({
  label,
  nilai,
  onUbah,
  jenis = 'teks',
  petunjuk,
  galat,
  nonaktif = false,
  fokusAwal = false,
  onKirim,
  kunciKirim = 'next',
  maksPanjang,
}: {
  label: string;
  nilai: string;
  onUbah: (teks: string) => void;
  jenis?: JenisIsian;
  petunjuk?: string;
  galat?: string;
  nonaktif?: boolean;
  fokusAwal?: boolean;
  onKirim?: () => void;
  kunciKirim?: 'next' | 'go' | 'done' | 'send';
  maksPanjang?: number;
}) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={s.wadah}>
      <Teks varian="judulKecil" warna={nonaktif ? 'nonaktifTeks' : 'teks'}>
        {label}
      </Teks>
      {petunjuk ? (
        <Teks varian="keterangan" warna={nonaktif ? 'nonaktifTeks' : 'teksSekunder'}>
          {petunjuk}
        </Teks>
      ) : null}
      <TextInput
        {...PERILAKU[jenis]}
        value={nilai}
        onChangeText={onUbah}
        editable={!nonaktif}
        autoFocus={fokusAwal}
        returnKeyType={kunciKirim}
        onSubmitEditing={onKirim}
        maxLength={maksPanjang ?? PERILAKU[jenis].maxLength}
        onFocus={() => setFokus(true)}
        onBlur={() => setFokus(false)}
        accessibilityLabel={label}
        accessibilityHint={petunjuk}
        accessibilityState={{ disabled: nonaktif }}
        aria-disabled={nonaktif}
        aria-invalid={!!galat}
        selectionColor={warna.aksen}
        style={StyleSheet.flatten([s.kolom, nonaktif && s.kolomNonaktif, galat ? s.kolomGalat : null, fokus && s.kolomFokus])}
      />
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  kolom: {
    ...tipografi.badan,
    color: warna.teks,
    minHeight: ukuran.sentuhMin,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
    borderColor: warna.garisKontrol,
    backgroundColor: warna.permukaan,
  },
  kolomNonaktif: { backgroundColor: warna.nonaktifLatar, borderColor: warna.nonaktifLatar, color: warna.nonaktifTeks },
  kolomGalat: { borderColor: warna.galat, borderWidth: garis.fokus },
  kolomFokus: { borderColor: warna.fokus, borderWidth: garis.fokus },
});
