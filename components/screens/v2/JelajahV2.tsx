import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { Ketertarikan, RefleksiDiscover } from '../../../api/types';
import { useDataJelajahV2, useSimpanRefleksiV2 } from '../../../hooks/useJelajahV2';
import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import {
  BATAS_DISCOVER,
  LABEL_JENIS_KARTU,
  PILIHAN_KETERTARIKAN,
  TEKS_JELAJAH_V2 as T,
  TEKS_PRIVASI_JELAJAH,
  badanKosongkanTulisanRefleksi,
  badanRefleksi,
  caraBelajarKartu,
  hitungBatasKarakter,
  jalurPenyaringKartu,
  kartuDisetujuiSaja,
  labelKetertarikanV2,
  periksaIsianRefleksi,
  pesanGalatDiscover,
  statusKartuJelajahV2,
  type GalatIsianRefleksi,
  type KartuDiscoverKandidat,
  type KeadaanData,
  type StatusKartuJelajahV2,
} from '../../../lib/jelajahV2';
import { formatTanggal } from '../../../lib/linimasa';
import { elevasi, garis, keluargaHuruf, radius, ruang, tataLetak, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import {
  Ikon,
  Isian,
  KeadaanGalat,
  KeadaanKosong,
  PesanStatus,
  PlaceholderMemuat,
  Sentuh,
  Teks,
  Tombol,
} from '../../v2';

const PERILAKU_PAPAN_KETIK = Platform.OS === 'ios' ? 'padding' : undefined;

/**
 * Layar Jelajah v2 (`/discover`, LANJUT_034, di balik EXPO_PUBLIC_DISCOVER & EXPO_PUBLIC_NAVIGASI_V2).
 * - Kartu besar interaktif hanya untuk kartu disetujui (`kartuDisetujuiSaja`), tanpa teks draf.
 * - Penanda tertulis ("Sudah ditulis" / "Sudah dibaca") bersama ikon centang, bukan hanya warna.
 * - Rincian kartu menampilkan isi persis dari server, sumber & tanggal periksa hanya bila ada di data,
 *   bagian "Cara belajar" hanya bila data mendukung, dan satu tombol "Tulis refleksi" / "Ubah refleksi".
 * - Keadaan kosong memakai maskot kelinci di dalam lingkaran `warna.latarMaskot` di kedua mode.
 */
export function JelajahV2() {
  const { warna } = useTemaV2();
  const router = useRouter();
  const kurangiGerak = useKurangiGerak();
  const { kartu, refleksi, keadaan, muatUlang } = useDataJelajahV2();
  const [kartuAktifId, setKartuAktifId] = useState<string | null>(null);
  const [dibacaIds, setDibacaIds] = useState<string[]>([]);
  const [saringJalurId, setSaringJalurId] = useState<string | null>(null);

  const daftarKartuSah = useMemo(() => kartuDisetujuiSaja(kartu.data), [kartu.data]);
  const petaRefleksi = useMemo(() => {
    const peta = new Map<string, RefleksiDiscover>();
    for (const r of refleksi.data ?? []) peta.set(r.kartu_discover_id, r);
    return peta;
  }, [refleksi.data]);
  const idRefleksi = useMemo(() => new Set(petaRefleksi.keys()), [petaRefleksi]);
  const idDibaca = useMemo(() => new Set(dibacaIds), [dibacaIds]);
  const chipJalur = useMemo(() => jalurPenyaringKartu(daftarKartuSah), [daftarKartuSah]);

  if (keadaan !== 'siap') {
    return <KeadaanNonSiapJelajahV2 keadaan={keadaan} labelMemuat={T.memuatJelajah} onCobaLagi={muatUlang} />;
  }

  const kartuTampil = saringJalurId
    ? daftarKartuSah.filter((k) => k.jalur_minat_id === saringJalurId)
    : daftarKartuSah;
  const kartuAktif = kartuAktifId ? daftarKartuSah.find((k) => k.id === kartuAktifId) ?? null : null;
  const refleksiAktif = kartuAktif ? petaRefleksi.get(kartuAktif.id) : undefined;

  const bukaRincian = (id: string) => {
    setDibacaIds((lama) => (lama.includes(id) ? lama : [...lama, id]));
    setKartuAktifId(id);
  };

  const keRefleksi = (id: string) => {
    setKartuAktifId(null);
    router.push({ pathname: '/discover-refleksi' as any, params: { kartu: id } });
  };

  return (
    <View style={s.wadah}>
      <View style={s.kepala}>
        <Teks varian="h1">{T.judul}</Teks>
        <Teks varian="badan" warna="teksSekunder">
          {T.ringkasan}
        </Teks>
      </View>

      {chipJalur.length > 0 ? (
        <View style={s.daftarPil} accessibilityRole="radiogroup">
          {chipJalur.map((c) => {
            const aktif = saringJalurId === c.id;
            return (
              <Sentuh
                key={c.id}
                peran="radio"
                label={c.label}
                terpilih={aktif}
                dicentang={aktif}
                onPress={() => setSaringJalurId((v) => (v === c.id ? null : c.id))}
                gaya={({ ditekan }) => [
                  s.pil,
                  {
                    backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.permukaan,
                    borderColor: aktif ? warna.aksen : warna.garisKontrol,
                    borderWidth: aktif ? garis.fokus : garis.tipis,
                  },
                ]}
              >
                {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
                <Teks varian="badanKecil" gaya={aktif ? s.teksTebal : undefined}>
                  {c.label}
                </Teks>
              </Sentuh>
            );
          })}
        </View>
      ) : null}

      {kartuTampil.length === 0 ? (
        <KartuMaskotKosongJelajahV2
          judul={T.kosongJudul}
          teks={T.kosongTeks}
          labelAksi={T.bukaProfil}
          onAksi={() => router.push('/discover-profil' as any)}
        />
      ) : (
        <View style={s.daftar}>
          {kartuTampil.map((k) => {
            const status = statusKartuJelajahV2({
              kartuId: k.id,
              idRefleksi,
              idDibaca,
            });
            return (
              <KartuJelajahBesarV2
                key={k.id}
                kartu={k}
                status={status}
                onTekan={() => bukaRincian(k.id)}
              />
            );
          })}
        </View>
      )}

      <Modal
        visible={kartuAktif !== null}
        animationType={kurangiGerak ? 'none' : 'slide'}
        onRequestClose={() => setKartuAktifId(null)}
      >
        {kartuAktif ? (
          <RincianKartuModalV2
            kartu={kartuAktif}
            refleksi={refleksiAktif}
            onTutup={() => setKartuAktifId(null)}
            onTulisRefleksi={() => keRefleksi(kartuAktif.id)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

/**
 * Layar refleksi kartu (`/discover-refleksi?kartu=<id>`, LANJUT_034).
 * Memakai endpoint v1 `PUT /discover/refleksi/:kartuId` dengan batas 280 karakter per kolom,
 * penghitung sisa karakter langsung, kalimat privasi jujur sama persis dengan v1, serta aksi
 * mengosongkan tulisan refleksi.
 */
export function RefleksiJelajahV2() {
  const router = useRouter();
  const { kartu: kartuId } = useLocalSearchParams<{ kartu?: string }>();
  const { kartu, refleksi, keadaan, muatUlang } = useDataJelajahV2();

  if (keadaan !== 'siap') {
    return <KeadaanNonSiapJelajahV2 keadaan={keadaan} labelMemuat={T.memuatJelajah} onCobaLagi={muatUlang} />;
  }

  const daftarKartuSah = kartuDisetujuiSaja(kartu.data);
  const kartuAktif = daftarKartuSah.find((k) => k.id === kartuId);
  if (!kartuAktif) {
    return (
      <View style={s.wadah}>
        <KeadaanKosong
          judul={T.tidakDitemukanJudul}
          teks={T.tidakDitemukanTeks}
          aksi={{ label: T.kembaliKeJelajah, onPress: () => router.replace('/discover' as any) }}
        />
      </View>
    );
  }

  const awal = (refleksi.data ?? []).find((r) => r.kartu_discover_id === kartuAktif.id);
  return (
    <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
      <FormRefleksiV2 key={kartuAktif.id} kartu={kartuAktif} awal={awal} />
    </KeyboardAvoidingView>
  );
}

export function KeadaanNonSiapJelajahV2({
  keadaan,
  labelMemuat,
  onCobaLagi,
}: {
  keadaan: KeadaanData;
  labelMemuat: string;
  onCobaLagi: () => void;
}) {
  const router = useRouter();
  if (keadaan === 'memuat') {
    return (
      <View style={s.wadah}>
        <PlaceholderMemuat baris={2} label={labelMemuat} />
        <PlaceholderMemuat baris={3} label={labelMemuat} />
      </View>
    );
  }
  if (keadaan === 'fitur_mati') {
    return (
      <View style={s.wadah}>
        <KeadaanKosong judul={T.fiturMatiJudul} teks={T.fiturMatiTeks} />
      </View>
    );
  }
  if (keadaan === 'perlu_kebijakan') {
    return (
      <View style={s.wadah}>
        <KeadaanKosong
          judul={T.perluKebijakanJudul}
          teks={T.perluKebijakanTeks}
          aksi={{ label: T.bacaKebijakan, onPress: () => router.push('/terima-kebijakan' as any) }}
        />
      </View>
    );
  }
  return (
    <View style={s.wadah}>
      <KeadaanGalat judul={T.galatJudul} pesan={T.galatPesan} onCobaLagi={onCobaLagi} />
    </View>
  );
}

export function KartuMaskotKosongJelajahV2({
  judul,
  teks,
  labelAksi,
  onAksi,
}: {
  judul: string;
  teks: string;
  labelAksi?: string;
  onAksi?: () => void;
}) {
  const { warna } = useTemaV2();
  return (
    <View
      style={StyleSheet.flatten([
        s.kosongKartu,
        { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
      ])}
    >
      <View
        style={StyleSheet.flatten([s.lingkaranMaskot, { backgroundColor: warna.latarMaskot }])}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require('../../../assets/mascot-blue.png')}
          style={s.maskot}
          resizeMode="contain"
          accessible={false}
        />
      </View>
      <Teks varian="judulKecil" rata="center">
        {judul}
      </Teks>
      <Teks varian="badanKecil" warna="teksSekunder" rata="center">
        {teks}
      </Teks>
      {labelAksi && onAksi ? <Tombol varian="utama" label={labelAksi} onPress={onAksi} /> : null}
    </View>
  );
}

function KartuJelajahBesarV2({
  kartu,
  status,
  onTekan,
}: {
  kartu: KartuDiscoverKandidat;
  status: StatusKartuJelajahV2;
  onTekan: () => void;
}) {
  const { mode, warna } = useTemaV2();
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const teksStatus =
    status === 'sudah_ditulis'
      ? T.penandaSudahDitulis
      : status === 'sudah_dibaca'
        ? T.penandaSudahDibaca
        : null;
  const labelKartu = teksStatus ? `${kartu.judul}, ${teksStatus}` : kartu.judul;

  return (
    <Sentuh
      peran="button"
      label={labelKartu}
      petunjuk={T.lihatDetail}
      onPress={onTekan}
      gaya={({ ditekan }) => [
        s.kartuBesar,
        bayangan,
        {
          backgroundColor: ditekan ? warna.permukaanLembut : warna.permukaan,
          borderColor: status === 'sudah_ditulis' ? warna.aksen : warna.garisHalus,
          borderWidth: status === 'sudah_ditulis' ? garis.fokus : garis.tipis,
        },
      ]}
    >
      <View style={s.isiFleks}>
        <View style={s.barisLencana}>
          <View
            style={StyleSheet.flatten([
              s.lencanaNetral,
              { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
            ])}
          >
            <Teks varian="keterangan" warna="teksSekunder">
              {LABEL_JENIS_KARTU[kartu.jenis]}
            </Teks>
          </View>
          {teksStatus ? (
            <View
              style={StyleSheet.flatten([
                s.lencanaAktif,
                { backgroundColor: warna.halaman, borderColor: warna.aksen },
              ])}
            >
              <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} />
              <Teks varian="keterangan" warna="aksen" gaya={s.teksTebal}>
                {teksStatus}
              </Teks>
            </View>
          ) : null}
        </View>
        <Teks varian="judulKecil">{kartu.judul}</Teks>
        <Teks varian="badanKecil" warna="teksSekunder">
          {kartu.ringkasan}
        </Teks>
        <Teks varian="keterangan" warna="aksen" garisBawah>
          {T.lihatDetail}
        </Teks>
      </View>
      <Ikon nama="panah" ukuran={ukuran.ikon} warna={warna.teksSekunder} />
    </Sentuh>
  );
}

function RincianKartuModalV2({
  kartu,
  refleksi,
  onTutup,
  onTulisRefleksi,
}: {
  kartu: KartuDiscoverKandidat;
  refleksi?: RefleksiDiscover;
  onTutup: () => void;
  onTulisRefleksi: () => void;
}) {
  const { warna } = useTemaV2();
  const tipsCaraBelajar = caraBelajarKartu(kartu);
  const labelTombolRefleksi = refleksi ? T.ubahRefleksi : T.tulisRefleksi;

  return (
    <View style={StyleSheet.flatten([s.modalAkar, { backgroundColor: warna.halaman }])}>
      <View
        style={StyleSheet.flatten([
          s.modalBilahAtas,
          { backgroundColor: warna.permukaan, borderBottomColor: warna.garisHalus },
        ])}
      >
        <Teks varian="judulKecil" gaya={s.fleks}>
          {T.rincianJudul}
        </Teks>
        <Tombol varian="teks" label={T.tutup} onPress={onTutup} />
      </View>

      <ScrollView contentContainerStyle={s.modalGulir}>
        <View style={s.modalKolom}>
          <View
            style={StyleSheet.flatten([
              s.kartuRincian,
              { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
            ])}
          >
            <View style={s.barisLencana}>
              <View
                style={StyleSheet.flatten([
                  s.lencanaNetral,
                  { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
                ])}
              >
                <Teks varian="keterangan" warna="teksSekunder">
                  {LABEL_JENIS_KARTU[kartu.jenis]}
                </Teks>
              </View>
              {refleksi ? (
                <View
                  style={StyleSheet.flatten([
                    s.lencanaAktif,
                    { backgroundColor: warna.halaman, borderColor: warna.aksen },
                  ])}
                >
                  <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} />
                  <Teks varian="keterangan" warna="aksen" gaya={s.teksTebal}>
                    {T.penandaSudahDitulis}
                  </Teks>
                </View>
              ) : null}
            </View>

            <Teks varian="h1">{kartu.judul}</Teks>
            <Teks varian="badan">{kartu.ringkasan}</Teks>

            {kartu.url_sumber || kartu.diperiksa_pada ? (
              <View style={StyleSheet.flatten([s.blokMeta, { borderTopColor: warna.garisHalus }])}>
                {kartu.url_sumber ? (
                  <Teks varian="keterangan" warna="teksSekunder">
                    {`${T.labelSumber}: ${kartu.url_sumber}`}
                  </Teks>
                ) : null}
                {kartu.diperiksa_pada ? (
                  <Teks varian="keterangan" warna="teksSekunder">
                    {`${T.labelDiperiksa}: ${formatTanggal(kartu.diperiksa_pada)}`}
                  </Teks>
                ) : null}
              </View>
            ) : null}

            {tipsCaraBelajar ? (
              <View style={StyleSheet.flatten([s.blokMeta, { borderTopColor: warna.garisHalus }])}>
                <Teks varian="judulKecil">{T.labelCaraBelajar}</Teks>
                {tipsCaraBelajar.map((butir, i) => (
                  <Teks key={i} varian="badanKecil">
                    {butir}
                  </Teks>
                ))}
              </View>
            ) : null}

            {refleksi ? (
              <View
                style={StyleSheet.flatten([
                  s.blokRefleksiRingkas,
                  { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
                ])}
              >
                <Teks varian="judulKecil">{labelKetertarikanV2(refleksi.ketertarikan)}</Teks>
                {refleksi.yang_menarik ? (
                  <View style={s.blokKutipan}>
                    <Teks varian="keterangan" warna="teksSekunder">
                      {T.labelMenarik}
                    </Teks>
                    <Teks varian="badanKecil">{refleksi.yang_menarik}</Teks>
                  </View>
                ) : null}
                {refleksi.yang_kurang_menarik ? (
                  <View style={s.blokKutipan}>
                    <Teks varian="keterangan" warna="teksSekunder">
                      {T.labelKurangMenarik}
                    </Teks>
                    <Teks varian="badanKecil">{refleksi.yang_kurang_menarik}</Teks>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Tombol varian="utama" label={labelTombolRefleksi} penuh onPress={onTulisRefleksi} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FormRefleksiV2({ kartu, awal }: { kartu: KartuDiscoverKandidat; awal?: RefleksiDiscover }) {
  const { warna } = useTemaV2();
  const simpan = useSimpanRefleksiV2();
  const [ketertarikan, setKetertarikan] = useState<Ketertarikan | null>(awal?.ketertarikan ?? null);
  const [menarik, setMenarik] = useState(awal?.yang_menarik ?? '');
  const [kurang, setKurang] = useState(awal?.yang_kurang_menarik ?? '');
  const [galat, setGalat] = useState<GalatIsianRefleksi>({});
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const infoMenarik = hitungBatasKarakter(menarik, BATAS_DISCOVER.refleksi);
  const infoKurang = hitungBatasKarakter(kurang, BATAS_DISCOVER.refleksi);
  const adaTulisanTersimpan = Boolean(
    awal && ((awal.yang_menarik && awal.yang_menarik.trim()) || (awal.yang_kurang_menarik && awal.yang_kurang_menarik.trim()))
  );

  const galatMenarik = galat.yang_menarik ?? (infoMenarik.melewati ? periksaIsianRefleksi({ ketertarikan: 'tertarik', menarik, kurang: '' }).yang_menarik : undefined);
  const galatKurang = galat.yang_kurang_menarik ?? (infoKurang.melewati ? periksaIsianRefleksi({ ketertarikan: 'tertarik', menarik: '', kurang }).yang_kurang_menarik : undefined);

  const kirim = () => {
    setPesanSukses(null);
    const isian = { ketertarikan, menarik, kurang };
    const periksa = periksaIsianRefleksi(isian);
    setGalat(periksa);
    if (Object.keys(periksa).length || !ketertarikan) return;
    simpan.mutate(
      { kartuId: kartu.id, badan: badanRefleksi({ ...isian, ketertarikan }) },
      {
        onSuccess: () => setPesanSukses(T.berhasilSimpanRefleksi),
      }
    );
  };

  const hapusTulisan = () => {
    setPesanSukses(null);
    const pilihanAktif = ketertarikan ?? awal?.ketertarikan ?? null;
    if (!pilihanAktif) return;
    simpan.mutate(
      { kartuId: kartu.id, badan: badanKosongkanTulisanRefleksi(pilihanAktif) },
      {
        onSuccess: () => {
          setMenarik('');
          setKurang('');
          setGalat({});
          setPesanSukses(T.berhasilHapusTulisan);
        },
      }
    );
  };

  return (
    <View style={s.formWadah}>
      <View
        style={StyleSheet.flatten([
          s.ringkasKartuForm,
          { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
        ])}
      >
        <Teks varian="judulKecil">{kartu.judul}</Teks>
        <Teks varian="badanKecil" warna="teksSekunder">
          {kartu.ringkasan}
        </Teks>
      </View>

      {pesanSukses ? (
        <PesanStatus jenis="sukses" berlatar>
          {pesanSukses}
        </PesanStatus>
      ) : null}

      <View style={s.seksiPil}>
        <Teks varian="judulKecil">{T.tanyaKetertarikan}</Teks>
        <View style={s.daftarPil} accessibilityRole="radiogroup">
          {PILIHAN_KETERTARIKAN.map((p) => {
            const aktif = ketertarikan === p.id;
            return (
              <Sentuh
                key={p.id}
                peran="radio"
                label={p.label}
                terpilih={aktif}
                dicentang={aktif}
                onPress={() => {
                  setKetertarikan(p.id);
                  setGalat((g) => ({ ...g, ketertarikan: undefined }));
                  setPesanSukses(null);
                }}
                gaya={({ ditekan }) => [
                  s.pil,
                  {
                    backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.permukaan,
                    borderColor: aktif ? warna.aksen : warna.garisKontrol,
                    borderWidth: aktif ? garis.fokus : garis.tipis,
                  },
                ]}
              >
                {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
                <Teks varian="badanKecil" gaya={aktif ? s.teksTebal : undefined}>
                  {p.label}
                </Teks>
              </Sentuh>
            );
          })}
        </View>
        {galat.ketertarikan ? <PesanStatus jenis="galat">{galat.ketertarikan}</PesanStatus> : null}
      </View>

      <View style={s.kolomDenganHitung}>
        <Isian
          label={T.labelMenarik}
          nilai={menarik}
          onUbah={(v) => {
            setMenarik(v);
            setGalat((g) => ({ ...g, yang_menarik: undefined }));
            setPesanSukses(null);
          }}
          barisGanda
          galat={galatMenarik}
        />
        <Teks
          varian="keterangan"
          warna={infoMenarik.melewati ? 'galat' : 'teksSekunder'}
          gaya={s.penghitung}
        >
          {infoMenarik.teksRingkas}
        </Teks>
      </View>

      <View style={s.kolomDenganHitung}>
        <Isian
          label={T.labelKurangMenarik}
          nilai={kurang}
          onUbah={(v) => {
            setKurang(v);
            setGalat((g) => ({ ...g, yang_kurang_menarik: undefined }));
            setPesanSukses(null);
          }}
          barisGanda
          galat={galatKurang}
        />
        <Teks
          varian="keterangan"
          warna={infoKurang.melewati ? 'galat' : 'teksSekunder'}
          gaya={s.penghitung}
        >
          {infoKurang.teksRingkas}
        </Teks>
      </View>

      <Teks varian="keterangan" warna="teksSekunder">
        {TEKS_PRIVASI_JELAJAH}
      </Teks>

      {simpan.isError ? (
        <PesanStatus jenis="galat" berlatar>
          {pesanGalatDiscover(simpan.error.kode)}
        </PesanStatus>
      ) : null}

      <View style={s.barisAksiForm}>
        <Tombol varian="utama" label={T.simpan} memuat={simpan.isPending} onPress={kirim} />
        {adaTulisanTersimpan ? (
          <Tombol varian="teks" label={T.hapusTulisan} nonaktif={simpan.isPending} onPress={hapusTulisan} />
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wadah: {
    paddingHorizontal: ruang.tepi,
    paddingVertical: ruang.r3,
    gap: ruang.r3,
  },
  kepala: {
    gap: ruang.r1,
  },
  daftar: {
    gap: ruang.r2,
  },
  fleks: {
    flex: 1,
    minWidth: 0,
  },
  isiFleks: {
    flex: 1,
    minWidth: 0,
    gap: ruang.r1,
  },
  teksTebal: {
    fontFamily: keluargaHuruf.badanTebal,
  },
  kartuBesar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
  },
  barisLencana: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ruang.r1,
  },
  lencanaNetral: {
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  lencanaAktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  kosongKartu: {
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r3,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
  lingkaranMaskot: {
    width: ukuran.lingkaranIkon,
    height: ukuran.lingkaranIkon,
    borderRadius: radius.pil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskot: {
    width: ukuran.ikonBesar,
    height: ukuran.ikonBesar,
  },
  modalAkar: {
    flex: 1,
  },
  modalBilahAtas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ruang.r2,
    paddingHorizontal: ruang.tepi,
    paddingVertical: ruang.r1,
    borderBottomWidth: garis.tipis,
  },
  modalGulir: {
    flexGrow: 1,
  },
  modalKolom: {
    width: '100%',
    maxWidth: tataLetak.lebarMaks,
    alignSelf: 'center',
    paddingHorizontal: ruang.tepi,
    paddingVertical: ruang.r3,
  },
  kartuRincian: {
    padding: ruang.r3,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  blokMeta: {
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r2,
    gap: ruang.r1,
  },
  blokRefleksiRingkas: {
    padding: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
    gap: ruang.r1,
  },
  blokKutipan: {
    gap: ruang.r1,
  },
  formWadah: {
    gap: ruang.r2,
  },
  ringkasKartuForm: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r1,
  },
  seksiPil: {
    gap: ruang.r1,
  },
  daftarPil: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ruang.r1,
  },
  pil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.pil,
  },
  kolomDenganHitung: {
    gap: ruang.r1,
  },
  penghitung: {
    alignSelf: 'flex-end',
  },
  barisAksiForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ruang.r2,
  },
});
