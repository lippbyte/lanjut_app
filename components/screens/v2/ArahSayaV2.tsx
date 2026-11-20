import React, { useCallback, useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Image, Modal, StyleSheet, View } from 'react-native';

import { useArahSaya } from '../../../hooks/useArahSaya';
import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import {
  TEKS_ARAH_SAYA,
  aksiKosongLangkah,
  daftarPintuArahSaya,
  teksSapaanV2,
} from '../../../lib/arahSaya';
import { discoverAktif, jalurTujuanAktif, kelolaDataAkunAktif, portofolioAktif } from '../../../lib/fiturApp';
import { ALAT_BELAJAR_V2 } from '../../../lib/navigasiV2';
import { useSesi } from '../../../providers/AuthProvider';
import { garis, radius, ruang, ukuran, warna } from '../../../theme/v2';
import { Ikon } from '../../ui/Ikon';
import { BarisDaftar, Kartu, KeadaanGalat, PlaceholderMemuat, Sentuh, Teks, Tombol } from '../../v2';
import { GerbangArahV2 } from './KecenderunganV2';

const EXTRA = Constants.expoConfig?.extra;
const SAKLAR = {
  discover: discoverAktif(EXTRA),
  jalurTujuan: jalurTujuanAktif(EXTRA),
  portofolio: portofolioAktif(EXTRA),
  kelolaDataAkun: kelolaDataAkunAktif(EXTRA),
};

const PINTU = daftarPintuArahSaya(SAKLAR);
const AKSI_KOSONG = aksiKosongLangkah(SAKLAR.discover);

/**
 * Layar Arah Saya (Beranda v2, LANJUT_031, saklar EXPO_PUBLIC_NAVIGASI_V2).
 * Menjawab satu pertanyaan: "Aku sedang menuju ke mana, dan apa langkah berikutnya?"
 * - Komponen dan token hanya dari v2 (`components/v2`, `theme/v2`).
 * - Teks tetap maksimal 40 kata per layar, seluruhnya dari `lib/arahSaya.ts`.
 * - Memakai ulang layar kecenderungan `GerbangArahV2` (030) tanpa menulis ulang.
 */
