import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { garis, radius, ruang, tipografi, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
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
 * Kolom isian v2 (LANJUT_030, dua mode LANJUT_031b). Label tertulis di atas kolom DAN menjadi
 * accessibilityLabel. Tanpa placeholder: petunjuk ditulis sebagai teks biasa yang kontrasnya
 * cukup. Galat memakai ikon dan kalimat, juga garis galat. Papan ketik mengikuti mode aktif.
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
  barisGanda = false,
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
  barisGanda?: boolean;
}) {
  const { mode, warna } = useTemaV2();
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
        multiline={barisGanda}
        textAlignVertical={barisGanda ? 'top' : 'center'}
        returnKeyType={kunciKirim}
        onSubmitEditing={barisGanda ? undefined : onKirim}
        maxLength={maksPanjang ?? PERILAKU[jenis].maxLength}
        onFocus={() => setFokus(true)}
        onBlur={() => setFokus(false)}
        accessibilityLabel={label}
        accessibilityHint={petunjuk}
        accessibilityState={{ disabled: nonaktif }}
        aria-disabled={nonaktif}
        aria-invalid={!!galat}
        keyboardAppearance={mode === 'gelap' ? 'dark' : 'light'}
        selectionColor={warna.aksen}
        style={StyleSheet.flatten([
          s.kolom,
          barisGanda && s.kolomGanda,
          { color: warna.teks, borderColor: warna.garisKontrol, backgroundColor: warna.permukaan },
          nonaktif && { backgroundColor: warna.nonaktifLatar, borderColor: warna.nonaktifLatar, color: warna.nonaktifTeks },
          galat ? { borderColor: warna.galat, borderWidth: garis.fokus } : null,
          fokus && { borderColor: warna.fokus, borderWidth: garis.fokus },
        ])}
      />
      {galat ? <PesanStatus jenis="galat">{galat}</PesanStatus> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  kolom: {
    ...tipografi.badan,
    minHeight: ukuran.sentuhMin,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
  },
  kolomGanda: {
    minHeight: ukuran.sentuhMin + ukuran.lingkaranIkon,
  },
});
