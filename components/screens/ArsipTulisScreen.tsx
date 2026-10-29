import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Kartu as DataKartu } from '../../api/types';
import { pesanUntuk } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useKartuSaya, useSimpanKartu } from '../../hooks/useKartu';
import { useMapel } from '../../hooks/useMapel';
import { PANJANG_MAKS, PENANDA_KARTU_PENGGUNA, periksaKartu, type GalatFormKartu } from '../../lib/arsip';
import { color, spacing, teks } from '../../theme/tokens';
import { Kartu, KeadaanGalat, Kepala, Kosong, Memuat, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';

/**
 * F6 — tulis kartu baru (`/arsip-tulis`) atau ubah kartu sendiri
 * (`/arsip-tulis?id=`). Medan mengikuti tabel `kartu`: mapel (kategori),
 * judul, isi (sisi depan), jawaban (sisi belakang, opsional → "Soal").
 * Pilihan mapel dari GET /konten/mapel — daftar yang sama dengan F3.
 */
export function ArsipTulisScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const kartuQuery = useKartuSaya();
  const mapelQuery = useMapel();

  if ((id && kartuQuery.isPending) || mapelQuery.isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if ((id && kartuQuery.isError) || mapelQuery.isError) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;

  const kartu = id ? kartuQuery.data?.find((k) => k.id === id) : undefined;
  if (id && !kartu) {
    return (
      <View style={gaya.layarIsiRapat}>
        <Kosong judul="Kartu ini tidak ditemukan." teks="Mungkin sudah dihapus." />
      </View>
    );
  }
  // key: formulir dibuat ulang bila berpindah dari ubah ke tambah (atau kartu lain).
  return <Formulir key={kartu?.id ?? 'baru'} kartu={kartu} mapel={mapelQuery.data ?? []} />;
}

function Formulir({ kartu, mapel }: { kartu?: DataKartu; mapel: { id: string; nama: string }[] }) {
  const router = useRouter();
  const simpan = useSimpanKartu();
  const [mapelId, setMapelId] = useState<string | null>(kartu?.mapel_id ?? null);
  const [judul, setJudul] = useState(kartu?.judul ?? '');
  const [isi, setIsi] = useState(kartu?.isi ?? '');
  const [jawaban, setJawaban] = useState(kartu?.jawaban ?? '');
  const [galat, setGalat] = useState<GalatFormKartu>({});

  const kirim = () => {
    const cek = periksaKartu({ mapel_id: mapelId, judul, isi, jawaban });
    setGalat(cek);
    if (Object.keys(cek).length || !mapelId) return;
    simpan.mutate(
      { id: kartu?.id, isi: { mapel_id: mapelId, judul: judul.trim(), isi: isi.trim(), jawaban: jawaban.trim() || null } },
      { onSuccess: (tersimpan) => router.replace({ pathname: '/arsip-kartu', params: { id: tersimpan.id } }) }
    );
  };

  // Galat satu medan hilang begitu medan itu diubah, tidak menunggu Simpan lagi.
  const ubah = <T,>(set: (v: T) => void, k: keyof GalatFormKartu) => (v: T) => {
    set(v);
    setGalat((g) => ({ ...g, [k]: undefined }));
  };

  const medan = simpan.error instanceof ApiError ? simpan.error.medan : undefined;
  const galatDari = (k: keyof GalatFormKartu) => galat[k] ?? medan?.[k];

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={kartu ? 'Ubah kartu' : 'Tambah kartu baru'} />
      <Field label="Mapel" galat={galatDari('mapel_id')}>
        <DaftarOpsi>
          {mapel.map((m) => (
            <OpsiPil key={m.id} label={m.nama} aktif={mapelId === m.id} onPress={() => ubah(setMapelId, 'mapel_id')(m.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label="Judul" galat={galatDari('judul')}>
        <Input value={judul} onChangeText={ubah(setJudul, 'judul')} placeholder="mis. Turunan fungsi aljabar" maxLength={PANJANG_MAKS.judul} autoCapitalize="sentences" />
      </Field>
      <Field label="Isi" galat={galatDari('isi')}>
        <Input
          value={isi}
          onChangeText={ubah(setIsi, 'isi')}
          placeholder="Tulis di sini..."
          multiline
          autoCapitalize="sentences"
          maxLength={PANJANG_MAKS.isi}
          style={s.area}
          textAlignVertical="top"
        />
      </Field>
      <Field label="Jawaban" labelTambahan="(boleh dikosongkan)" hint="Isi bila kartunya berbentuk soal." galat={galatDari('jawaban')}>
        <Input
          value={jawaban}
          onChangeText={ubah(setJawaban, 'jawaban')}
          placeholder="Jawaban atau pembahasan singkat..."
          multiline
          autoCapitalize="sentences"
          maxLength={PANJANG_MAKS.jawaban}
          style={s.areaKecil}
          textAlignVertical="top"
        />
      </Field>
      {/* Penanda tetap (salinan §4.5) — disebut sejak awal, bukan kejutan setelah tersimpan. */}
      <Kartu varian="soft">
        <Text style={s.penanda}>Kartu ini akan bertanda {PENANDA_KARTU_PENGGUNA}</Text>
      </Kartu>
      <PesanGalat teks={simpan.isError ? pesanUntuk(simpan.error) : null} />
      <Tombol label={simpan.isPending ? 'Menyimpan…' : 'Simpan kartu'} besar penuh proses={simpan.isPending} onPress={kirim} />
    </View>
  );
}

const s = StyleSheet.create({
  area: { minHeight: 140, paddingTop: spacing.s3 },
  areaKecil: { minHeight: 88, paddingTop: spacing.s3 },
  penanda: { ...teks.bodySm, color: color.ink700 },
});
