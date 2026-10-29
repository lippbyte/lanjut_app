import React from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import { TEKS_EKSPLORASI } from '../../lib/eksplorasiKampus';
import { KESIAPAN_UJIAN, TEKS_KESIAPAN, saranKesiapan, type RingkasanUjian } from '../../lib/kesiapanUjian';
import { useSesi } from '../../providers/AuthProvider';
import { color, spacing, teks } from '../../theme/tokens';
import { Kartu, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, OpsiPil } from './auth/AuthUI';

/**
 * Seksi Kesiapan Ujian (layar Jalur Saya /cek-posisi, kelas 12; lib/kesiapanUjian.ts). Satu ketukan langsung
 * menyimpan ke akun (`kesiapan_ujian`). Pilihan yang tampil aktif selalu yang sudah
 * tersimpan (tanpa pembaruan optimistis, sama dengan useUbahProfil). Teks tersimpan,
 * gagal, dan perlu kebijakan memakai kalimat §4.9 (LANJUT_075) yang sudah ada.
 */
export function SeksiKesiapanUjian({ ujian }: { ujian: RingkasanUjian }) {
  const router = useRouter();
  const { pengguna } = useSesi();
  const simpan = useUbahProfil();
  const tersimpan = pengguna?.kesiapan_ujian ?? null;
  const saran = saranKesiapan(tersimpan, ujian);
  const perluKebijakan = simpan.error instanceof ApiError && simpan.error.kode === 'AI_BELUM_DIIZINKAN';

  return (
    <View style={s.seksi}>
      <SeksiJudul>{TEKS_KESIAPAN.judul}</SeksiJudul>
      <Text style={gaya.teksBody}>{TEKS_KESIAPAN.pertanyaan}</Text>
      <Text style={s.petunjuk}>{TEKS_KESIAPAN.petunjuk}</Text>
      <DaftarOpsi>
        {KESIAPAN_UJIAN.map((k) => (
          <OpsiPil
            key={k.id}
            label={k.label}
            aktif={tersimpan === k.id}
            onPress={() => {
              if (!simpan.isPending && tersimpan !== k.id) simpan.mutate({ kesiapan_ujian: k.id });
            }}
          />
        ))}
      </DaftarOpsi>
      {simpan.isPending ? (
        <Text style={s.status}>{TEKS_KESIAPAN.menyimpan}</Text>
      ) : perluKebijakan ? (
        <Text style={gaya.teksKecil}>
          {TEKS_EKSPLORASI.perluKebijakan}{' '}
          <Text style={gaya.tautan} onPress={() => router.push('/terima-kebijakan')} accessibilityRole="link">
            {TEKS_EKSPLORASI.tautanKebijakan}
          </Text>
        </Text>
      ) : simpan.isError ? (
        <Text style={gaya.teksKecil}>{TEKS_EKSPLORASI.gagal}</Text>
      ) : simpan.isSuccess ? (
        <Text style={s.status}>{TEKS_EKSPLORASI.tersimpan}</Text>
      ) : null}

      {saran || ujian.total ? (
        <Kartu style={s.saran}>
          {ujian.total ? <Text style={s.status}>{TEKS_KESIAPAN.langkahUjian(ujian.selesai, ujian.total)}</Text> : null}
          {saran ? <Text style={s.saranTeks}>{saran.teks}</Text> : null}
          {saran?.langkah ? (
            <Tombol label={saran.langkah.label} varian="sekunder" kecil onPress={() => router.push(saran.langkah!.tujuan)} />
          ) : null}
        </Kartu>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  seksi: { gap: spacing.s3 },
  petunjuk: { ...teks.caption, color: color.textMuted },
  status: { ...teks.caption, color: color.textMuted },
  saran: { gap: spacing.s3 },
  saranTeks: { ...teks.bodySm, color: color.ink700 },
});
