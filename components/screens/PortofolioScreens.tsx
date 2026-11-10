import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ButirBukti } from '../../api/types';
import { useDaftarButir, useHapusButir, useSimpanButir } from '../../hooks/usePortofolio';
import { formatTanggal } from '../../lib/linimasa';
import {
  BATAS_ISIAN,
  JENIS_BUTIR,
  TEKS_PORTOFOLIO as T,
  badanButir,
  galatMedanServer,
  hitungFotoAkun,
  keadaanDaftar,
  labelJenisButir,
  periksaIsianButir,
  pesanGalatPortofolio,
  tautanSah,
  type GalatIsian,
  type JenisButir,
  type KeadaanDaftar,
} from '../../lib/portofolio';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, Kepala, Kosong, Lencana, Memuat, Peringatan, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';
import { BagianFoto, FotoTerlindung } from './PortofolioFoto';

/**
 * Portofolio (LANJUT_011 seri v2): daftar, tulis atau ubah, dan detail butir. Semua privat (K18),
 * jadi tidak ada tombol atau teks berbagi. Teks DRAF, lihat docs/draf-teks-portofolio.md.
 *
 * Detail dan formulir membaca dari daftar, seperti Arsip Belajar: id milik akun lain tampil
 * sebagai "tidak ditemukan", dan 404 saklar server cukup dikenali di satu tempat.
 */
function useKeadaanDaftar() {
  const daftar = useDaftarButir();
  const keadaan = keadaanDaftar({ isPending: daftar.isPending, galat: daftar.error, jumlah: daftar.data?.length });
  return { daftar, keadaan, siap: keadaan === 'ada' || keadaan === 'kosong' };
}

function KeadaanPortofolio({ keadaan, onCoba }: { keadaan: KeadaanDaftar; onCoba: () => void }) {
  const router = useRouter();
  let isi: React.ReactNode = <Memuat />;
  if (keadaan === 'fitur_mati') isi = <Kosong judul={T.fiturMatiJudul} teks={T.fiturMatiTeks} />;
  if (keadaan === 'perlu_kebijakan') {
    isi = (
      <Kosong
        judul={T.perluKebijakanJudul}
        teks={T.perluKebijakanTeks}
        aksi={<Tombol label={T.bacaKebijakan} varian="sekunder" onPress={() => router.push('/terima-kebijakan')} />}
      />
    );
  }
  if (keadaan === 'jaringan' || keadaan === 'server') {
    isi = (
      <>
        <Peringatan>{keadaan === 'jaringan' ? T.jaringan : T.server}</Peringatan>
        <Tombol label={T.cobaLagi} varian="sekunder" penuh onPress={onCoba} />
      </>
    );
  }
  return <View style={gaya.layarIsiRapat}>{isi}</View>;
}

function TidakDitemukan() {
  const router = useRouter();
  return (
    <View style={gaya.layarIsiRapat}>
      <Kosong
        judul={T.tidakDitemukanJudul}
        teks={T.tidakDitemukanTeks}
        aksi={<Tombol label={T.kembali} varian="sekunder" onPress={() => router.replace('/portofolio')} />}
      />
    </View>
  );
}

const tanggalButir = (b: ButirBukti) => formatTanggal(b.tanggal_karya ?? b.dibuat_pada);

export function PortofolioDaftarScreen() {
  const router = useRouter();
  const { daftar, keadaan, siap } = useKeadaanDaftar();
  if (!siap) return <KeadaanPortofolio keadaan={keadaan} onCoba={() => daftar.refetch()} />;

  const tulis = () => router.push('/portofolio-tulis');
  if (keadaan === 'kosong') {
    return (
      <View style={gaya.layarIsiRapat}>
        <Kosong judul={T.kosongJudul} teks={T.kosongTeks} aksi={<Tombol label={T.tambah} besar onPress={tulis} />} />
      </View>
    );
  }

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.judul} pengantar={T.pengantar} />
      <Tombol label={T.tambah} besar penuh onPress={tulis} />
      <View style={s.daftar}>
        {daftar.data!.map((b) => (
          <BarisButir key={b.id} butir={b} onPress={() => router.push({ pathname: '/portofolio-butir', params: { id: b.id } })} />
        ))}
      </View>
    </View>
  );
}

function BarisButir({ butir, onPress }: { butir: ButirBukti; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => (pressed ? s.ditekan : undefined)}>
      <Kartu style={s.baris}>
        {butir.foto[0] ? <FotoTerlindung butirId={butir.id} fotoId={butir.foto[0].id} gambar={s.gambarKecil} kecil /> : null}
        <View style={s.barisIsi}>
          <Text style={s.barisJudul} numberOfLines={2}>
            {butir.judul}
          </Text>
          <Text style={s.barisKet}>{`${labelJenisButir(butir.jenis)} · ${tanggalButir(butir)}`}</Text>
        </View>
        <Ikon nama="panah" ukuran={18} warna={color.ink500} />
      </Kartu>
    </Pressable>
  );
}

export function PortofolioTulisScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { daftar, keadaan, siap } = useKeadaanDaftar();
  if (!siap) return <KeadaanPortofolio keadaan={keadaan} onCoba={() => daftar.refetch()} />;
  if (!id) return <FormButir />;
  const butir = daftar.data!.find((b) => b.id === id);
  return butir ? <FormButir key={butir.id} awal={butir} /> : <TidakDitemukan />;
}

