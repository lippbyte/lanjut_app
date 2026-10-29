import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pesanUntuk, type GayaBelajar } from '../../api/auth';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import { GAYA_BELAJAR } from '../../lib/gayaBelajar';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kepala, Penafian, Tombol, gaya } from '../ui';
import { PesanGalat } from './auth/AuthUI';

/**
 * Preferensi gaya belajar (LANJUT_032). Disimpan ke akun lewat
 * PATCH /pengguna/saya (kolom pengguna.gaya_belajar, migrasi 007), dan bisa
 * diubah lagi dari sini atau dari form Data Akun.
 */
export function GayaBelajarScreen() {
  const { pengguna } = useSesi();
  const router = useRouter();
  const simpan = useUbahProfil();
  const tersimpan = pengguna?.gaya_belajar ?? null;
  const [pilihan, setPilihan] = useState<GayaBelajar | null>(tersimpan);
  const [belumPilih, setBelumPilih] = useState(false);

  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/akun'));
  const kirim = () => {
    if (!pilihan) return setBelumPilih(true);
    if (pilihan === tersimpan) return kembali();
    simpan.mutate({ gaya_belajar: pilihan }, { onSuccess: kembali });
  };

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala
        judul="Kamu paling nyambung belajar lewat apa?"
        pengantar="Pilih yang paling mirip sama kamu. Ini bukan tes, cuma preferensi, dan bisa diubah kapan saja."
      />

      <View style={s.daftar} role="radiogroup" aria-label="Gaya belajar">
        {GAYA_BELAJAR.map((g) => {
          const aktif = pilihan === g.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                setPilihan(g.id);
                setBelumPilih(false);
              }}
              accessibilityRole="radio"
              aria-checked={aktif}
              style={({ pressed }) => StyleSheet.flatten([s.opsi, aktif && s.opsiAktif, pressed && s.ditekan])}
            >
              <View style={s.opsiIsi}>
                <Text style={s.opsiJudul}>{g.label}</Text>
                <Text style={s.opsiKet}>{g.keterangan}</Text>
              </View>
              <View style={StyleSheet.flatten([s.bulat, aktif && s.bulatAktif])}>
                {aktif ? <Ikon nama="centang" ukuran={14} warna={color.white} tebal={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <PesanGalat
        teks={belumPilih ? 'Pilih salah satu dulu, ya.' : simpan.isError ? pesanUntuk(simpan.error) : null}
      />
      <Tombol label={simpan.isPending ? 'Menyimpan…' : 'Simpan'} besar penuh proses={simpan.isPending} onPress={kirim} />
      <Penafian>Disimpan di akunmu dan dipakai untuk menyesuaikan tips belajar di LANJUT.</Penafian>
    </View>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s3 },
  opsi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  opsiAktif: { borderColor: color.blue600, backgroundColor: color.blue100 },
  ditekan: { opacity: 0.85 },
  opsiIsi: { flex: 1, gap: 2 },
  opsiJudul: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  opsiKet: { ...teks.bodySm, color: color.textMuted },
  bulat: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.borderBrand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulatAktif: { backgroundColor: color.blue600, borderColor: color.blue600 },
});
