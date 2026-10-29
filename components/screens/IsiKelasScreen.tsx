import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { pesanUntuk } from '../../api/auth';
import { useProfilLokal } from '../../hooks/useProfilLokal';
import { useSaringDaftarPeriksa } from '../../hooks/useProgresDaftarPeriksa';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import { JENIS_SEKOLAH_MENENGAH, KELAS_OPSI, LABEL_JENIS_SEKOLAH, type JenisSekolahMenengah, type Kelas } from '../../lib/jenjang';
import { useSesi } from '../../providers/AuthProvider';
import { spacing } from '../../theme/tokens';
import { Tombol } from '../ui';
import { AuthLayout, DaftarOpsi, Field, Keterangan, OpsiPil, PesanGalat, TombolUtama, authStyles } from './auth/AuthUI';

const adalahKelas = (k: string | null | undefined): k is Kelas => !!k && (KELAS_OPSI as readonly string[]).includes(k);

/**
 * Gerbang wajib isi kelas (LANJUT_036) — dirender oleh app/(app)/_layout.tsx
 * menggantikan seluruh app selama kelas AKUN kosong (akun lama dari sebelum
 * form Daftar menanyakan kelas). Tidak ada tab bar, jadi tidak ada jalan ke
 * layar lain selain menyimpan kelas, membuka Data Akun, atau keluar.
 *
 * Kelas yang dulu dipilih di Daftar Periksa (tersimpan di perangkat) hanya
 * jadi usulan terpilih — siswa tetap harus menekan Simpan sendiri.
 *
 * TEKS DRAF, belum disetujui Khalifa (salinan §4.12).
 */
export function IsiKelasScreen() {
  const router = useRouter();
  const simpan = useUbahProfil();
  const { pilih: setSaringan } = useSaringDaftarPeriksa();
  const profilLokal = useProfilLokal();
  const [pilihan, setPilihan] = useState<Kelas | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const usulan = adalahKelas(profilLokal.data?.kelas) ? profilLokal.data.kelas : null;
  const kelas = pilihan ?? usulan;

  const kirim = () => {
    if (!kelas) return setGalat('Pilih kelasmu.');
    setGalat(null);
    simpan.mutate(
      { kelas },
      {
        // Pengguna di AuthProvider sudah berkelas → layout melepas gerbang ini
        // (kelas 10–12 lanjut ke gerbang jenis sekolah, LANJUT_038). Kelas di
        // perangkat ikut diganti, sama seperti simpan di Data Akun.
        onSuccess: () => {
          setSaringan({ kelas });
          router.replace('/linimasa');
        },
      }
    );
  };

  return (
    <AuthLayout
      judul="Kamu kelas berapa sekarang?"
      pengantar="Isi sekali ini saja supaya LANJUT menampilkan yang sesuai buat kamu. Nanti bisa diubah di Data Akun."
    >
      <View style={authStyles.form}>
        <Field label="Kelas" hint="SMP kelas 7–9, SMA/SMK kelas 10–12." galat={galat ?? undefined}>
          <DaftarOpsi>
            {KELAS_OPSI.map((k) => (
              <OpsiPil
                key={k}
                label={`Kelas ${k}`}
                aktif={kelas === k}
                onPress={() => {
                  setPilihan(k);
                  setGalat(null);
                }}
              />
            ))}
          </DaftarOpsi>
        </Field>
        {usulan && !pilihan ? (
          <Keterangan>Terpilih dari pilihanmu sebelumnya di Daftar Periksa. Cek lagi sebelum menyimpan.</Keterangan>
        ) : null}
        <PesanGalat teks={simpan.isError ? pesanUntuk(simpan.error) : null} />
        <TombolUtama label="Simpan dan lanjut" labelProses="Menyimpan…" proses={simpan.isPending} onPress={kirim} />
        <KakiGerbang />
      </View>
    </AuthLayout>
  );
}

/**
 * Langkah 2 gerbang (LANJUT_038): kelas 10–12 yang belum memilih SMA, SMK,
 * atau MA. Muncul SESUDAH gerbang kelas, tidak pernah satu layar dengannya;
 * kelas 7–9 tidak pernah sampai ke sini (server mengisi SMP).
 *
 * TEKS DRAF, belum disetujui Khalifa (salinan §4.12).
 */
export function IsiJenisSekolahScreen() {
  const router = useRouter();
  const { pengguna } = useSesi();
  const simpan = useUbahProfil();
  const [jenis, setJenis] = useState<JenisSekolahMenengah | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const kirim = () => {
    if (!jenis) return setGalat('Pilih jenis sekolahmu.');
    setGalat(null);
    simpan.mutate({ jenis_sekolah: jenis }, { onSuccess: () => router.replace('/linimasa') });
  };

  return (
    <AuthLayout
      judul="Kamu sekolah di mana?"
      pengantar={`Kelas ${pengguna?.kelas ?? ''}: pilih jenis sekolahmu supaya isi LANJUT pas buat kamu. Nanti bisa diubah di Data Akun.`}
    >
      <View style={authStyles.form}>
        <Field label="Jenis sekolah" galat={galat ?? undefined}>
          <DaftarOpsi>
            {JENIS_SEKOLAH_MENENGAH.map((j) => (
              <OpsiPil
                key={j}
                label={LABEL_JENIS_SEKOLAH[j]}
                aktif={jenis === j}
                onPress={() => {
                  setJenis(j);
                  setGalat(null);
                }}
              />
            ))}
          </DaftarOpsi>
        </Field>
        <PesanGalat teks={simpan.isError ? pesanUntuk(simpan.error) : null} />
        <TombolUtama label="Simpan dan lanjut" labelProses="Menyimpan…" proses={simpan.isPending} onPress={kirim} />
        <KakiGerbang />
      </View>
    </AuthLayout>
  );
}

/** Satu-satunya jalan keluar gerbang selain menyimpan: Data Akun dan Keluar. */
function KakiGerbang() {
  const router = useRouter();
  const { keluar } = useSesi();
  const [mengeluarkan, setMengeluarkan] = useState(false);
  const onKeluar = async () => {
    setMengeluarkan(true);
    await keluar();
  };
  return (
    <View style={s.lain}>
      <Tombol label="Buka Data Akun" varian="hantu" onPress={() => router.push('/akun')} />
      <Tombol label={mengeluarkan ? 'Mengeluarkan…' : 'Keluar'} varian="garis" proses={mengeluarkan} onPress={onKeluar} />
    </View>
  );
}

const s = StyleSheet.create({
  lain: { gap: spacing.s2, alignItems: 'center' },
});
