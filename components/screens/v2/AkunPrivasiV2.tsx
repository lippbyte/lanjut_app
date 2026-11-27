import React, { useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useUnduhDataSaya } from '../../../hooks/useDataAkun';
import { usePersetujuan } from '../../../hooks/usePersetujuan';
import {
  TEKS_AKUN_PRIVASI_V2 as T,
  TEKS_MODE_TAMPILAN,
  bisaCobaLagiUnduh,
  emailTampilV2,
  pesanGalatUnduhV2,
} from '../../../lib/akunPrivasiV2';
import { kelolaDataAkunAktif } from '../../../lib/fiturApp';
import { keadaanKebijakan } from '../../../lib/kebijakanPrivasi';
import { useSesi } from '../../../providers/AuthProvider';
import { elevasi, garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, PesanStatus, Sentuh, Teks, Tombol } from '../../v2';

const KELOLA_DATA_AKUN = kelolaDataAkunAktif(Constants.expoConfig?.extra);

/**
 * Layar Akun & Privasi v2 (`/akun`, LANJUT_037, di balik EXPO_PUBLIC_NAVIGASI_V2 bersama
 * EXPO_PUBLIC_KELOLA_DATA_AKUN — keduanya mati bawaan).
 *
 * Susunan kartu dari atas:
 * 1. Akunku: nama tampilan, nama pengguna, dan email tampil utuh (bertumpuk penuh tanpa potongan) + tautan kebijakan privasi v1.
 * 2. Tampilan: kontrol segmen Ikuti sistem / Terang / Gelap dengan penanda tertulis ("Aktif") dan ikon centang (hanya lokal di perangkat, 031b).
 * 3. Datamu: tombol Unduh data saya dengan penjelasan jujur, memuat, berhasil, dan galat + Coba lagi.
 * 4. Hapus akun: kartu terpisah di bawah dengan penanda bahaya tertulis ("Tindakan permanen") dan gaya hati-hati yang tenang.
 * 5. Keluar: tombol sekunder jelas (memakai fungsi pembersihan AuthProvider yang sama dengan v1).
 */