export function ArahSayaV2() {
  const router = useRouter();
  const { pengguna } = useSesi();
  const kurangiGerak = useKurangiGerak();
  const [bukaArah, setBukaArah] = useState(false);
  const [alatTerbuka, setAlatTerbuka] = useState(false);

  const tutupArah = useCallback(() => setBukaArah(false), []);
  const data = useArahSaya(tutupArah);

  const bukaChipArah = () => {
    if (SAKLAR.jalurTujuan) router.push('/jalur-tujuan' as any);
    else setBukaArah(true);
  };

  return (
    <View style={s.wadah}>
      <Teks varian="h1" baris={2}>
        {teksSapaanV2(pengguna)}
      </Teks>

      {data.memuat ? (
        <View style={s.seksi}>
          <PlaceholderMemuat baris={2} label={TEKS_ARAH_SAYA.memuatLabel} />
          <PlaceholderMemuat baris={3} label={TEKS_ARAH_SAYA.memuatLabel} />
        </View>
      ) : data.galatJaringan ? (
        <KeadaanGalat
          judul={TEKS_ARAH_SAYA.galatJudul}
          pesan={TEKS_ARAH_SAYA.galatPesan}
          onCobaLagi={data.muatUlang}
        />
      ) : (
        <>
          <View style={s.seksi}>
            <Teks varian="h2">{TEKS_ARAH_SAYA.arahkuJudul}</Teks>
            {data.arahku.keadaan === 'ada_jalur' ? (
              <View style={s.daftarChip}>
                {data.arahku.chip.map((c) => (
                  <Sentuh
                    key={c.id}
                    peran="button"
                    label={c.label}
                    onPress={bukaChipArah}
                    gaya={({ ditekan }) => [s.chip, ditekan && s.chipTekan]}
                  >
                    <Teks varian="badanKecil" warna="teks">
                      {c.label}
                    </Teks>
                    <Ikon nama="panah" ukuran={ukuran.ikon} warna={warna.aksen} />
                  </Sentuh>
                ))}
              </View>
            ) : data.arahku.keadaan === 'belum_tahu' ? (
              <View style={s.barisBelumTahu}>
                <Teks varian="badanKecil" warna="teksSekunder" gaya={s.fleks}>
                  {TEKS_ARAH_SAYA.belumTahu}
                </Teks>
                <Tombol varian="teks" label={TEKS_ARAH_SAYA.ubahArah} onPress={() => setBukaArah(true)} />
              </View>
            ) : (
              <Kartu
                varian="lembut"
                judul={TEKS_ARAH_SAYA.pilihArahmu}
                onPress={() => setBukaArah(true)}
              />
            )}
          </View>

          <View style={s.seksi}>
            <Teks varian="h2">{TEKS_ARAH_SAYA.langkahJudul}</Teks>
            {data.langkah ? (
              <Kartu
                varian="biasa"
                judul={data.langkah.judul}
                keterangan={data.langkah.keterangan}
                onPress={() => router.push(data.langkah!.href as any)}
              />
            ) : (
              <View style={s.kosongKartu}>
                <View style={s.lingkaranMaskot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Image
                    source={require('../../../assets/mascot-blue.png')}
                    style={s.maskot}
                    resizeMode="contain"
                    accessible={false}
                  />
                </View>
                <Teks varian="judulKecil" rata="center">
                  {TEKS_ARAH_SAYA.kosongJudul}
                </Teks>
                <Teks varian="badanKecil" warna="teksSekunder" rata="center">
                  {TEKS_ARAH_SAYA.kosongTeks}
                </Teks>
                <Tombol
                  varian="utama"
                  label={AKSI_KOSONG.label}
                  onPress={() => router.push(AKSI_KOSONG.href as any)}
                />
              </View>
            )}
          </View>

          <View style={s.seksi}>
            {PINTU.map((p) =>
              p.bobot === 'utama' ? (
                <View key={p.id} style={s.kartuUtamaWadah}>
                  <Kartu
                    varian="brand"
                    judul={p.judul}
                    keterangan={p.keterangan}
                    onPress={() => router.push(p.href as any)}
                  />
                </View>
              ) : (
                <Kartu
                  key={p.id}
                  varian="biasa"
                  judul={p.judul}
                  keterangan={p.keterangan}
                  onPress={() => router.push(p.href as any)}
                />
              )
            )}
          </View>

          <View style={s.seksi}>
            <Sentuh
              peran="button"
              label={TEKS_ARAH_SAYA.alatBelajarJudul}
              terbuka={alatTerbuka}
              onPress={() => setAlatTerbuka((v) => !v)}
              gaya={({ ditekan }) => [s.lipatTombol, ditekan && s.chipTekan]}
            >
              <Teks varian="judulKecil" gaya={s.fleks}>
                {TEKS_ARAH_SAYA.alatBelajarJudul}
              </Teks>
              <Ikon nama={alatTerbuka ? 'kembali' : 'panah'} ukuran={ukuran.ikon} warna={warna.teksSekunder} />
            </Sentuh>
            {alatTerbuka ? (
              <View style={s.daftarAlat}>
                {ALAT_BELAJAR_V2.map((a) => (
                  <BarisDaftar
                    key={a.id}
                    judul={a.label}
                    onPress={() => router.push(a.href as any)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </>
      )}

      <Modal
        visible={bukaArah}
        animationType={kurangiGerak ? 'none' : 'slide'}
        onRequestClose={tutupArah}
      >
        <View style={s.modalWadah}>
          <View style={s.modalBar}>
            <Tombol varian="teks" label={TEKS_ARAH_SAYA.tutupArah} onPress={tutupArah} />
          </View>
          <View style={s.fleks}>
            <GerbangArahV2 arah={data.arahModal} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wadah: {
    paddingHorizontal: ruang.tepi,
    paddingVertical: ruang.r3,
    gap: ruang.r3,
  },
  seksi: {
    gap: ruang.r2,
  },
  fleks: {
    flex: 1,
  },
  daftarChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ruang.r1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaanLembut,
    borderWidth: garis.tipis,
    borderColor: warna.aksen,
  },
  chipTekan: {
    backgroundColor: warna.brand,
  },
  barisBelumTahu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.sedang,
    backgroundColor: warna.permukaan,
    borderWidth: garis.tipis,
    borderColor: warna.garisHalus,
  },
  kosongKartu: {
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r3,
    borderRadius: radius.sedang,
    backgroundColor: warna.permukaan,
    borderWidth: garis.tipis,
    borderColor: warna.garisHalus,
  },
  lingkaranMaskot: {
    width: ukuran.lingkaranIkon,
    height: ukuran.lingkaranIkon,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaanLembut,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskot: {
    width: ukuran.ikonBesar,
    height: ukuran.ikonBesar,
  },
  kartuUtamaWadah: {
    borderRadius: radius.sedang,
    borderWidth: garis.fokus,
    borderColor: warna.aksen,
  },
  lipatTombol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.sedang,
    backgroundColor: warna.permukaan,
    borderWidth: garis.tipis,
    borderColor: warna.garisHalus,
  },
  daftarAlat: {
    borderRadius: radius.sedang,
    backgroundColor: warna.permukaan,
    borderWidth: garis.tipis,
    borderColor: warna.garisHalus,
    paddingHorizontal: ruang.r2,
  },
  modalWadah: {
    flex: 1,
    backgroundColor: warna.halaman,
  },
  modalBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: ruang.tepi,
    paddingTop: ruang.r2,
    backgroundColor: warna.halaman,
  },
});
