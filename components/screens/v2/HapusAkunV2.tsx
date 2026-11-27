import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { useHapusAkun, useKirimKodeHapus } from '../../../hooks/useDataAkun';
import {
  TEKS_AKUN_PRIVASI_V2 as T,
  YANG_IKUT_TERHAPUS_V2,
  bisaPakaiKodeEmail,
  pesanGalatHapusV2,
  siapHapus,
  type MetodeKonfirmasi,
} from '../../../lib/akunPrivasiV2';
import { useSesi } from '../../../providers/AuthProvider';
import { elevasi, garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, Isian, PesanStatus, Sentuh, Teks, Tombol } from '../../v2';

const PERILAKU_PAPAN_KETIK = Platform.OS === 'ios' ? 'padding' : undefined;

/**
 * Layar konfirmasi hapus akun v2 (`/hapus-akun`, LANJUT_037, di balik EXPO_PUBLIC_NAVIGASI_V2
 * bersama EXPO_PUBLIC_KELOLA_DATA_AKUN).
 *
 * - Mempertahankan persis alur keamanan & kontrak API v1 (`useHapusAkun` → `DELETE /pengguna/saya`
 *   dengan `penegasan: 'HAPUS AKUN SAYA'` + konfirmasi identitas ulang, lalu `selesaiHapusAkun()`).
 * - Tidak mengirim permintaan apa pun sebelum kotak paham dicentang DAN identitas ulang terisi.
 * - Tenang, jujur, tanpa membujuk atau menakut-nakuti; tanda bahaya tertulis + ikon waspada.
 */