export function AkunPrivasiV2() {
  const { pengguna, keluar } = useSesi();
  const router = useRouter();
  const { mode, warna, pilihan, ubahPilihan, saklarAktif: modeGelapAktif } = useTemaV2();
  const persetujuan = usePersetujuan();
  const unduh = useUnduhDataSaya();
  const [prosesKeluar, setProsesKeluar] = useState(false);

  if (!pengguna) return null;

  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const perluTerima =
    persetujuan.data != null && !['diterima', 'tidak_tersedia'].includes(keadaanKebijakan(persetujuan.data));

  const onKeluar = async () => {
    setProsesKeluar(true);
    await keluar();
  };

  return (
    <View style={s.wadah}>
      <Teks varian="h1">{T.judul}</Teks>

      {/* 1. Akunku */}
      <View
        style={StyleSheet.flatten([
          s.kartu,
          bayangan,
          { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
        ])}
      >
        <Teks varian="judulKecil">{T.kartuAkunku}</Teks>
        <View style={s.identitas}>
          <Teks varian="h2">{pengguna.nama_tampilan}</Teks>
          <Teks varian="badanKecil" warna="teksSekunder">
            {`@${pengguna.nama_pengguna}`}
          </Teks>
        </View>

        <View style={StyleSheet.flatten([s.blokEmail, { borderTopColor: warna.garisHalus }])}>
          <Teks varian="keterangan" warna="teksSekunder">
            {T.labelEmail}
          </Teks>
          <Teks varian="badanKecil" gaya={s.emailUtuh}>
            {emailTampilV2(pengguna.email)}
          </Teks>
        </View>

        <View style={StyleSheet.flatten([s.blokTautan, { borderTopColor: warna.garisHalus }])}>
          {perluTerima ? (
            <Tombol
              varian="sekunder"
              label={T.terimaKebijakan}
              penuh
              onPress={() => router.push('/terima-kebijakan' as any)}
            />
          ) : null}
          <Sentuh
            peran="link"
            label={T.kebijakanPrivasi}
            onPress={() => router.push('/kebijakan-privasi' as any)}
            gaya={({ ditekan }) => [
              s.tautanKebijakan,
              { backgroundColor: ditekan ? warna.permukaanLembut : warna.transparan },
            ]}
          >
            <Ikon nama="info" ukuran={ukuran.ikon} warna={warna.aksen} />
            <Teks varian="badanKecil" warna="aksen" garisBawah>
              {T.kebijakanPrivasi}
            </Teks>
          </Sentuh>
        </View>
      </View>

      {/* 2. Tampilan (hanya saat EXPO_PUBLIC_MODE_GELAP=1; lokal di perangkat, tidak ke server) */}
      {modeGelapAktif ? (
        <View
          style={StyleSheet.flatten([
            s.kartu,
            bayangan,
            { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="judulKecil">{TEKS_MODE_TAMPILAN.judul}</Teks>
          <View
            style={s.segmenWadah}
            accessibilityRole="radiogroup"
            accessibilityLabel={TEKS_MODE_TAMPILAN.judul}
          >
            {TEKS_MODE_TAMPILAN.opsi.map((o) => {
              const aktif = pilihan === o.nilai;
              return (
                <Sentuh
                  key={o.nilai}
                  peran="radio"
                  label={aktif ? `${o.label}, ${T.modeAktif}` : o.label}
                  terpilih={aktif}
                  dicentang={aktif}
                  onPress={() => ubahPilihan(o.nilai)}
                  gaya={({ ditekan }) => [
                    s.segmenItem,
                    {
                      backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.halaman,
                      borderColor: aktif ? warna.aksen : warna.garisKontrol,
                      borderWidth: aktif ? garis.fokus : garis.tipis,
                    },
                  ]}
                >
                  <Ikon
                    nama={o.ikon}
                    ukuran={ukuran.ikon}
                    warna={aktif ? warna.aksen : warna.teksSekunder}
                    bobot={aktif ? 'fill' : 'regular'}
                  />
                  <Teks
                    varian="keterangan"
                    warna={aktif ? 'aksen' : 'teks'}
                    rata="center"
                    gaya={aktif ? s.teksTebal : undefined}
                  >
                    {o.label}
                  </Teks>
                  {aktif ? (
                    <View style={s.penandaAktif}>
                      <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} />
                      <Teks varian="keterangan" warna="aksen" gaya={s.teksTebal}>
                        {T.modeAktif}
                      </Teks>
                    </View>
                  ) : null}
                </Sentuh>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* 3. Datamu (hanya saat EXPO_PUBLIC_KELOLA_DATA_AKUN=1) */}
      {KELOLA_DATA_AKUN ? (
        <View
          style={StyleSheet.flatten([
            s.kartu,
            bayangan,
            { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="judulKecil">{T.kartuDatamu}</Teks>
          <Teks varian="badanKecil" warna="teksSekunder">
            {T.penjelasUnduh}
          </Teks>
          <Tombol
            varian="utama"
            label={unduh.isPending ? T.unduhProses : T.unduh}
            memuat={unduh.isPending}
            penuh
            onPress={() => unduh.mutate()}
          />
          {unduh.isSuccess ? (
            <PesanStatus jenis="sukses" berlatar>
              {T.unduhSelesai}
            </PesanStatus>
          ) : null}
          {unduh.isError ? (
            <View style={s.galatWadah}>
              <PesanStatus jenis="galat" berlatar>
                {pesanGalatUnduhV2(unduh.error.kode)}
              </PesanStatus>
              {bisaCobaLagiUnduh(unduh.error.kode) ? (
                <Tombol varian="sekunder" label={T.cobaLagi} onPress={() => unduh.mutate()} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4. Hapus akun (kartu terpisah di bawah, tenang namun tegas tertulis) */}
      {KELOLA_DATA_AKUN ? (
        <View style={StyleSheet.flatten([s.pemisahBahaya, { borderTopColor: warna.garisHalus }])}>
          <View
            style={StyleSheet.flatten([
              s.kartu,
              s.kartuBahaya,
              bayangan,
              { backgroundColor: warna.permukaan, borderColor: warna.galat },
            ])}
          >
            <View style={s.barisPeringatan}>
              <Ikon nama="waspada" ukuran={ukuran.ikon} warna={warna.galat} />
              <Teks varian="keterangan" warna="galat" gaya={s.teksTebal}>
                {T.tandaPermanen}
              </Teks>
            </View>
            <Teks varian="judulKecil">{T.kartuHapus}</Teks>
            <Sentuh
              peran="button"
              label={T.bukaHapus}
              onPress={() => router.push('/hapus-akun' as any)}
              gaya={({ ditekan }) => [
                s.tombolBahaya,
                {
                  backgroundColor: ditekan ? warna.permukaanLembut : warna.galatLatar,
                  borderColor: warna.galat,
                },
              ]}
            >
              <Ikon nama="hapus" ukuran={ukuran.ikon} warna={warna.galat} />
              <Teks varian="tombol" warna="galat" rata="center">
                {T.bukaHapus}
              </Teks>
            </Sentuh>
          </View>
        </View>
      ) : null}

      {/* 5. Keluar (tombol sekunder jelas) */}
      <Tombol
        varian="sekunder"
        label={prosesKeluar ? T.keluarProses : T.keluar}
        memuat={prosesKeluar}
        penuh
        onPress={onKeluar}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wadah: {
    paddingHorizontal: ruang.tepi,
    paddingVertical: ruang.r3,
    gap: ruang.r3,
  },
  kartu: {
    padding: ruang.r3,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  identitas: {
    gap: ruang.r1,
  },
  blokEmail: {
    paddingTop: ruang.r2,
    borderTopWidth: garis.tipis,
    gap: ruang.r1,
    width: '100%',
    minWidth: 0,
  },
  emailUtuh: {
    width: '100%',
    flexShrink: 1,
  },
  blokTautan: {
    paddingTop: ruang.r2,
    borderTopWidth: garis.tipis,
    gap: ruang.r2,
  },
  tautanKebijakan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
    alignSelf: 'flex-start',
  },
  segmenWadah: {
    flexDirection: 'row',
    gap: ruang.r1,
  },
  segmenItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r2,
    paddingHorizontal: ruang.r1,
    borderRadius: radius.kecil,
  },
  penandaAktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
  },
  teksTebal: {
    fontFamily: keluargaHuruf.badanTebal,
  },
  galatWadah: {
    gap: ruang.r2,
  },
  pemisahBahaya: {
    marginTop: ruang.r2,
    paddingTop: ruang.r3,
    borderTopWidth: garis.tipis,
  },
  kartuBahaya: {
    borderWidth: garis.tipis,
  },
  barisPeringatan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
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
