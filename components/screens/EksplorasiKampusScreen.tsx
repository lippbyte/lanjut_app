import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useProdi } from '../../hooks/useProdi';
import { useUbahProfil } from '../../hooks/useUbahProfil';
import {
  BAGIAN_EKSPLORASI,
  JALUR_MASUK,
  MAKS_MINAT,
  TEKS_EKSPLORASI,
  bolehSimpan,
  daftarRumpun,
  penjelasanBidang,
  samaPilihan,
  ubahPilihan,
  versiEksplorasi,
  type BagianEksplorasi,
} from '../../lib/eksplorasiKampus';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, Lencana, Memuat, SeksiJudul, Tombol, gaya } from '../ui';
import { EksplorasiTujuanScreen, PENJELAS_PERKIRAAN } from './EksplorasiTujuanScreen';

/**
 * Eksplorasi Kampus untuk semua jenjang (LANJUT_075), rute /eksplorasi-tujuan.
 * SMP dan kelas 10–11 mendapat layar minat (lib/eksplorasiKampus.ts); kelas 12
 * dan akun tanpa kelas tetap layar F10 yang sudah ada, tidak diubah.
 */
export function EksplorasiKampusScreen() {
  const { pengguna } = useSesi();
  const versi = versiEksplorasi(pengguna?.kelas);
  if (versi === 'f10') return <EksplorasiTujuanScreen />;
  return <LayarMinat versi={versi} />;
}

type VersiMinat = Exclude<ReturnType<typeof versiEksplorasi>, 'f10'>;

/**
 * Pilih bidang minat (rumpun) dan simpan ke akun (minat_rumpun). Tanpa daftar
 * prodi, tanpa tanggal; SMP juga tanpa jalur masuk (BAGIAN_EKSPLORASI). Isi yang
 * belum dicek ke sumber resmi berlabel "Perkiraan".
 */
function LayarMinat({ versi }: { versi: VersiMinat }) {
  const router = useRouter();
  const { pengguna } = useSesi();
  const prodiQuery = useProdi();
  const simpan = useUbahProfil();
  const tersimpan = pengguna?.minat_rumpun ?? [];
  const [pilihan, setPilihan] = useState<string[]>(tersimpan);
  const maks = MAKS_MINAT[versi];
  const teksVersi = TEKS_EKSPLORASI[versi];
  const rumpun = daftarRumpun(prodiQuery.data);

  // Server menolak menyimpan bila kebijakan privasi versi berlaku belum diterima (LANJUT_075).
  const perluKebijakan = simpan.error instanceof ApiError && simpan.error.kode === 'AI_BELUM_DIIZINKAN';
  const sudahTersimpan = tersimpan.length > 0 && samaPilihan(pilihan, tersimpan);

  const bagian: Record<BagianEksplorasi, React.ReactNode> = {
    pengantar: <Text style={gaya.teksBody}>{teksVersi.pengantar}</Text>,
    jalur: (
      <View style={s.seksi}>
        <KepalaSeksi judul={TEKS_EKSPLORASI.kelas10_11.judulJalur} />
        {JALUR_MASUK.map((j) => (
          <Kartu key={j.nama} style={s.kartuRapat}>
            <Text style={s.nama}>{j.nama}</Text>
            <Text style={s.teks}>{j.penjelasan}</Text>
          </Kartu>
        ))}
      </View>
    ),
    bidang: (
      <View style={s.seksi}>
        <KepalaSeksi judul={TEKS_EKSPLORASI.judulBidang} />
        <Text style={s.petunjuk}>{TEKS_EKSPLORASI.petunjuk(maks)}</Text>
        {prodiQuery.isPending ? (
          <Memuat />
        ) : rumpun.length ? (
          <View style={s.tumpuk} role="group" aria-label={TEKS_EKSPLORASI.judulBidang}>
            {rumpun.map((r) => (
              <KartuBidang
                key={r}
                rumpun={r}
                aktif={pilihan.includes(r)}
                penuh={!pilihan.includes(r) && pilihan.length >= maks}
                onPress={() => setPilihan((p) => ubahPilihan(p, r, maks))}
              />
            ))}
          </View>
        ) : (
          <Text style={gaya.teksKecil}>{TEKS_EKSPLORASI.kosong}</Text>
        )}
      </View>
    ),
    simpan: (
      <View style={s.simpan}>
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
        {bolehSimpan(pilihan, tersimpan, maks) ? (
          <Tombol
            label={teksVersi.tombol}
            besar
            penuh
            proses={simpan.isPending}
            onPress={() => simpan.mutate({ minat_rumpun: pilihan })}
          />
        ) : sudahTersimpan ? (
          <Text style={s.tersimpan}>{TEKS_EKSPLORASI.tersimpan}</Text>
        ) : null}
      </View>
    ),
    prodi_nanti: <Text style={gaya.teksKecil}>{TEKS_EKSPLORASI.kelas10_11.prodiNanti}</Text>,
    penutup: <Text style={s.penutup}>{TEKS_EKSPLORASI.smp.penutup}</Text>,
  };

  return (
    <View style={gaya.layarIsiRapat}>
      {BAGIAN_EKSPLORASI[versi].map((b) => (
        <React.Fragment key={b}>{bagian[b]}</React.Fragment>
      ))}
    </View>
  );
}