export function HapusAkunV2() {
  const { pengguna } = useSesi();
  const router = useRouter();
  const { mode, warna } = useTemaV2();
  const hapus = useHapusAkun();
  const kirimKode = useKirimKodeHapus();
  const [paham, setPaham] = useState(false);
  const [metode, setMetode] = useState<MetodeKonfirmasi>('sandi');
  const [kataSandi, setKataSandi] = useState('');
  const [kodeEmail, setKodeEmail] = useState('');
  const [belumLengkap, setBelumLengkap] = useState(false);

  if (!pengguna) return null;

  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/akun' as any));
  const alihMetode = (baru: MetodeKonfirmasi) => {
    setMetode(baru);
    setBelumLengkap(false);
    hapus.reset();
  };

  const kirim = () => {
    if (!siapHapus({ paham, metode, kataSandi, kodeEmail })) {
      setBelumLengkap(true);
      return;
    }
    setBelumLengkap(false);
    hapus.mutate({ metode, kataSandi, kodeEmail });
  };

  return (
    <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
      <View style={s.kepala}>
        <View style={s.barisPeringatan}>
          <Ikon nama="waspada" ukuran={ukuran.ikon} warna={warna.galat} />
          <Teks varian="keterangan" warna="galat" gaya={s.teksTebal}>
            {T.tidakBisaBatal}
          </Teks>
        </View>
        <Teks varian="h1">{T.kartuHapus}</Teks>
      </View>

      {/* Ringkasan hal yang ikut terhapus */}
      <View
        style={StyleSheet.flatten([
          s.kartu,
          bayangan,
          { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
        ])}
      >
        <Teks varian="judulKecil">{T.judulHilang}</Teks>
        <View style={s.daftar}>
          {YANG_IKUT_TERHAPUS_V2.map((butir) => (
            <Teks key={butir} varian="badanKecil" warna="teksSekunder">
              {`• ${butir}`}
            </Teks>
          ))}
        </View>
      </View>

      {/* Penegasan eksplisit & identitas ulang */}
      <View
        style={StyleSheet.flatten([
          s.kartu,
          bayangan,
          { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
        ])}
      >
        <Sentuh
          peran="checkbox"
          label={T.paham}
          dicentang={paham}
          onPress={() => {
            setPaham((v) => !v);
            setBelumLengkap(false);
          }}
          gaya={({ ditekan }) => [
            s.barisCentang,
            { backgroundColor: ditekan ? warna.permukaanLembut : warna.transparan },
          ]}
        >
          <View
            style={StyleSheet.flatten([
              s.kotakCentang,
              {
                borderColor: paham ? warna.aksen : warna.garisKontrol,
                backgroundColor: paham ? warna.aksen : warna.halaman,
              },
            ])}
          >
            {paham ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.teksPadaAksen} /> : null}
          </View>
          <View style={s.fleks}>
            <Teks varian="badanKecil">{T.paham}</Teks>
          </View>
        </Sentuh>

        {metode === 'sandi' ? (
          <Isian
            label={T.labelSandi}
            jenis="sandi"
            nilai={kataSandi}
            onUbah={(v) => {
              setKataSandi(v);
              setBelumLengkap(false);
            }}
            onKirim={kirim}
            kunciKirim="done"
          />
        ) : (
          <View style={s.blokKode}>
            <Tombol
              varian="sekunder"
              label={kirimKode.isPending ? T.kirimKodeProses : kirimKode.isSuccess ? T.kirimKodeLagi : T.kirimKode}
              memuat={kirimKode.isPending}
              penuh
              onPress={() => kirimKode.mutate()}
            />
            {kirimKode.isSuccess ? <PesanStatus jenis="sukses">{T.kodeTerkirim}</PesanStatus> : null}
            {kirimKode.isError ? (
              <PesanStatus jenis="galat" berlatar>
                {pesanGalatHapusV2(kirimKode.error.kode)}
              </PesanStatus>
            ) : null}
            <Isian
              label={T.labelKode}
              jenis="kode"
              nilai={kodeEmail}
              onUbah={(v) => {
                setKodeEmail(v.replace(/\D/g, '').slice(0, 6));
                setBelumLengkap(false);
              }}
              onKirim={kirim}
              kunciKirim="done"
            />
          </View>
        )}

        {bisaPakaiKodeEmail(pengguna) ? (
          <Tombol
            varian="teks"
            label={metode === 'sandi' ? T.alihKeKode : T.alihKeSandi}
            onPress={() => alihMetode(metode === 'sandi' ? 'kode' : 'sandi')}
          />
        ) : null}

        {belumLengkap ? (
          <PesanStatus jenis="galat" berlatar>
            {T.belumLengkap}
          </PesanStatus>
        ) : null}
        {hapus.isError ? (
          <PesanStatus jenis="galat" berlatar>
            {pesanGalatHapusV2(hapus.error.kode)}
          </PesanStatus>
        ) : null}
      </View>

      {/* Aksi: Batal dulu, lalu pemisah dan tombol destruktif tenang di bawah */}
      <Tombol varian="sekunder" label={T.batal} penuh nonaktif={hapus.isPending} onPress={kembali} />

      <View style={StyleSheet.flatten([s.pemisahBahaya, { borderTopColor: warna.garisHalus }])}>
        <Sentuh
          peran="button"
          label={hapus.isPending ? T.tombolHapusProses : T.tombolHapus}
          sibuk={hapus.isPending}
          onPress={kirim}
          gaya={({ ditekan }) => [
            s.tombolBahaya,
            {
              backgroundColor: ditekan ? warna.permukaanLembut : warna.galatLatar,
              borderColor: warna.galat,
            },
          ]}
        >
          {hapus.isPending ? (
            <ActivityIndicator color={warna.galat} />
          ) : (
            <Ikon nama="waspada" ukuran={ukuran.ikon} warna={warna.galat} />
          )}
          <Teks varian="tombol" warna="galat" rata="center">
            {hapus.isPending ? T.tombolHapusProses : T.tombolHapus}
          </Teks>
        </Sentuh>
      </View>
    </KeyboardAvoidingView>
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
  barisPeringatan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
  },
  teksTebal: {
    fontFamily: keluargaHuruf.badanTebal,
  },
  kartu: {
    padding: ruang.r3,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  daftar: {
    gap: ruang.r1,
  },
  barisCentang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
  },
  kotakCentang: {
    width: ukuran.ikonBesar,
    height: ukuran.ikonBesar,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleks: {
    flex: 1,
    minWidth: 0,
  },
  blokKode: {
    gap: ruang.r2,
  },
  pemisahBahaya: {
    paddingTop: ruang.r2,
    borderTopWidth: garis.tipis,
  },
  tombolBahaya: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r1,
    paddingHorizontal: ruang.r3,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
});
