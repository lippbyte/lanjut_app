import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Kartu as DataKartu } from '../../api/types';
import { useKartuSaya } from '../../hooks/useKartu';
import { useMapel } from '../../hooks/useMapel';
import { jenisKartu, mapelBerkartu, namaMapel } from '../../lib/arsip';
import { urutkanMapelPilihan } from '../../lib/mapelPilihan';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, KeadaanGalat, Kepala, Kosong, Lencana, Memuat, Tombol, gaya } from '../ui';
import { DaftarOpsi, OpsiPil } from './auth/AuthUI';
import { BagianModul } from './ModulScreens';

const SEMUA = '__semua__';

/**
 * F6 Arsip Belajar (LANJUT_039) — daftar kartu MILIK SENDIRI, disaring per
 * mapel. Kartu kurasi tim konten (12 kartu, belum diverifikasi) tidak
 * pernah diambil: hooks/useKartu.ts meminta `?sumber=pengguna`.
 * Teks judul, pendamping, dan layar kosong dari salinan §4.5.
 */
export function ArsipScreen() {
  const router = useRouter();
  const kartuQuery = useKartuSaya();
  const mapelQuery = useMapel();
  const { pengguna } = useSesi();
  const [saring, setSaring] = useState<string>(SEMUA);

  const isi = () => {
    if (kartuQuery.isPending) return <Memuat />;
    if (kartuQuery.isError) return <KeadaanGalat />;
    const kartu = kartuQuery.data;
    if (!kartu.length) {
      return <Kosong judul="Belum ada kartu." teks="Mulai dari satu saja — catatan hari ini juga boleh." />;
    }

    // LANJUT_079: mapel pilihan (Mapel Saya / Pilih Mapel) tampil lebih dulu.
    const perMapel = mapelBerkartu(kartu, urutkanMapelPilihan(mapelQuery.data ?? [], pengguna?.mapel_pilihan));
    // Saringan yang mapelnya sudah tidak punya kartu (mis. sesudah dihapus) kembali ke Semua.
    const aktif = saring !== SEMUA && perMapel.some((m) => m.id === saring) ? saring : SEMUA;
    const tampil = aktif === SEMUA ? kartu : kartu.filter((k) => k.mapel_id === aktif);

    return (
      <>
        <DaftarOpsi>
          <OpsiPil label={`Semua (${kartu.length})`} aktif={aktif === SEMUA} onPress={() => setSaring(SEMUA)} />
          {perMapel.map((m) => (
            <OpsiPil key={m.id} label={`${m.nama} (${m.jumlah})`} aktif={aktif === m.id} onPress={() => setSaring(m.id)} />
          ))}
        </DaftarOpsi>
        <View style={s.daftar}>
          {tampil.map((k) => (
            <BarisKartu
              key={k.id}
              kartu={k}
              namaMapel={namaMapel(k.mapel_id, mapelQuery.data)}
              onPress={() => router.push({ pathname: '/arsip-kartu', params: { id: k.id } })}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul="Arsip Belajar" pengantar="Yang kamu simpan hari ini, kepakai nanti." />
      <Tombol label="Tambah kartu" besar penuh onPress={() => router.push('/arsip-tulis')} />
      {/* F7 (LANJUT_041) — latihan memakai kartu di arsip ini. */}
      {kartuQuery.data?.length ? (
        <Tombol label="Mulai latihan" varian="sekunder" besar penuh onPress={() => router.push('/latihan')} />
      ) : null}
      {isi()}
      {/* LANJUT_049 — modul (materi unggahan, teks saja). */}
      <BagianModul />
    </View>
  );
}

function BarisKartu({ kartu, namaMapel: mapel, onPress }: { kartu: DataKartu; namaMapel: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => (pressed ? s.ditekan : undefined)}>
      <Kartu style={s.kartu}>
        <View style={s.baris}>
          <View style={s.barisIsi}>
            <Text style={s.judul} numberOfLines={2}>
              {kartu.judul}
            </Text>
            <View style={s.lencana}>
              <Lencana varian="neutral">{mapel}</Lencana>
              <Lencana varian="neutral">{jenisKartu(kartu)}</Lencana>
            </View>
          </View>
          <Ikon nama="panah" ukuran={16} warna={color.ink500} />
        </View>
      </Kartu>
    </Pressable>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s2 },
  kartu: { padding: spacing.s3, borderRadius: radius.md },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3 },
  barisIsi: { flex: 1, minWidth: 0, gap: spacing.s2 },
  judul: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  lencana: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  ditekan: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
