import React from 'react';
import { Article } from '@expo/html-elements';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { CeritaAlumni } from '../../api/types';
import { useCeritaAlumni } from '../../hooks/useCeritaAlumni';
import { color, font, spacing, teks } from '../../theme/tokens';
import { Kartu, KeadaanGalat, Kosong, Lencana, Memuat, Penafian, Tombol, gaya } from '../ui';

// mailto yang sama dengan tombol "Hubungkan kami" di MVP-PWA/alumni.html.
const TAUTAN_HUBUNGKAN =
  'mailto:edilaksogroup@gmail.com?subject=Cerita%20Alumni%20untuk%20LANJUT';

/**
 * F4 — padanan MVP-PWA/alumni.html. Judul ada di page bar (AppShell).
 * Hanya cerita ber-izin & `tayang` yang dikirim server (konten.repo.js
 * `ambilCeritaAlumniTayang`), jadi layar kosong adalah keadaan yang benar
 * selama belum ada cerita nyata.
 */
export function CeritaAlumniScreen() {
  const { data, isPending, isError } = useCeritaAlumni();

  return (
    <View style={gaya.layarIsiRapat}>
      <Text style={s.pendamping}>Mereka sudah lewat jalan ini.</Text>

      {isPending ? (
        <Memuat />
      ) : isError ? (
        <KeadaanGalat />
      ) : !data?.length ? (
        <Kosong
          judul="Cerita pertama sedang kami kumpulkan."
          teks="Kenal alumni SMK yang tembus PTN?"
          aksi={<Tombol label="Hubungkan kami" varian="sekunder" onPress={() => Linking.openURL(TAUTAN_HUBUNGKAN)} />}
        />
      ) : (
        data.map((cerita) => <KartuCerita key={cerita.id} cerita={cerita} />)
      )}

      <Penafian>Cerita nyata tayang setelah ada izin tertulis dari yang bersangkutan.</Penafian>
    </View>
  );
}

function KartuCerita({ cerita }: { cerita: CeritaAlumni }) {
  const router = useRouter();
  return (
    <Article>
      <Kartu style={s.kartu}>
        <View style={s.atas}>
          <View style={s.atasIsi}>
            <Text style={s.asal}>{[cerita.asal_smk, cerita.jurusan_smk].filter(Boolean).join(' · ')}</Text>
            <Text style={s.tujuan}>→ {[cerita.ptn, cerita.prodi].filter(Boolean).join(' · ')}</Text>
          </View>
          {/* Lencana CONTOH ikut datanya: cerita nyata tidak membawanya. */}
          {cerita.sumber === 'contoh' ? <Lencana varian="neutral">CONTOH</Lencana> : null}
        </View>
        <Lencana>Jalur {cerita.jalur}</Lencana>
        <Text style={gaya.teksKecil}>
          <Text style={gaya.tebal}>Hambatan: </Text>
          {cerita.hambatan}
        </Text>
        <Text style={gaya.teksKecil}>
          <Text style={gaya.tebal}>Yang dilakukan: </Text>
          {cerita.yang_dilakukan}
        </Text>
        <Text style={s.ajakan}>
          Kamu juga akan punya cerita seperti ini.{' '}
          <Text style={gaya.tautan} onPress={() => router.push('/daftar-periksa')} accessibilityRole="link">
            Simpan langkahmu di Daftar Periksa.
          </Text>
        </Text>
      </Kartu>
    </Article>
  );
}

const s = StyleSheet.create({
  pendamping: { ...teks.bodySm, color: color.textMuted },
  kartu: { gap: spacing.s3 },
  atas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.s3 },
  atasIsi: { flex: 1 },
  asal: { ...teks.title, fontFamily: font.semibold, color: color.textBody },
  tujuan: { ...teks.bodySm, fontFamily: font.medium, color: color.blue600, marginTop: 2 },
  ajakan: {
    ...teks.bodySm,
    color: color.textMuted,
    paddingTop: spacing.s3,
    borderTopWidth: 1,
    borderTopColor: color.borderHairline,
  },
});
