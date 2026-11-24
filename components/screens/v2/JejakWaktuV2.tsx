import React, { useState } from 'react';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { useJejakWaktuV2 } from '../../../hooks/useJejakWaktuV2';
import { discoverAktif } from '../../../lib/fiturApp';
import {
  TEKS_JEJAK_WAKTU,
  aksiKosongJejakWaktu,
  type ButirJejakWaktu,
} from '../../../lib/jejakWaktuV2';
import { elevasi, garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { HeaderLayar, Ikon, KeadaanGalat, PlaceholderMemuat, Sentuh, Teks, Tombol } from '../../v2';

const DISCOVER_AKTIF = discoverAktif(Constants.expoConfig?.extra);
const AKSI_KOSONG = aksiKosongJejakWaktu(DISCOVER_AKTIF);

/**
 * Layar Jejak Waktu v2 (`/jejak-waktu`, LANJUT_032, saklar EXPO_PUBLIC_NAVIGASI_V2).
 * - Mengelompokkan jadwal menjadi Segera, Berikutnya, dan Sudah lewat (terlipat bawaan).
 * - Jarak waktu ditampilkan sebagai angka hari statis tanpa pewaktu berdetak.
 * - Tenggat mendekat dibedakan lewat bobot huruf dan penanda teks "Segera", tanpa merah/oranye.
 * - Keadaan kosong memakai maskot kelinci di dalam lingkaran `warna.latarMaskot` di kedua mode.
 */
export function JejakWaktuV2() {
  const { warna } = useTemaV2();
  const router = useRouter();
  const data = useJejakWaktuV2();
  const [terbukaId, setTerbukaId] = useState<string | null>(null);
  const [lewatTerbuka, setLewatTerbuka] = useState(false);

  const alihRincian = (id: string) => setTerbukaId((kini) => (kini === id ? null : id));
  const keLangkah = () => router.push('/langkah-saya' as any);

  const labelLipatLewat = `${TEKS_JEJAK_WAKTU.sudahLewatJudul} (${data.jadwal.sudahLewat.length})`;

  return (
    <View style={s.wadah}>
      <HeaderLayar judul={TEKS_JEJAK_WAKTU.judul} ringkasan={TEKS_JEJAK_WAKTU.ringkasan} />

      {data.memuat ? (
        <View style={s.seksi}>
          <PlaceholderMemuat baris={2} label={TEKS_JEJAK_WAKTU.memuatLabel} />
          <PlaceholderMemuat baris={3} label={TEKS_JEJAK_WAKTU.memuatLabel} />
        </View>
      ) : data.galatJaringan ? (
        <KeadaanGalat
          judul={TEKS_JEJAK_WAKTU.galatJudul}
          pesan={TEKS_JEJAK_WAKTU.galatPesan}
          onCobaLagi={data.muatUlang}
        />
      ) : data.jadwal.total === 0 ? (
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
            {TEKS_JEJAK_WAKTU.kosongJudul}
          </Teks>
          <Teks varian="badanKecil" warna="teksSekunder" rata="center">
            {TEKS_JEJAK_WAKTU.kosongTeks}
          </Teks>
          <Tombol
            varian="utama"
            label={AKSI_KOSONG.label}
            onPress={() => router.push(AKSI_KOSONG.href as any)}
          />
        </View>
      ) : (
        <>
          {data.jadwal.segera.length > 0 ? (
            <View style={s.seksi}>
              <Teks varian="h2">{TEKS_JEJAK_WAKTU.segeraJudul}</Teks>
              {data.jadwal.segera.map((b) => (
                <KartuButirWaktu
                  key={b.id}
                  butir={b}
                  segera
                  terbuka={terbukaId === b.id}
                  onTekan={() => alihRincian(b.id)}
                  onBukaLangkah={keLangkah}
                />
              ))}
            </View>
          ) : null}

          {data.jadwal.berikutnya.length > 0 ? (
            <View style={s.seksi}>
              <Teks varian="h2">{TEKS_JEJAK_WAKTU.berikutnyaJudul}</Teks>
              {data.jadwal.berikutnya.map((b) => (
                <KartuButirWaktu
                  key={b.id}
                  butir={b}
                  segera={false}
                  terbuka={terbukaId === b.id}
                  onTekan={() => alihRincian(b.id)}
                  onBukaLangkah={keLangkah}
                />
              ))}
            </View>
          ) : null}

          {data.jadwal.sudahLewat.length > 0 ? (
            <View style={s.seksi}>
              <Sentuh
                peran="button"
                label={labelLipatLewat}
                terbuka={lewatTerbuka}
                onPress={() => setLewatTerbuka((v) => !v)}
                gaya={({ ditekan }) => [
                  s.lipatTombol,
                  {
                    backgroundColor: ditekan ? warna.permukaanLembut : warna.permukaan,
                    borderColor: warna.garisHalus,
                  },
                ]}
              >
                <Teks varian="judulKecil" warna="teksSekunder" gaya={s.fleks}>
                  {labelLipatLewat}
                </Teks>
                <Ikon
                  nama={lewatTerbuka ? 'bawah' : 'panah'}
                  ukuran={ukuran.ikon}
                  warna={warna.teksSekunder}
                />
              </Sentuh>

              {lewatTerbuka ? (
                <View style={s.seksi}>
                  {data.jadwal.sudahLewat.map((b) => (
                    <KartuButirWaktu
                      key={b.id}
                      butir={b}
                      segera={false}
                      terbuka={terbukaId === b.id}
                      onTekan={() => alihRincian(b.id)}
                      onBukaLangkah={keLangkah}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function KartuButirWaktu({
  butir,
  segera,
  terbuka,
  onTekan,
  onBukaLangkah,
}: {
  butir: ButirJejakWaktu;
  segera: boolean;
  terbuka: boolean;
  onTekan: () => void;
  onBukaLangkah: () => void;
}) {
  const { mode, warna } = useTemaV2();
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const labelSentuh = `${butir.judul}, ${butir.tanggalTampil}`;
  const petunjukSentuh = terbuka ? TEKS_JEJAK_WAKTU.tutupRincian : TEKS_JEJAK_WAKTU.lihatRincian;

  const metaRingkas = [
    butir.jenisLabel,
    butir.terverifikasi ? TEKS_JEJAK_WAKTU.labelTerverifikasi : null,
    butir.diperiksaTeks,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={StyleSheet.flatten([
        s.kartuButir,
        bayangan,
        {
          backgroundColor: warna.permukaan,
          borderColor: segera ? warna.aksen : warna.garisHalus,
          borderWidth: segera ? garis.fokus : garis.tipis,
        },
      ])}
    >
      <Sentuh
        peran="button"
        label={labelSentuh}
        petunjuk={petunjukSentuh}
        terbuka={terbuka}
        onPress={onTekan}
        gaya={({ ditekan }) => [
          s.sentuhButir,
          ditekan && { backgroundColor: warna.permukaanLembut },
        ]}
      >
        <View style={s.isiButir}>
          <View style={s.barisAtas}>
            <View style={s.barisLencana}>
              {segera ? (
                <View
                  style={StyleSheet.flatten([
                    s.lencanaSegera,
                    { backgroundColor: warna.permukaanLembut, borderColor: warna.aksen },
                  ])}
                >
                  <Teks varian="keterangan" warna="aksen" gaya={s.teksTebal}>
                    {TEKS_JEJAK_WAKTU.lencanaSegera}
                  </Teks>
                </View>
              ) : null}
              <Teks varian="keterangan" warna="teksSekunder">
                {metaRingkas}
              </Teks>
            </View>
            {butir.jarakTeks ? (
              <Teks
                varian="keterangan"
                warna={segera ? 'aksen' : 'teksSekunder'}
                gaya={segera ? s.teksTebal : undefined}
              >
                {butir.jarakTeks}
              </Teks>
            ) : null}
          </View>

          <Teks varian={segera ? 'judulKecil' : 'badan'} warna="teks" gaya={segera ? undefined : s.teksTebal}>
            {butir.judul}
          </Teks>

          <Teks varian="badanKecil" warna="teksSekunder">
            {butir.tanggalTampil}
          </Teks>
        </View>

        <Ikon
          nama={terbuka ? 'bawah' : 'panah'}
          ukuran={ukuran.ikon}
          warna={segera ? warna.aksen : warna.teksSekunder}
        />
      </Sentuh>

      {terbuka ? (
        <View style={StyleSheet.flatten([s.rincianWadah, { borderTopColor: warna.garisHalus }])}>
          {butir.jalurSeleksi ? (
            <Teks varian="keterangan" warna="teksSekunder">
              {`${TEKS_JEJAK_WAKTU.awalanJalurSeleksi} ${butir.jalurSeleksi}`}
            </Teks>
          ) : null}
          {butir.sumberTeks ? (
            <Teks varian="keterangan" warna="teksSekunder">
              {`${TEKS_JEJAK_WAKTU.awalanSumber} ${butir.sumberTeks}`}
            </Teks>
          ) : null}
          {butir.catatanRincian ? (
            <Teks varian="badanKecil" warna="teks">
              {butir.catatanRincian}
            </Teks>
          ) : null}
          <View style={s.barisAksiRincian}>
            <Tombol varian="teks" label={TEKS_JEJAK_WAKTU.bukaLangkah} onPress={onBukaLangkah} />
          </View>
        </View>
      ) : null}
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
    borderRadius: radius.sedang,
    overflow: 'hidden',
  },
  sentuhButir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r2,
  },
  isiButir: {
    flex: 1,
    minWidth: 0,
    gap: ruang.r1,
  },
  barisAtas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: ruang.r1,
  },
  barisLencana: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ruang.r1,
    flex: 1,
    minWidth: 0,
  },
  lencanaSegera: {
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  rincianWadah: {
    borderTopWidth: garis.tipis,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r2,
    gap: ruang.r1,
  },
  barisAksiRincian: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  lipatTombol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
});
