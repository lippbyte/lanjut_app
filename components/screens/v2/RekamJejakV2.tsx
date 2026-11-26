import React, { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, View } from 'react-native';

import type { ButirBukti, JalurMinat } from '../../../api/types';
import {
  useDaftarButirV2,
  useHapusButirV2,
  useJalurUntukRekamJejakV2,
  useSimpanButirV2,
} from '../../../hooks/useRekamJejakV2';
import { formatTanggal } from '../../../lib/linimasa';
import {
  BATAS_ISIAN,
  JENIS_BUTIR,
  TEKS_REKAM_JEJAK_V2 as T,
  badanButir,
  galatMedanServer,
  hitungFotoAkun,
  keadaanDaftar,
  labelJalurButirV2,
  labelJenisButir,
  periksaIsianButir,
  pesanGalatPortofolio,
  tautanSah,
  teksJumlahFotoKartuV2,
  urutkanButirTerbaru,
  type GalatIsian,
  type JenisButir,
  type KeadaanDaftar,
} from '../../../lib/rekamJejakV2';
import { elevasi, garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
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
import { FotoTerlindungV2, SeksiFotoV2 } from './RekamJejakFotoV2';

const PERILAKU_PAPAN_KETIK = Platform.OS === 'ios' ? 'padding' : undefined;

const tanggalButir = (b: ButirBukti) => formatTanggal(b.tanggal_karya ?? b.dibuat_pada);

function useKeadaanDaftarV2() {
  const daftar = useDaftarButirV2();
  const keadaan = keadaanDaftar({
    isPending: daftar.isPending,
    galat: daftar.error,
    jumlah: daftar.data?.length,
  });
  return { daftar, keadaan, siap: keadaan === 'ada' || keadaan === 'kosong' };
}

function KeadaanNonSiapRekamJejakV2({
  keadaan,
  onCobaLagi,
}: {
  keadaan: KeadaanDaftar;
  onCobaLagi: () => void;
}) {
  const router = useRouter();
  if (keadaan === 'memuat') {
    return (
      <View style={s.wadah}>
        <PlaceholderMemuat baris={2} label={T.memuatDaftar} />
        <PlaceholderMemuat baris={3} label={T.memuatDaftar} />
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
      <KeadaanGalat
        judul={T.galatJudul}
        pesan={keadaan === 'jaringan' ? T.galatJaringan : T.galatServer}
        onCobaLagi={onCobaLagi}
      />
    </View>
  );
}

function TidakDitemukanV2() {
  const router = useRouter();
  return (
    <View style={s.wadah}>
      <KeadaanKosong
        judul={T.tidakDitemukanJudul}
        teks={T.tidakDitemukanTeks}
        aksi={{ label: T.kembali, onPress: () => router.replace('/portofolio' as any) }}
      />
    </View>
  );
}

/**
 * Daftar Rekam Jejak v2 (`/portofolio`, LANJUT_036, di balik EXPO_PUBLIC_PORTOFOLIO & EXPO_PUBLIC_NAVIGASI_V2).
 * - Kartu besar interaktif terbaru di atas, jenis tertulis (`Karya`/`Proses`/`Refleksi`), tanggal,
 *   gambar kecil bertoken bila ada foto, serta chip jalur melalui `labelJalur` (jalur draf netral, tanpa id mentah).
 * - Keadaan kosong memakai maskot kelinci di dalam lingkaran `warna.latarMaskot` di kedua mode.
 * - Satu tombol utama jelas untuk menambah catatan; sepenuhnya privat tanpa berbagi atau penilaian.
 */
export function RekamJejakDaftarV2() {
  const router = useRouter();
  const { warna } = useTemaV2();
  const { daftar, keadaan, siap } = useKeadaanDaftarV2();
  const jalur = useJalurUntukRekamJejakV2();

  const daftarTerurut = useMemo(() => urutkanButirTerbaru(daftar.data), [daftar.data]);

  if (!siap) {
    return <KeadaanNonSiapRekamJejakV2 keadaan={keadaan} onCobaLagi={() => void daftar.refetch()} />;
  }

  const tulis = () => router.push('/portofolio-tulis' as any);

  return (
    <View style={s.wadah}>
      <View style={s.kepala}>
        <Teks varian="h1">{T.judul}</Teks>
        <Teks varian="badan" warna="teksSekunder">
          {T.ringkasan}
        </Teks>
      </View>

      {keadaan === 'kosong' ? (
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
            {T.kosongJudul}
          </Teks>
          <Teks varian="badanKecil" warna="teksSekunder" rata="center">
            {T.kosongTeks}
          </Teks>
          <Tombol varian="utama" label={T.tambah} onPress={tulis} />
        </View>
      ) : (
        <>
          <Tombol varian="utama" label={T.tambah} penuh onPress={tulis} />
          <View style={s.daftar}>
            {daftarTerurut.map((b) => (
              <KartuButirV2
                key={b.id}
                butir={b}
                daftarJalur={jalur.data}
                onTekan={() => router.push({ pathname: '/portofolio-butir' as any, params: { id: b.id } })}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function KartuButirV2({
  butir,
  daftarJalur,
  onTekan,
}: {
  butir: ButirBukti;
  daftarJalur?: readonly JalurMinat[];
  onTekan: () => void;
}) {
  const { mode, warna } = useTemaV2();
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const labelJenis = labelJenisButir(butir.jenis);
  const labelJalurTerkait = labelJalurButirV2(butir, daftarJalur);
  const labelJumlahFoto = teksJumlahFotoKartuV2(butir.foto.length);
  const labelTanggal = tanggalButir(butir);
  const labelAkses = [butir.judul, labelJenis, labelJalurTerkait, labelTanggal].filter(Boolean).join(', ');

  return (
    <Sentuh
      peran="button"
      label={labelAkses}
      petunjuk={T.bukaCatatan}
      onPress={onTekan}
      gaya={({ ditekan }) => [
        s.kartuButir,
        bayangan,
        {
          backgroundColor: ditekan ? warna.permukaanLembut : warna.permukaan,
          borderColor: warna.garisHalus,
        },
      ]}
    >
      {butir.foto[0] ? (
        <FotoTerlindungV2 butirId={butir.id} fotoId={butir.foto[0].id} gayaGambar={s.gambarKecil} kecil />
      ) : null}

      <View style={s.isiFleks}>
        <View style={s.barisLencana}>
          <View
            style={StyleSheet.flatten([
              s.lencanaNetral,
              { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
            ])}
          >
            <Teks varian="keterangan" warna="teksSekunder">
              {labelJenis}
            </Teks>
          </View>
          {labelJalurTerkait ? (
            <View
              style={StyleSheet.flatten([
                s.lencanaNetral,
                { backgroundColor: warna.halaman, borderColor: warna.garisKontrol },
              ])}
            >
              <Teks varian="keterangan" warna="teksSekunder">
                {labelJalurTerkait}
              </Teks>
            </View>
          ) : null}
          {labelJumlahFoto ? (
            <View
              style={StyleSheet.flatten([
                s.lencanaIkon,
                { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
              ])}
            >
              <Ikon nama="foto" ukuran={ukuran.ikon} warna={warna.teksSekunder} />
              <Teks varian="keterangan" warna="teksSekunder">
                {labelJumlahFoto}
              </Teks>
            </View>
          ) : null}
        </View>

        <Teks varian="judulKecil" baris={2}>
          {butir.judul}
        </Teks>
        <Teks varian="keterangan" warna="teksSekunder">
          {labelTanggal}
        </Teks>
      </View>

      <Ikon nama="panah" ukuran={ukuran.ikon} warna={warna.teksSekunder} />
    </Sentuh>
  );
}

/**
 * Buat atau ubah catatan Rekam Jejak v2 (`/portofolio-tulis`, LANJUT_036).
 * Satu layar, satu tombol Simpan, tanpa wizard, tanpa pemilih jalur atau tujuan baru.
 */
export function RekamJejakTulisV2() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { daftar, keadaan, siap } = useKeadaanDaftarV2();

  if (!siap) {
    return <KeadaanNonSiapRekamJejakV2 keadaan={keadaan} onCobaLagi={() => void daftar.refetch()} />;
  }
  if (!id) {
    return (
      <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
        <FormButirV2 />
      </KeyboardAvoidingView>
    );
  }
  const butir = daftar.data!.find((b) => b.id === id);
  if (!butir) return <TidakDitemukanV2 />;

  return (
    <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
      <FormButirV2 key={butir.id} awal={butir} />
    </KeyboardAvoidingView>
  );
}

/** Satu layar, satu tombol Simpan. Jenis bawaan `karya` agar tidak menambah ketukan. */
function FormButirV2({ awal }: { awal?: ButirBukti }) {
  const router = useRouter();
  const { warna } = useTemaV2();
  const simpan = useSimpanButirV2();
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
          else router.replace({ pathname: '/portofolio-butir' as any, params: { id: butir.id } });
        },
        onError: (err) => setGalat(galatMedanServer(err.medan)),
      }
    );
  };

  const adaGalatMedan = Object.keys(galat).length > 0;

  return (
    <View style={s.formWadah}>
      <Isian
        label={T.labelJudul}
        nilai={judul}
        onUbah={(v) => {
          setJudul(v);
          setGalat((g) => ({ ...g, judul: undefined }));
        }}
        maksPanjang={BATAS_ISIAN.judul}
        fokusAwal={!awal}
        galat={galat.judul}
      />

      <View style={s.seksiPil}>
        <Teks varian="judulKecil">{T.labelJenis}</Teks>
        <View style={s.daftarPil} accessibilityRole="radiogroup">
          {JENIS_BUTIR.map((j) => {
            const aktif = jenis === j.id;
            return (
              <Sentuh
                key={j.id}
                peran="radio"
                label={j.label}
                terpilih={aktif}
                dicentang={aktif}
                onPress={() => {
                  setJenis(j.id);
                  setGalat((g) => ({ ...g, jenis: undefined }));
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
                  {j.label}
                </Teks>
              </Sentuh>
            );
          })}
        </View>
        {galat.jenis ? <PesanStatus jenis="galat">{galat.jenis}</PesanStatus> : null}
      </View>

      <Isian
        label={T.labelUraian}
        nilai={uraian}
        onUbah={(v) => {
          setUraian(v);
          setGalat((g) => ({ ...g, uraian: undefined }));
        }}
        barisGanda
        maksPanjang={BATAS_ISIAN.uraian}
        galat={galat.uraian}
      />

      <Isian
        label={T.labelTautan}
        petunjuk={T.petunjukTautan}
        nilai={tautan}
        onUbah={(v) => {
          setTautan(v);
          setGalat((g) => ({ ...g, tautan: undefined }));
        }}
        maksPanjang={BATAS_ISIAN.tautan}
        galat={galat.tautan}
      />

      <Isian
        label={T.labelTanggal}
        petunjuk={T.petunjukTanggal}
        nilai={tanggal}
        onUbah={(v) => {
          setTanggal(v);
          setGalat((g) => ({ ...g, tanggal_karya: undefined }));
        }}
        maksPanjang={10}
        galat={galat.tanggal_karya}
      />

      {simpan.isError && !adaGalatMedan ? (
        <PesanStatus jenis="galat" berlatar>
          {pesanGalatPortofolio(simpan.error.kode, simpan.error.status)}
        </PesanStatus>
      ) : null}

      <Tombol varian="utama" label={T.simpan} memuat={simpan.isPending} penuh onPress={kirim} />
    </View>
  );
}

/**
 * Detail Rekam Jejak v2 (`/portofolio-butir?id=...`, LANJUT_036).
 * Menampilkan isi, tautan terverifikasi `http`/`https`, seksi foto bertoken tanpa cache disk,
 * tombol ubah, serta konfirmasi hapus yang menegaskan semua foto ikut terhapus.
 */
export function RekamJejakDetailV2() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { warna } = useTemaV2();
  const { daftar, keadaan, siap } = useKeadaanDaftarV2();
  const jalur = useJalurUntukRekamJejakV2();
  const hapus = useHapusButirV2();
  const [yakin, setYakin] = useState(false);

  if (!siap) {
    return <KeadaanNonSiapRekamJejakV2 keadaan={keadaan} onCobaLagi={() => void daftar.refetch()} />;
  }
  const butir = daftar.data!.find((b) => b.id === id);
  if (!butir) return <TidakDitemukanV2 />;

  const labelJalurTerkait = labelJalurButirV2(butir, jalur.data);

  return (
    <View style={s.wadah}>
      <View
        style={StyleSheet.flatten([
          s.kartuDetail,
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
              {labelJenisButir(butir.jenis)}
            </Teks>
          </View>
          <View
            style={StyleSheet.flatten([
              s.lencanaNetral,
              { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
            ])}
          >
            <Teks varian="keterangan" warna="teksSekunder">
              {tanggalButir(butir)}
            </Teks>
          </View>
          {labelJalurTerkait ? (
            <View
              style={StyleSheet.flatten([
                s.lencanaNetral,
                { backgroundColor: warna.halaman, borderColor: warna.garisKontrol },
              ])}
            >
              <Teks varian="keterangan" warna="teksSekunder">
                {labelJalurTerkait}
              </Teks>
            </View>
          ) : null}
        </View>

        <Teks varian="h1">{butir.judul}</Teks>

        {butir.uraian ? <Teks varian="badan">{butir.uraian}</Teks> : null}

        {butir.tautan && tautanSah(butir.tautan) ? (
          <Sentuh
            peran="link"
            label={`${T.bukaTautan}: ${butir.tautan}`}
            onPress={() => void Linking.openURL(butir.tautan!)}
            gaya={({ ditekan }) => [
              s.barisTautan,
              { backgroundColor: ditekan ? warna.permukaanLembut : warna.transparan },
            ]}
          >
            <Ikon nama="tautan" ukuran={ukuran.ikon} warna={warna.aksen} />
            <View style={s.fleks}>
              <Teks varian="badanKecil" warna="aksen" garisBawah>
                {butir.tautan}
              </Teks>
            </View>
          </Sentuh>
        ) : null}
      </View>

      <SeksiFotoV2 butir={butir} jumlahAkun={hitungFotoAkun(daftar.data!)} />

      <View style={StyleSheet.flatten([s.aksiDetail, { borderTopColor: warna.garisHalus }])}>
        <Tombol
          varian="sekunder"
          label={T.ubah}
          penuh
          onPress={() => router.push({ pathname: '/portofolio-tulis' as any, params: { id: butir.id } })}
        />

        {yakin ? (
          <View
            style={StyleSheet.flatten([
              s.kartuKonfirmasi,
              { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
            ])}
          >
            <Teks varian="badanKecil">{T.yakinHapus}</Teks>
            {hapus.isError ? <PesanStatus jenis="galat">{T.hapusGagal}</PesanStatus> : null}
            <View style={s.barisKonfirmasi}>
              <Tombol varian="teks" label={T.batal} nonaktif={hapus.isPending} onPress={() => setYakin(false)} />
              <Tombol
                varian="utama"
                label={T.yaHapus}
                memuat={hapus.isPending}
                onPress={() =>
                  hapus.mutate(butir, {
                    onSuccess: () => router.replace('/portofolio' as any),
                  })
                }
              />
            </View>
          </View>
        ) : (
          <Tombol varian="teks" label={T.hapus} onPress={() => setYakin(true)} />
        )}
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
  kartuButir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
  gambarKecil: {
    width: ukuran.lingkaranIkon,
    height: ukuran.lingkaranIkon,
    borderRadius: radius.kecil,
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
  lencanaIkon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  formWadah: {
    gap: ruang.r2,
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
  kartuDetail: {
    padding: ruang.r3,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  barisTautan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
  },
  aksiDetail: {
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r2,
    gap: ruang.r2,
  },
  kartuKonfirmasi: {
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
  barisKonfirmasi: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: ruang.r2,
  },
});
