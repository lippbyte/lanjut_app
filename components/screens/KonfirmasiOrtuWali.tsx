import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useKonfirmasiOrtuWali, usePersetujuan } from '../../hooks/usePersetujuan';
import { keadaanKebijakan } from '../../lib/kebijakanPrivasi';
import { color, spacing, teks } from '../../theme/tokens';
import { KeadaanGalat, Kartu, Memuat, Tombol, gaya } from '../ui';
import { KotakCentang } from './auth/AuthUI';

// Salinan teks (15 Okt 2026) — DRAF belum disetujui Khalifa; belum masuk docs/salinan-teks-lanjut.md.
const JUDUL = 'Persetujuan orang tua atau wali';
const PENGANTAR =
  'Fitur AI di Ngobrol Bareng LANJUT dijawab AI dari penyedia pihak ketiga. Untuk siswa di bawah 18 tahun, fitur ini hanya boleh dipakai bila orang tua atau wali setuju. Serahkan HP ini ke orang tua atau walimu, lalu minta beliau membaca dan memutuskan.';
const POIN = [
  'Pesan yang ditulis di Ngobrol dikirim ke penyedia AI. Data pribadi di pesan disamarkan lebih dulu, dan obrolan tidak disimpan LANJUT.',
  'Pertanyaan tentang materi pelajaran ikut mengirim potongan modul dari Arsip Belajar.',
  'Jawaban AI bisa keliru. Fitur ini bukan pengganti guru, konselor, atau orang dewasa yang dipercaya.',
  'Persetujuan bisa dicabut lewat sekolah atau tim LANJUT.',
];
const PERNYATAAN =
  'Saya orang tua atau wali siswa ini. Saya sudah membaca keterangan di atas dan menyetujui anak saya memakai fitur AI di LANJUT.';
const PERLU_KEBIJAKAN = 'Siswa perlu menerima kebijakan privasi dulu, baru persetujuan ini bisa dicatat.';
const SUDAH = 'Persetujuan orang tua atau wali sudah tercatat. Fitur AI sudah bisa dipakai.';
const PERLU_CENTANG = 'Orang tua atau wali perlu mencentang pernyataan di atas dulu.';
const GALAT_SIMPAN = 'Belum tersimpan. Coba lagi sebentar lagi.';

/** Layar /persetujuan-ortu: orang tua/wali menyatakan persetujuan di app; server menentukan sumbernya. */
export function KonfirmasiOrtuWaliScreen() {
  const router = useRouter();
  const { data, isPending, isError } = usePersetujuan();
  const kirim = useKonfirmasiOrtuWali();
  const [setuju, setSetuju] = useState(false);
  const [belumCentang, setBelumCentang] = useState(false);
  const keNgobrol = () => router.replace('/ngobrol');
  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/ngobrol'));

  if (isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (isError || !data) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;

  const kebijakanSudah = keadaanKebijakan(data) === 'diterima';
  const selesai = data.ortu_wali_aktif;
  const galat = belumCentang
    ? PERLU_CENTANG
    : kirim.isError
      ? kirim.error instanceof ApiError
        ? kirim.error.message
        : GALAT_SIMPAN
      : null;

  return (
    <View style={gaya.layarIsiRapat}>
      <Kartu>
        <View style={s.panel}>
          <Text style={s.judul} role="heading" aria-level={2}>
            {JUDUL}
          </Text>
          {selesai ? (
            <>
              <Text style={gaya.teksBody}>{SUDAH}</Text>
              <Tombol label="Buka Ngobrol" penuh onPress={keNgobrol} />
            </>
          ) : !kebijakanSudah ? (
            <>
              <Text style={gaya.teksBody}>{PERLU_KEBIJAKAN}</Text>
              <Tombol label="Baca dan terima kebijakan" penuh onPress={() => router.push('/terima-kebijakan')} />
              <Tombol label="Kembali" varian="garis" penuh onPress={kembali} />
            </>
          ) : (
            <>
              <Text style={gaya.teksBody}>{PENGANTAR}</Text>
              <View style={s.daftar}>
                {POIN.map((t) => (
                  <View key={t} style={s.butir}>
                    <Text style={s.butirTeks}>•</Text>
                    <Text style={[s.butirTeks, s.flex]}>{t}</Text>
                  </View>
                ))}
              </View>
              <KotakCentang label={PERNYATAAN} tercentang={setuju} onAlih={() => {
                  setSetuju((v) => !v);
                  setBelumCentang(false);
                }} />
              {galat ? (
                <Text style={s.galat} role="alert">
                  {galat}
                </Text>
              ) : null}
              <View style={s.aksi}>
                <Tombol
                  label={kirim.isPending ? 'Menyimpan…' : 'Saya setuju'}
                  penuh
                  proses={kirim.isPending}
                  onPress={() => (setuju ? kirim.mutate() : setBelumCentang(true))}
                />
                <Tombol label="Tidak sekarang" varian="garis" penuh onPress={kembali} />
              </View>
            </>
          )}
        </View>
      </Kartu>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: spacing.s3 },
  judul: { ...teks.h3, color: color.textBody },
  daftar: { gap: spacing.s2 },
  butir: { flexDirection: 'row', gap: spacing.s2 },
  butirTeks: { ...teks.caption, color: color.ink700 },
  flex: { flex: 1 },
  galat: { ...teks.caption, color: color.blue600 },
  aksi: { gap: spacing.s2, marginTop: spacing.s2 },
});
