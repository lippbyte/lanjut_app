import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ISI_KEBIJAKAN, STATUS_KEBIJAKAN, VERSI_KEBIJAKAN } from '../../lib/kebijakanPrivasi';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { AuthLayout, TombolUtama } from './auth/AuthUI';

/**
 * Isi lengkap kebijakan privasi (LANJUT_047) — DRAF, wajib direview ahli
 * hukum. Teks dari lib/kebijakan-privasi.json, tidak ditulis ulang di sini.
 * Dipakai halaman /kebijakan-privasi dan modal di layar Daftar.
 */
export function IsiKebijakan() {
  return (
    <View style={s.isi}>
      <View style={s.draf} role="note">
        <Text style={s.drafTeks}>{STATUS_KEBIJAKAN}</Text>
      </View>
      <Text style={s.versi}>Versi {VERSI_KEBIJAKAN}</Text>
      {ISI_KEBIJAKAN.map((b) => (
        <View key={b.judul} style={s.bagian}>
          <Text style={s.judul} role="heading" aria-level={2}>
            {b.judul}
          </Text>
          {(b.paragraf ?? []).map((p) => (
            <Text key={p} style={s.paragraf}>
              {p}
            </Text>
          ))}
          {(b.butir ?? []).map((p) => (
            <View key={p} style={s.butir}>
              <Text style={s.paragraf}>•</Text>
              <Text style={[s.paragraf, s.flex]}>{p}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Halaman /kebijakan-privasi — bisa dibuka sebelum maupun sesudah masuk. */
export function KebijakanPrivasiScreen() {
  const router = useRouter();
  const { status } = useSesi();
  const kembali = () => {
    if (router.canGoBack()) router.back();
    else router.replace(status === 'masuk' ? '/akun' : '/daftar');
  };
  return (
    <AuthLayout judul="Kebijakan Privasi" pengantar="Data apa yang disimpan LANJUT, untuk apa, dan apa hakmu.">
      <IsiKebijakan />
      <TombolUtama label="Kembali" labelProses="Kembali" proses={false} onPress={kembali} />
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  isi: { gap: spacing.s4 },
  draf: { padding: spacing.s3, borderRadius: radius.md, backgroundColor: color.ink100 },
  drafTeks: { ...teks.bodySm, fontFamily: font.semibold, color: color.ink700 },
  versi: { ...teks.caption, color: color.textMuted },
  bagian: { gap: spacing.s2 },
  judul: { ...teks.h3, color: color.textBody },
  paragraf: { ...teks.bodySm, color: color.ink700 },
  butir: { flexDirection: 'row', gap: spacing.s2 },
  flex: { flex: 1 },
});
