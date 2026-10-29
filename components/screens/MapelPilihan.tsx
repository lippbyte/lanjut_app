import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import type { MapelRingkas, PilihanMapel } from '../../api/types';
import { usePilihanMapel } from '../../hooks/usePilihanMapel';
import { useProdi } from '../../hooks/useProdi';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import { TEKS_EKSPLORASI, bolehSimpan, daftarRumpun, samaPilihan, ubahPilihan } from '../../lib/eksplorasiKampus';
import {
  MAKS_RUMPUN_KELAS12,
  TEKS_MAPEL_PILIHAN,
  bolehSimpanRumpun,
  kelompokDenganCatatan,
  rumpunPerluDikurangi,
  ubahPilihanMapel,
} from '../../lib/mapelPilihan';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { KeadaanGalat, Memuat, SeksiJudul, Tombol, gaya } from '../ui';

const T = TEKS_MAPEL_PILIHAN;

/**
 * LANJUT_079 — Pilih Mapel per rumpun favorit (kelas 12) atau Mapel Saya (kelas
 * 7–11), di tab Pilih Mapel. Isi dari server (GET /pengguna/saya/pilihan-mapel):
 * kelas 12 hanya melihat kelompok rumpun favoritnya — atau ajakan memilih rumpun
 * dulu — tidak pernah daftar semua mapel. `denganJudul`: false bila judul layar
 * sudah "Mapel Saya" (kelas 7–9).
 */
export function SeksiPilihanMapel({ denganJudul }: { denganJudul: boolean }) {
  const q = usePilihanMapel();
  if (q.isPending) return <Memuat />;
  if (q.isError) return <KeadaanGalat />;
  const d = q.data;
  // Dipasang ulang sesudah tersimpan atau rumpun berubah, supaya centang = yang tersimpan.
  const kunci = `${d.mode}|${d.mapel_pilihan.join(',')}|${d.mode === 'rumpun' ? d.kelompok.map((k) => k.rumpun).join(',') : ''}`;
  return <IsiPilihan key={kunci} data={d} denganJudul={denganJudul} />;
}

function IsiPilihan({ data, denganJudul }: { data: PilihanMapel; denganJudul: boolean }) {
  const simpan = useUbahProfil();
  const [pilihan, setPilihan] = useState<string[]>(data.mapel_pilihan);
  // Pilihan rumpun dibuka di tempat; tertutup lagi sesudah rumpun tersimpan (komponen dipasang ulang).
  const [ubahRumpun, setUbahRumpun] = useState(false);
  const maks = data.maks_mapel;
  // LANJUT_079b: akun lama dengan lebih dari 3 rumpun → pilihan rumpun langsung terbuka di atas.
  const perluKurangi = data.mode === 'rumpun' && rumpunPerluDikurangi(data.minat_rumpun, data.maks_rumpun);

  if (data.mode === 'rumpun' && data.kelompok.length === 0) {
    return (
      <View style={s.bingkai}>
        {denganJudul ? <SeksiJudul>{T.kelas12.judul}</SeksiJudul> : null}
        <Text style={s.judulAjakan}>{T.kelas12.ajakanJudul}</Text>
        <Text style={gaya.teksBody}>{T.kelas12.ajakanTeks}</Text>
        {/* Teks ajakan sudah memuat petunjuk yang sama; tidak diulang. */}
        <PilihRumpunFavorit denganPetunjuk={false} />
      </View>
    );
  }

  const chip = (m: MapelRingkas, kunci: string) => (
    <ChipCentang
      key={kunci}
      label={m.nama}
      aktif={pilihan.includes(m.id)}
      onPress={() => setPilihan((p) => ubahPilihanMapel(p, m.id, maks))}
    />
  );

  return (
    <View style={s.bingkai}>
      {denganJudul ? <SeksiJudul>{data.mode === 'rumpun' ? T.kelas12.judul : T.mapelSaya.judul}</SeksiJudul> : null}
      {denganJudul || data.mode === 'rumpun' ? (
        <Text style={gaya.teksBody}>{data.mode === 'rumpun' ? T.kelas12.pengantar : T.mapelSaya.pengantar}</Text>
      ) : null}
      {perluKurangi ? <PilihRumpunFavorit /> : null}
      {data.mode === 'rumpun' ? (
        <>
          {/* LANJUT_079b: catatan di SETIAP kelompok (kelompokDenganCatatan), bukan sekali di atas. */}
          {kelompokDenganCatatan(data.kelompok, data.pengelompokan_terverifikasi).map((k) => (
            <View key={k.rumpun} style={s.kelompok} role="group" aria-label={k.rumpun}>
              <Text style={s.namaKelompok}>{k.rumpun}</Text>
              {k.catatan ? <Text style={s.catatan}>{k.catatan}</Text> : null}
              <View style={s.chipBaris}>{k.mapel.map((m) => chip(m, `${k.rumpun}|${m.id}`))}</View>
            </View>
          ))}
        </>
      ) : (
        <View style={s.chipBaris} role="group" aria-label={T.mapelSaya.judul}>
          {data.mapel.map((m) => chip(m, m.id))}
        </View>
      )}
      <Text style={s.hitung}>{T.hitung(pilihan.length, maks)}</Text>
      {pilihan.length >= maks ? <Text style={gaya.teksKecil}>{T.penuh(maks)}</Text> : null}
      {simpan.isError ? <Text style={gaya.teksKecil}>{TEKS_EKSPLORASI.gagal}</Text> : null}
      {bolehSimpan(pilihan, data.mapel_pilihan, maks) ? (
        <Tombol label={T.tombol} besar penuh proses={simpan.isPending} onPress={() => simpan.mutate({ mapel_pilihan: pilihan })} />
      ) : data.mapel_pilihan.length > 0 && samaPilihan(pilihan, data.mapel_pilihan) ? (
        <Text style={s.tersimpan}>{TEKS_EKSPLORASI.tersimpan}</Text>
      ) : null}
      {data.mode === 'rumpun' && !perluKurangi ? (
        ubahRumpun ? (
          <PilihRumpunFavorit />
        ) : (
          <Tombol label={T.kelas12.ubahRumpun} varian="hantu" kecil onPress={() => setUbahRumpun(true)} />
        )
      ) : null}
    </View>
  );
}

