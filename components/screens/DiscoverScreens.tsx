import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { KartuDiscover, Ketertarikan, ProfilEksplorasi, RefleksiDiscover } from '../../api/types';
import {
  useKartuDiscover,
  usePerbaruiProfil,
  useProfilEksplorasi,
  useRefleksiSaya,
  useRiwayatProfil,
  useSimpanRefleksi,
} from '../../hooks/useDiscover';
import {
  BATAS_DISCOVER,
  GALAT_ISIAN_DISCOVER,
  LABEL_JENIS_KARTU,
  PILIHAN_KETERTARIKAN,
  TEKS_DISCOVER as T,
  badanRefleksi,
  blokProfil,
  keadaanData,
  periksaIsianRefleksi,
  pesanGalatDiscover,
  teksDisembunyikan,
  teksVersi,
  type GalatIsianRefleksi,
  type KeadaanData,
} from '../../lib/discover';
import { color, font, spacing, teks } from '../../theme/tokens';
import { Kartu, Kepala, Kosong, Lencana, Memuat, Peringatan, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';

/**
 * Discover (LANJUT_024 seri v2). DRAF, belum disetujui: semua teks dari lib/discover.ts
 * (docs/draf-teks-discover.md). Isi kartu dari server, dan hanya kartu yang disetujui yang terkirim.
 * Profil hanya mengulang apa yang siswa tulis dan pilih; tidak ada AI dan tidak ada tebakan.
 */
function KeadaanLayar({ keadaan, onCoba }: { keadaan: KeadaanData; onCoba: () => void }) {
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

/** Daftar kartu menentukan keadaan: 404 di sana berarti saklar server mati. */
function useDataLayar() {
  const kartu = useKartuDiscover();
  const refleksi = useRefleksiSaya();
  const semua = [kartu, refleksi];
  const galat = semua.find((q) => q.error)?.error ?? null;
  const keadaan = keadaanData({ isPending: semua.some((q) => q.isPending), galat });
  return { kartu, refleksi, keadaan, cobaLagi: () => semua.forEach((q) => q.refetch()) };
}

export function DiscoverScreen() {
  const router = useRouter();
  const { kartu, refleksi, keadaan, cobaLagi } = useDataLayar();
  if (keadaan !== 'siap') return <KeadaanLayar keadaan={keadaan} onCoba={cobaLagi} />;
  const sudah = new Set(refleksi.data!.map((r) => r.kartu_discover_id));
  const keProfil = () => router.push('/discover-profil' as any);

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.judul} pengantar={T.pengantar} />
      <View style={s.baris}>
        <Lencana varian="neutral">{T.labelDraf}</Lencana>
      </View>
      <Tombol label={T.lihatProfil} varian="garis" besar penuh onPress={keProfil} />
      {kartu.data!.length === 0 ? (
        <Kosong judul={T.kosongJudul} teks={T.kosongTeks} />
      ) : (
        <View style={s.daftar}>
          {kartu.data!.map((k) => (
            <BarisKartu key={k.id} kartu={k} sudah={sudah.has(k.id)} onPress={() => router.push({ pathname: '/discover-refleksi' as any, params: { kartu: k.id } })} />
          ))}
        </View>
      )}
    </View>
  );
}

function BarisKartu({ kartu, sudah, onPress }: { kartu: KartuDiscover; sudah: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => (pressed ? s.ditekan : undefined)}>
      <Kartu style={s.kartu}>
        <View style={s.baris}>
          <Lencana varian="neutral">{LABEL_JENIS_KARTU[kartu.jenis]}</Lencana>
          {sudah ? <Lencana>{T.sudahDitulis}</Lencana> : null}
        </View>
        <Text style={s.judulKartu}>{kartu.judul}</Text>
        <Text style={gaya.teksBody}>{kartu.ringkasan}</Text>
        {kartu.url_sumber ? <Text style={s.keterangan}>{`${T.labelSumber}: ${kartu.url_sumber}`}</Text> : null}
        <Text style={s.tautan}>{sudah ? T.ubahRefleksi : T.tulisRefleksi}</Text>
      </Kartu>
    </Pressable>
  );
}

export function RefleksiScreen() {
  const { kartu: kartuId } = useLocalSearchParams<{ kartu?: string }>();
  const { kartu, refleksi, keadaan, cobaLagi } = useDataLayar();
  if (keadaan !== 'siap') return <KeadaanLayar keadaan={keadaan} onCoba={cobaLagi} />;
  const k = kartu.data!.find((x) => x.id === kartuId);
  if (!k) return <TidakDitemukan />;
  const awal = refleksi.data!.find((r) => r.kartu_discover_id === k.id);
  return <FormRefleksi key={k.id} kartu={k} awal={awal} />;
}