/** Satu layar, satu tombol Simpan. Jenis sudah terpilih supaya tidak menambah ketukan. */
function FormButir({ awal }: { awal?: ButirBukti }) {
  const router = useRouter();
  const simpan = useSimpanButir();
  const [judul, setJudul] = useState(awal?.judul ?? '');
  const [jenis, setJenis] = useState<JenisButir>((awal?.jenis as JenisButir) ?? 'karya');
  const [uraian, setUraian] = useState(awal?.uraian ?? '');
  const [tautan, setTautan] = useState(awal?.tautan ?? '');
  const [tanggal, setTanggal] = useState(awal?.tanggal_karya ?? '');
  const [galat, setGalat] = useState<GalatIsian>({});

  const kirim = () => {
    const isian = { judul, jenis, uraian, tautan, tanggal };
    const periksa = periksaIsianButir(isian);
    setGalat(periksa);
    if (Object.keys(periksa).length) return;
    simpan.mutate(
      { id: awal?.id, badan: badanButir(isian) },
      {
        onSuccess: (butir) => {
          if (awal && router.canGoBack()) router.back();
          else router.replace({ pathname: '/portofolio-butir', params: { id: butir.id } });
        },
        onError: (err) => setGalat(galatMedanServer(err.medan)),
      }
    );
  };

  const adaGalatMedan = Object.keys(galat).length > 0;

  return (
    <View style={gaya.layarIsiRapat}>
      <Field label={T.labelJudul} galat={galat.judul}>
        <Input value={judul} onChangeText={setJudul} maxLength={BATAS_ISIAN.judul} autoCapitalize="sentences" autoFocus={!awal} />
      </Field>
      <Field label={T.labelJenis} galat={galat.jenis}>
        <DaftarOpsi>
          {JENIS_BUTIR.map((j) => (
            <OpsiPil key={j.id} label={j.label} aktif={jenis === j.id} onPress={() => setJenis(j.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label={T.labelUraian} labelTambahan={T.labelOpsional} galat={galat.uraian}>
        <Input value={uraian} onChangeText={setUraian} maxLength={BATAS_ISIAN.uraian} multiline autoCapitalize="sentences" style={s.uraian} />
      </Field>
      <Field label={T.labelTautan} labelTambahan={T.labelOpsional} hint={T.petunjukTautan} galat={galat.tautan}>
        <Input value={tautan} onChangeText={setTautan} maxLength={BATAS_ISIAN.tautan} keyboardType="url" />
      </Field>
      <Field label={T.labelTanggal} labelTambahan={T.labelOpsional} hint={T.petunjukTanggal} galat={galat.tanggal_karya}>
        <Input value={tanggal} onChangeText={setTanggal} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      {simpan.isError && !adaGalatMedan ? <PesanGalat teks={pesanGalatPortofolio(simpan.error.kode, simpan.error.status)} /> : null}
      <Tombol label={simpan.isPending ? T.menyimpan : T.simpan} besar penuh proses={simpan.isPending} onPress={kirim} />
    </View>
  );
}

export function PortofolioDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { daftar, keadaan, siap } = useKeadaanDaftar();
  const hapus = useHapusButir();
  const [yakin, setYakin] = useState(false);

  if (!siap) return <KeadaanPortofolio keadaan={keadaan} onCoba={() => daftar.refetch()} />;
  const butir = daftar.data!.find((b) => b.id === id);
  if (!butir) return <TidakDitemukan />;

  return (
    <View style={gaya.layarIsiRapat}>
      <View style={s.lencana}>
        <Lencana varian="neutral">{labelJenisButir(butir.jenis)}</Lencana>
        <Lencana varian="neutral">{tanggalButir(butir)}</Lencana>
      </View>
      <Text style={s.judul} role="heading">
        {butir.judul}
      </Text>
      {butir.uraian ? <Text style={gaya.teksBody}>{butir.uraian}</Text> : null}
      {butir.tautan && tautanSah(butir.tautan) ? (
        <Text style={gaya.tautan} accessibilityRole="link" onPress={() => Linking.openURL(butir.tautan!)}>
          {butir.tautan}
        </Text>
      ) : null}

      <BagianFoto butir={butir} jumlahAkun={hitungFotoAkun(daftar.data!)} />

      <Tombol label={T.ubah} varian="garis" besar penuh onPress={() => router.push({ pathname: '/portofolio-tulis', params: { id: butir.id } })} />
      {yakin ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <Text style={gaya.teksBody}>{T.yakinHapus}</Text>
          {hapus.isError ? <PesanGalat teks={T.hapusGagal} /> : null}
          <View style={s.aksi}>
            <Tombol label={T.batal} varian="hantu" onPress={() => setYakin(false)} />
            <Tombol label={T.yaHapus} proses={hapus.isPending} onPress={() => hapus.mutate(butir, { onSuccess: () => router.replace('/portofolio') })} />
          </View>
        </Kartu>
      ) : (
        <Tombol label={T.hapus} varian="hantu" onPress={() => setYakin(true)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s3 },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, padding: spacing.s3 },
  barisIsi: { flex: 1, minWidth: 0 },
  barisJudul: { ...teks.title, fontFamily: font.semibold, color: color.textBody },
  barisKet: { ...teks.caption, color: color.textMuted, marginTop: 2 },
  gambarKecil: { width: 56, height: 56, borderRadius: radius.md },
  ditekan: { opacity: 0.85 },
  uraian: { minHeight: 112, textAlignVertical: 'top' },
  lencana: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  judul: { ...teks.h2, color: color.textBody },
  konfirmasi: { gap: spacing.s3 },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.s2 },
});