/**
 * Pilih 1–3 rumpun favorit (kelas 12), disimpan ke minat_rumpun yang sudah ada.
 * Dipakai di layar /cek-posisi (Jalur Saya) dan di Pilih Mapel. Hanya nama rumpun (dari data
 * prodi), tanpa nama prodi. Server tetap menolak bila kebijakan belum diterima.
 */
export function PilihRumpunFavorit({ denganPetunjuk = true }: { denganPetunjuk?: boolean }) {
  const router = useRouter();
  const { pengguna } = useSesi();
  const prodiQuery = useProdi();
  const simpan = useUbahProfil();
  const tersimpan = pengguna?.minat_rumpun ?? [];
  const [pilihan, setPilihan] = useState<string[]>(tersimpan);
  const rumpun = daftarRumpun(prodiQuery.data);
  const maks = MAKS_RUMPUN_KELAS12;
  const perluKebijakan = simpan.error instanceof ApiError && simpan.error.kode === 'AI_BELUM_DIIZINKAN';
  // Satu sampai tiga; akun lama dengan 4 rumpun: tombol muncul begitu pilihan dikurangi (LANJUT_079b).
  const boleh = bolehSimpanRumpun(pilihan, tersimpan, maks);

  if (prodiQuery.isPending) return <Memuat />;
  if (prodiQuery.isError) return <KeadaanGalat />;
  return (
    <View style={s.tumpuk}>
      {denganPetunjuk ? <Text style={s.petunjuk}>{T.rumpun.petunjuk}</Text> : null}
      <View style={s.chipBaris} role="group" aria-label={T.rumpun.judul}>
        {rumpun.map((r) => (
          <ChipCentang key={r} label={r} aktif={pilihan.includes(r)} onPress={() => setPilihan((p) => ubahPilihan(p, r, maks))} />
        ))}
      </View>
      {pilihan.length > maks ? (
        <Text style={gaya.teksKecil}>{T.lebih(pilihan.length, maks)}</Text>
      ) : pilihan.length === maks ? (
        <Text style={gaya.teksKecil}>{T.penuh(maks)}</Text>
      ) : null}
      {perluKebijakan ? (
        <Text style={gaya.teksKecil}>
          {TEKS_EKSPLORASI.perluKebijakan}{' '}
          <Text style={gaya.tautan} onPress={() => router.push('/terima-kebijakan')} accessibilityRole="link">
            {TEKS_EKSPLORASI.tautanKebijakan}
          </Text>
        </Text>
      ) : simpan.isError ? (
        <Text style={gaya.teksKecil}>{TEKS_EKSPLORASI.gagal}</Text>
      ) : null}
      {boleh ? (
        <Tombol label={T.rumpun.tombol} besar penuh proses={simpan.isPending} onPress={() => simpan.mutate({ minat_rumpun: pilihan })} />
      ) : tersimpan.length > 0 && tersimpan.length <= maks && samaPilihan(pilihan, tersimpan) ? (
        <Text style={s.tersimpan}>{TEKS_EKSPLORASI.tersimpan}</Text>
      ) : null}
    </View>
  );
}

/** Pil yang bisa dicentang (bisa lebih dari satu), bukan radio. */
function ChipCentang({ label, aktif, onPress }: { label: string; aktif: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      role="checkbox"
      aria-checked={aktif}
      aria-label={label}
      style={StyleSheet.flatten([s.chip, aktif && s.chipAktif])}
    >
      <Text style={StyleSheet.flatten([s.chipTeks, aktif && s.chipTeksAktif])}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bingkai: {
    gap: spacing.s3,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  tumpuk: { gap: spacing.s3 },
  judulAjakan: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  petunjuk: { ...teks.caption, color: color.textMuted },
  kelompok: { gap: spacing.s2 },
  namaKelompok: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  catatan: { ...teks.caption, color: color.textMuted, marginTop: -spacing.s1 },
  chipBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  chip: {
    maxWidth: '100%',
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  chipAktif: { backgroundColor: color.blue600, borderColor: color.blue600 },
  chipTeks: { ...teks.bodySm, color: color.ink700 },
  chipTeksAktif: { color: color.white, fontFamily: font.semibold },
  hitung: { ...teks.caption, color: color.textMuted },
  tersimpan: { ...teks.bodySm, fontFamily: font.medium, color: color.statusOkFg, textAlign: 'center' },
});
