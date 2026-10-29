import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useHapusKartu, useKartuSaya } from '../../hooks/useKartu';
import { useMapel } from '../../hooks/useMapel';
import { PENANDA_KARTU_PENGGUNA, jenisKartu, namaMapel } from '../../lib/arsip';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Kartu, KeadaanGalat, Kosong, Lencana, Memuat, Sumber, Tombol, gaya } from '../ui';

/**
 * F6 — lihat satu kartu milik sendiri (`/arsip-kartu?id=`), ubah, atau hapus.
 * Kartu dicari di daftar milik sendiri (useKartuSaya), jadi id kartu orang
 * lain atau kartu kurasi tampil sebagai "tidak ditemukan".
 * Hapus = hapus lunak di server; dua langkah supaya tidak terhapus tak sengaja.
 */
export function ArsipKartuScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const kartuQuery = useKartuSaya();
  const mapelQuery = useMapel();
  const hapus = useHapusKartu();
  const [jawabanTerbuka, setJawabanTerbuka] = useState(false);
  const [yakinHapus, setYakinHapus] = useState(false);

  if (kartuQuery.isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (kartuQuery.isError) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;

  const kartu = kartuQuery.data.find((k) => k.id === id);
  if (!kartu) {
    return (
      <View style={gaya.layarIsiRapat}>
        <Kosong
          judul="Kartu ini tidak ditemukan."
          teks="Mungkin sudah dihapus."
          aksi={<Tombol label="Kembali ke Arsip" varian="sekunder" onPress={() => router.replace('/arsip')} />}
        />
      </View>
    );
  }

  const onHapus = () =>
    hapus.mutate(kartu.id, { onSuccess: () => router.replace('/arsip') });

  return (
    <View style={gaya.layarIsiRapat}>
      <View style={s.lencana}>
        <Lencana varian="neutral">{namaMapel(kartu.mapel_id, mapelQuery.data)}</Lencana>
        <Lencana varian="neutral">{jenisKartu(kartu)}</Lencana>
      </View>
      <Text style={s.judul} role="heading">
        {kartu.judul}
      </Text>

      <Kartu>
        <Text style={s.isi}>{kartu.isi}</Text>
      </Kartu>

      {kartu.jawaban ? (
        jawabanTerbuka ? (
          <View style={s.jawaban}>
            <Text style={s.label}>Jawaban</Text>
            <Text style={gaya.teksBody}>{kartu.jawaban}</Text>
          </View>
        ) : (
          <Tombol label="Lihat jawaban" varian="sekunder" penuh onPress={() => setJawabanTerbuka(true)} />
        )
      ) : null}

      <Sumber>{PENANDA_KARTU_PENGGUNA}</Sumber>

      <Tombol
        label="Ubah kartu"
        varian="garis"
        besar
        penuh
        onPress={() => router.push({ pathname: '/arsip-tulis', params: { id: kartu.id } })}
      />
      {yakinHapus ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <Text style={gaya.teksBody}>Hapus kartu ini? Kartu yang dihapus tidak bisa dikembalikan dari app.</Text>
          {hapus.isError ? <Text style={s.galat}>Belum terhapus. Coba lagi sebentar lagi.</Text> : null}
          <View style={s.aksi}>
            <Tombol label="Batal" varian="hantu" onPress={() => setYakinHapus(false)} />
            <Tombol label="Ya, hapus" proses={hapus.isPending} onPress={onHapus} />
          </View>
        </Kartu>
      ) : (
        <Tombol label="Hapus kartu" varian="hantu" onPress={() => setYakinHapus(true)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  lencana: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  judul: { ...teks.h2, color: color.textBody },
  isi: { ...teks.body, color: color.textBody },
  jawaban: { gap: spacing.s1, padding: spacing.s3, borderRadius: radius.md, backgroundColor: color.statusOkBg },
  label: { ...teks.label, color: color.statusOkFg, fontFamily: font.semibold },
  konfirmasi: { gap: spacing.s3 },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s2 },
  galat: { ...teks.caption, color: color.blue600 },
});
