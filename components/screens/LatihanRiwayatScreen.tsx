import React from 'react';
import { Article } from '@expo/html-elements';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { SesiLatihan } from '../../api/types';
import { useRiwayatLatihan } from '../../hooks/useLatihan';
import { useMapel } from '../../hooks/useMapel';
import { namaMapel } from '../../lib/arsip';
import { formatWaktuSesi } from '../../lib/latihan';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Kartu, KeadaanGalat, Kepala, Kosong, Lencana, Memuat, Tombol, gaya } from '../ui';

/**
 * Riwayat Latihan (LANJUT_041) — GET /sesi-latihan: sesi milik sendiri,
 * terbaru dulu (50 terakhir). Pola baris kartu sama dengan daftar Arsip.
 * Sesi yang ditinggal tanpa ditutup tetap tampil, bertanda "Tidak selesai".
 */
export function LatihanRiwayatScreen() {
  const router = useRouter();
  const riwayat = useRiwayatLatihan();
  const mapelQuery = useMapel();

  const isi = () => {
    if (riwayat.isPending) return <Memuat />;
    if (riwayat.isError) return <KeadaanGalat />;
    if (!riwayat.data.length) {
      return (
        <Kosong
          judul="Belum ada sesi latihan."
          teks="Sesi yang sudah kamu kerjakan muncul di sini."
          aksi={<Tombol label="Mulai latihan" varian="sekunder" onPress={() => router.push('/latihan')} />}
        />
      );
    }
    return (
      <View style={s.daftar}>
        {riwayat.data.map((sesi) => (
          <BarisSesi
            key={sesi.id}
            sesi={sesi}
            mapel={sesi.mapel_fokus_id ? namaMapel(sesi.mapel_fokus_id, mapelQuery.data) : 'Semua mapel'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul="Riwayat Latihan" />
      {isi()}
    </View>
  );
}

function BarisSesi({ sesi, mapel }: { sesi: SesiLatihan; mapel: string }) {
  return (
    <Article>
      <Kartu style={s.kartu}>
        <View style={s.baris}>
          <Text style={s.judul}>{mapel}</Text>
          {sesi.selesai_pada ? null : <Lencana varian="neutral">Tidak selesai</Lencana>}
        </View>
        <Text style={gaya.teksKecil}>{formatWaktuSesi(sesi.dimulai_pada)}</Text>
        <Text style={gaya.teksBody}>
          {sesi.jumlah_dijawab} dari {sesi.jumlah_kartu_direncanakan} kartu · {sesi.jumlah_benar} benar
        </Text>
      </Kartu>
    </Article>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s2 },
  kartu: { padding: spacing.s3, borderRadius: radius.md, gap: spacing.s1 },
  baris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s2 },
  judul: { ...teks.body, fontFamily: font.semibold, color: color.textBody, flex: 1 },
});