/** Judul seksi + lencana "Perkiraan" (isinya belum dicek ke sumber resmi, aturan 044). */
function KepalaSeksi({ judul }: { judul: string }) {
  return (
    <>
      <View style={s.seksiKepala}>
        <SeksiJudul>{judul}</SeksiJudul>
        <Lencana varian="neutral">Perkiraan</Lencana>
      </View>
      <Text style={gaya.teksKecil}>{PENJELAS_PERKIRAAN}</Text>
    </>
  );
}

/**
 * Satu bidang yang bisa dicentang. Bidang tanpa penjelasan (rumpun baru di data)
 * tampil sebagai nama saja. `penuh`: batas jenjang tercapai — ketukan tidak
 * menambah apa pun (ubahPilihan) sampai salah satu dilepas; kartunya tidak
 * diredupkan supaya penjelasannya tetap terbaca.
 */
function KartuBidang({
  rumpun,
  aktif,
  penuh,
  onPress,
}: {
  rumpun: string;
  aktif: boolean;
  penuh: boolean;
  onPress: () => void;
}) {
  const p = penjelasanBidang(rumpun);
  return (
    <Pressable
      onPress={onPress}
      role="checkbox"
      aria-checked={aktif}
      aria-disabled={penuh}
      aria-label={rumpun}
      style={({ pressed }) => (pressed && !penuh ? s.ditekan : undefined)}
    >
      <Kartu varian={aktif ? 'outline' : 'biasa'} style={StyleSheet.flatten([s.kartuRapat, aktif && s.aktif])}>
        <View style={s.bidangKepala}>
          <Text style={s.nama}>{rumpun}</Text>
          <View style={StyleSheet.flatten([s.centang, aktif && s.centangAktif])}>
            {aktif ? <Ikon nama="centang" ukuran={16} warna={color.white} /> : null}
          </View>
        </View>
        {p ? (
          <>
            <Text style={s.teks}>{p.belajar}</Text>
            <Text style={s.teks}>{p.pekerjaan}</Text>
          </>
        ) : null}
      </Kartu>
    </Pressable>
  );
}

const s = StyleSheet.create({
  seksi: { gap: spacing.s3 },
  seksiKepala: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s3 },
  petunjuk: { ...teks.caption, color: color.textMuted },
  tumpuk: { gap: spacing.s2 },
  kartuRapat: { padding: spacing.s4, borderRadius: radius.md, gap: spacing.s1 },
  aktif: { borderWidth: 2, borderColor: color.blue600 },
  bidangKepala: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s3 },
  nama: { ...teks.body, fontFamily: font.semibold, color: color.textBody, flex: 1 },
  teks: { ...teks.bodySm, color: color.textMuted },
  centang: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: color.ink300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centangAktif: { backgroundColor: color.blue600, borderColor: color.blue600 },
  simpan: { gap: spacing.s2 },
  tersimpan: { ...teks.bodySm, fontFamily: font.medium, color: color.statusOkFg, textAlign: 'center' },
  penutup: { ...teks.body, color: color.textBody, textAlign: 'center' },
  ditekan: { opacity: 0.85 },
});