function TidakDitemukan() {
  const router = useRouter();
  return (
    <View style={gaya.layarIsiRapat}>
      <Kosong
        judul={T.tidakDitemukanJudul}
        teks={T.tidakDitemukanTeks}
        aksi={<Tombol label={T.kembali} varian="sekunder" onPress={() => router.replace('/discover' as any)} />}
      />
    </View>
  );
}

/** Satu layar, satu tombol Simpan. */
function FormRefleksi({ kartu, awal }: { kartu: KartuDiscover; awal?: RefleksiDiscover }) {
  const router = useRouter();
  const simpan = useSimpanRefleksi();
  const [ketertarikan, setKetertarikan] = useState<Ketertarikan | null>(awal?.ketertarikan ?? null);
  const [menarik, setMenarik] = useState(awal?.yang_menarik ?? '');
  const [kurang, setKurang] = useState(awal?.yang_kurang_menarik ?? '');
  const [galat, setGalat] = useState<GalatIsianRefleksi>({});

  const kirim = () => {
    const isian = { ketertarikan, menarik, kurang };
    const periksa = periksaIsianRefleksi(isian);
    setGalat(periksa);
    if (Object.keys(periksa).length || !ketertarikan) return;
    simpan.mutate(
      { kartuId: kartu.id, badan: badanRefleksi({ ...isian, ketertarikan }) },
      { onSuccess: () => router.replace('/discover' as any) }
    );
  };

  return (
    <View style={gaya.layarIsiRapat}>
      <Text style={s.judulKartu} role="heading">
        {kartu.judul}
      </Text>
      <Text style={gaya.teksBody}>{kartu.ringkasan}</Text>
      <Field label={T.tanyaKetertarikan} galat={galat.ketertarikan}>
        <DaftarOpsi>
          {PILIHAN_KETERTARIKAN.map((p) => (
            <OpsiPil key={p.id} label={p.label} aktif={ketertarikan === p.id} onPress={() => setKetertarikan(p.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label={T.labelMenarik} labelTambahan={T.labelOpsional} galat={galat.yang_menarik}>
        <Input value={menarik} onChangeText={setMenarik} maxLength={BATAS_DISCOVER.refleksi} multiline autoCapitalize="sentences" style={s.isian} />
      </Field>
      <Field label={T.labelKurangMenarik} labelTambahan={T.labelOpsional} galat={galat.yang_kurang_menarik}>
        <Input value={kurang} onChangeText={setKurang} maxLength={BATAS_DISCOVER.refleksi} multiline autoCapitalize="sentences" style={s.isian} />
      </Field>
      <Text style={s.keterangan}>{T.privasi}</Text>
      {simpan.isError ? <PesanGalat teks={pesanGalatDiscover(simpan.error.kode)} /> : null}
      <Tombol label={simpan.isPending ? T.menyimpan : T.simpan} besar penuh proses={simpan.isPending} onPress={kirim} />
    </View>
  );
}

export function ProfilEksplorasiScreen() {
  const profil = useProfilEksplorasi();
  const keadaan = keadaanData({ isPending: profil.isPending, galat: profil.error });
  if (keadaan !== 'siap') return <KeadaanLayar keadaan={keadaan} onCoba={() => profil.refetch()} />;
  const { profil: terkini, jumlah_versi: jumlahVersi } = profil.data!;
  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.judulProfil} pengantar={T.pengantarProfil} />
      {terkini ? <IsiProfil profil={terkini} /> : <Kosong judul={T.belumAdaProfil} teks={T.belumAdaProfilTeks} />}
      <FormProfil key={terkini?.id ?? 'baru'} awal={terkini} />
      {jumlahVersi > 1 ? <Riwayat /> : null}
    </View>
  );
}

/** Satu blok per kartu: kalimat pilihan, lalu kutipan isian siswa yang tidak kosong (LANJUT_026). */
function BlokKartu({ profil }: { profil: ProfilEksplorasi }) {
  return (
    <>
      {blokProfil(profil).map((b, i) => (
        <View key={i} style={s.blok}>
          <Text style={gaya.teksBody}>{b.kalimat}</Text>
          {b.kutipan.map((k) => (
            <View key={k.label} style={s.kutipan}>
              <Text style={s.labelKutipan}>{k.label}</Text>
              <Text style={gaya.teksBody}>{`"${k.teks}"`}</Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function IsiProfil({ profil }: { profil: ProfilEksplorasi }) {
  const mapel = profil.mapel_pilihan.map((m) => m.nama ?? m.id);
  return (
    <View style={s.daftar}>
      <Text style={s.keterangan}>{teksVersi(profil.versi_ke, profil.dibuat_pada)}</Text>
      <BlokKartu profil={profil} />
      {profil.refleksi_disembunyikan > 0 ? <Text style={s.keterangan}>{teksDisembunyikan(profil.refleksi_disembunyikan)}</Text> : null}
      {profil.catatan ? <Text style={gaya.teksBody}>{`"${profil.catatan}"`}</Text> : null}
      {profil.minat_rumpun.length || mapel.length ? (
        <>
          <SeksiJudul>{T.bagianDataAkun}</SeksiJudul>
          {profil.minat_rumpun.length ? <Text style={gaya.teksBody}>{`${T.labelMinatRumpun}: ${profil.minat_rumpun.join(', ')}`}</Text> : null}
          {mapel.length ? <Text style={gaya.teksBody}>{`${T.labelMapelPilihan}: ${mapel.join(', ')}`}</Text> : null}
        </>
      ) : null}
      {profil.jalur.length || profil.tujuan.length ? (
        <>
          <SeksiJudul>{T.bagianJalurTujuan}</SeksiJudul>
          {profil.jalur.length ? <Text style={gaya.teksBody}>{`${T.labelJalur}: ${profil.jalur.map((j) => j.nama).join(', ')}`}</Text> : null}
          {profil.tujuan.map((t) => (
            <Text key={t.id} style={gaya.teksBody}>{`${T.labelTujuan}: ${t.judul}`}</Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** Satu tombol: menyusun versi baru dari refleksi saat ini dan catatan ini. */
function FormProfil({ awal }: { awal: ProfilEksplorasi | null }) {
  const perbarui = usePerbaruiProfil();
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [galat, setGalat] = useState<string | null>(null);

  const kirim = () => {
    if (catatan.trim().length > BATAS_DISCOVER.catatan) return setGalat(GALAT_ISIAN_DISCOVER.catatanPanjang);
    setGalat(null);
    perbarui.mutate(
      { catatan: catatan.trim() || null },
      { onError: (err) => setGalat(err.kode === 'VALIDASI_GAGAL' ? GALAT_ISIAN_DISCOVER.tidakBerubah : pesanGalatDiscover(err.kode)) }
    );
  };

  return (
    <View style={s.daftar}>
      <Field label={T.labelCatatan} labelTambahan={T.labelOpsional} galat={galat ?? undefined}>
        <Input value={catatan} onChangeText={setCatatan} maxLength={BATAS_DISCOVER.catatan} multiline autoCapitalize="sentences" style={s.isian} />
      </Field>
      {awal ? <Text style={s.keterangan}>{T.catatanVersi}</Text> : null}
      <Text style={s.keterangan}>{T.privasi}</Text>
      <Tombol label={perbarui.isPending ? T.menyimpan : awal ? T.perbaruiProfil : T.susunProfil} besar penuh proses={perbarui.isPending} onPress={kirim} />
    </View>
  );
}

function Riwayat() {
  const [buka, setBuka] = useState(false);
  const riwayat = useRiwayatProfil(buka);
  const lama = (riwayat.data ?? []).filter((v) => v.status === 'diubah').reverse();
  return (
    <View style={s.daftar}>
      <Tombol label={buka ? T.tutupRiwayat : T.lihatRiwayat} varian="hantu" onPress={() => setBuka(!buka)} />
      {buka && riwayat.isPending ? <Memuat /> : null}
      {buka && riwayat.isError ? <PesanGalat teks={pesanGalatDiscover(riwayat.error.kode)} /> : null}
      {buka
        ? lama.map((v) => (
            <Kartu key={v.id} varian="soft" style={s.kartu}>
              <Text style={s.keterangan}>{teksVersi(v.versi_ke, v.dibuat_pada)}</Text>
              <BlokKartu profil={v} />
              {v.catatan ? <Text style={gaya.teksBody}>{`"${v.catatan}"`}</Text> : null}
            </Kartu>
          ))
        : null}
    </View>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s3 },
  kartu: { gap: spacing.s2, padding: spacing.s3 },
  baris: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.s2 },
  judulKartu: { ...teks.title, fontFamily: font.semibold, color: color.textBody },
  keterangan: { ...teks.caption, color: color.textMuted },
  tautan: { ...teks.caption, fontFamily: font.semibold, color: color.blue600 },
  ditekan: { opacity: 0.85 },
  isian: { minHeight: 96, textAlignVertical: 'top' },
  blok: { gap: spacing.s1 },
  kutipan: { gap: 2, paddingLeft: spacing.s3, borderLeftWidth: 2, borderLeftColor: color.ink100 },
  labelKutipan: { ...teks.caption, fontFamily: font.semibold, color: color.textMuted },
});
