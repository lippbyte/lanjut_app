import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import type { ApiError } from '../../../api/client';
import type { ButirBukti, FotoButir } from '../../../api/types';
import { useFotoButirV2, useHapusFotoV2, useUnggahFotoV2 } from '../../../hooks/useRekamJejakV2';
import { hapusBerkasSementara } from '../../../lib/fotoSementara';
import {
  TEKS_REKAM_JEJAK_V2 as T,
  batasFoto,
  bisaCobaLagi,
  pesanGalatPortofolio,
  siapkanFoto,
  teksBatasFotoV2,
  type FotoSiap,
  type SumberFoto,
} from '../../../lib/rekamJejakV2';
import { garis, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, PesanStatus, PlaceholderMemuat, Teks, Tombol } from '../../v2';

/**
 * Foto Rekam Jejak v2 (LANJUT_036): diambil lewat permintaan bertoken ke memori saja (`useFotoButirV2`
 * → `apiAmbilDataUri`, `cache: 'no-store'`), tanpa URL publik dan tanpa cache disk.
 * Teks alternatif selalu netral (`T.altFoto`) agar tidak membocorkan isi pribadi atau nama berkas.
 */
export function FotoTerlindungV2({
  butirId,
  fotoId,
  gayaGambar,
  kecil = false,
}: {
  butirId: string;
  fotoId: string;
  gayaGambar: StyleProp<ImageStyle>;
  kecil?: boolean;
}) {
  const { warna } = useTemaV2();
  const foto = useFotoButirV2(butirId, fotoId);

  if (foto.data) {
    return (
      <Image
        source={{ uri: foto.data }}
        style={gayaGambar}
        resizeMode={kecil ? 'cover' : 'contain'}
        accessibilityLabel={T.altFoto}
      />
    );
  }
  if (kecil || foto.isPending) {
    return (
      <View
        style={StyleSheet.flatten([
          gayaGambar,
          s.tempatFoto,
          { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
        ])}
      >
        {kecil ? (
          <Ikon nama="foto" ukuran={ukuran.ikon} warna={warna.teksSekunder} />
        ) : (
          <PlaceholderMemuat baris={2} label={T.memuatFoto} />
        )}
      </View>
    );
  }
  return (
    <View
      style={StyleSheet.flatten([
        gayaGambar,
        s.tempatFoto,
        s.tempatGalat,
        { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
      ])}
    >
      <PesanStatus jenis="galat">{T.fotoGagalMuat}</PesanStatus>
      <Tombol varian="sekunder" label={T.muatLagi} onPress={() => void foto.refetch()} />
    </View>
  );
}

function SatuFotoV2({ butirId, foto }: { butirId: string; foto: FotoButir }) {
  const { warna } = useTemaV2();
  const hapus = useHapusFotoV2(butirId);
  const [yakin, setYakin] = useState(false);

  return (
    <View style={s.satuFoto}>
      <FotoTerlindungV2 butirId={butirId} fotoId={foto.id} gayaGambar={s.gambarPenuh} />
      {yakin ? (
        <View
          style={StyleSheet.flatten([
            s.kartuKonfirmasi,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="badanKecil">{T.yakinHapusFoto}</Teks>
          {hapus.isError ? <PesanStatus jenis="galat">{T.hapusGagal}</PesanStatus> : null}
          <View style={s.barisAksi}>
            <Tombol varian="teks" label={T.batal} nonaktif={hapus.isPending} onPress={() => setYakin(false)} />
            <Tombol varian="sekunder" label={T.yaHapus} memuat={hapus.isPending} onPress={() => hapus.mutate(foto.id)} />
          </View>
        </View>
      ) : (
        <Tombol varian="teks" label={T.hapusFoto} onPress={() => setYakin(true)} />
      )}
    </View>
  );
}

type TahapUnggah =
  | { nama: 'diam' }
  | { nama: 'izin_ditolak'; bisaTanyaLagi: boolean }
  | { nama: 'mengolah' }
  | { nama: 'mengunggah'; persen: number }
  | { nama: 'galat'; pesan: string }
  | { nama: 'gagal_kirim'; pesan: string; foto: FotoSiap };

/**
 * Seksi foto pada detail Rekam Jejak v2 (LANJUT_036):
 * - Peringatan privasi K29 selalu tampil di atas.
 * - Batas 3 per catatan, 30 per akun, dan 5 MB tampil sebelum dicoba.
 * - Konversi HEIC dan pengecilan lewat `siapkanFoto` (v1), kemajuan unggah, Coba lagi tanpa isi ulang,
 *   penanganan izin kamera ditolak, dan pembersihan berkas sementara saat selesai atau layar ditinggalkan.
 */
export function SeksiFotoV2({ butir, jumlahAkun }: { butir: ButirBukti; jumlahAkun: number }) {
  const { warna } = useTemaV2();
  const unggah = useUnggahFotoV2(butir.id);
  const [tahap, setTahap] = useState<TahapUnggah>({ nama: 'diam' });
  const belumTerkirim = useRef<FotoSiap | null>(null);

  useEffect(
    () => () => {
      if (belumTerkirim.current) hapusBerkasSementara(belumTerkirim.current.uri);
    },
    []
  );

  const buang = (foto: FotoSiap) => {
    belumTerkirim.current = null;
    hapusBerkasSementara(foto.uri);
  };

  const kirim = async (foto: FotoSiap) => {
    belumTerkirim.current = foto;
    setTahap({ nama: 'mengunggah', persen: 0 });
    try {
      await unggah(foto, (persen) => setTahap({ nama: 'mengunggah', persen }));
      buang(foto);
      setTahap({ nama: 'diam' });
    } catch (err) {
      const { kode, status } = err as ApiError;
      const pesan = pesanGalatPortofolio(kode, status);
      if (bisaCobaLagi(kode, status)) {
        setTahap({ nama: 'gagal_kirim', pesan, foto });
      } else {
        buang(foto);
        setTahap({ nama: 'galat', pesan });
      }
    }
  };

  const mulai = async (sumber: SumberFoto) => {
    const hasil = await siapkanFoto(sumber, () => setTahap({ nama: 'mengolah' }));
    if (hasil.status === 'siap') return kirim(hasil.foto);
    if (hasil.status === 'izin_ditolak') return setTahap({ nama: 'izin_ditolak', bisaTanyaLagi: hasil.bisaTanyaLagi });
    if (hasil.status === 'gagal') return setTahap({ nama: 'galat', pesan: pesanGalatPortofolio(hasil.kode) });
    setTahap({ nama: 'diam' });
  };

  const batas = batasFoto(butir.foto.length, jumlahAkun);
  const sibuk = tahap.nama === 'mengolah' || tahap.nama === 'mengunggah';

  return (
    <View style={s.seksi}>
      <Teks varian="h2">{T.judulFoto}</Teks>

      <View
        style={StyleSheet.flatten([
          s.peringatanPrivasi,
          { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
        ])}
      >
        <Ikon nama="info" ukuran={ukuran.ikon} warna={warna.aksen} />
        <View style={s.fleks}>
          <Teks varian="keterangan" warna="teksSekunder">
            {T.privasiFoto}
          </Teks>
        </View>
      </View>

      <Teks varian="keterangan" warna="teksSekunder">
        {teksBatasFotoV2(butir.foto.length, jumlahAkun)}
      </Teks>

      {butir.foto.map((f) => (
        <SatuFotoV2 key={f.id} butirId={butir.id} foto={f} />
      ))}

      {tahap.nama === 'mengolah' ? (
        <Teks varian="badanKecil" warna="teksSekunder">
          {T.mengolah}
        </Teks>
      ) : null}

      {tahap.nama === 'mengunggah' ? (
        <View style={s.kemajuan}>
          <Teks varian="keterangan" warna="teksSekunder">
            {`${T.mengunggah} ${tahap.persen}%`}
          </Teks>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={T.mengunggah}
            accessibilityValue={{ min: 0, max: 100, now: tahap.persen }}
            style={StyleSheet.flatten([s.relProgres, { backgroundColor: warna.permukaanLembut }])}
          >
            <View
              style={StyleSheet.flatten([
                s.isiProgres,
                { width: `${Math.min(100, Math.max(0, tahap.persen))}%`, backgroundColor: warna.aksen },
              ])}
            />
          </View>
        </View>
      ) : null}

      {tahap.nama === 'galat' ? (
        <PesanStatus jenis="galat" berlatar>
          {tahap.pesan}
        </PesanStatus>
      ) : null}

      {tahap.nama === 'gagal_kirim' ? (
        <View
          style={StyleSheet.flatten([
            s.kartuKonfirmasi,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <PesanStatus jenis="galat">{tahap.pesan}</PesanStatus>
          <View style={s.barisAksi}>
            <Tombol
              varian="teks"
              label={T.batal}
              onPress={() => {
                buang(tahap.foto);
                setTahap({ nama: 'diam' });
              }}
            />
            <Tombol varian="utama" label={T.cobaLagi} onPress={() => void kirim(tahap.foto)} />
          </View>
        </View>
      ) : null}

      {tahap.nama === 'izin_ditolak' ? (
        <View
          style={StyleSheet.flatten([
            s.kartuKonfirmasi,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <PesanStatus jenis="galat">{T.izinDitolak}</PesanStatus>
          <Tombol varian="sekunder" label={T.bukaPengaturan} penuh onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}

      {!batas.bolehTambah ? (
        <View
          style={StyleSheet.flatten([
            s.peringatanPrivasi,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <Ikon nama="waspada" ukuran={ukuran.ikon} warna={warna.teksSekunder} />
          <View style={s.fleks}>
            <Teks varian="keterangan" warna="teksSekunder">
              {batas.alasan === 'butir' ? T.penuhButir : T.penuhAkun}
            </Teks>
          </View>
        </View>
      ) : tahap.nama !== 'gagal_kirim' ? (
        <View style={s.aksiTambahFoto}>
          <View style={s.barisTombolFoto}>
            <View style={s.fleks}>
              <Tombol varian="sekunder" label={T.galeri} penuh memuat={sibuk} onPress={() => void mulai('galeri')} />
            </View>
            <View style={s.fleks}>
              <Tombol varian="sekunder" label={T.kamera} penuh memuat={sibuk} onPress={() => void mulai('kamera')} />
            </View>
          </View>
          <Teks varian="keterangan" warna="teksSekunder">
            {T.penjelasIzin}
          </Teks>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  seksi: {
    gap: ruang.r2,
  },
  fleks: {
    flex: 1,
    minWidth: 0,
  },
  peringatanPrivasi: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ruang.r1,
    padding: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
  },
  satuFoto: {
    gap: ruang.r1,
  },
  gambarPenuh: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.sedang,
  },
  tempatFoto: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: garis.tipis,
  },
  tempatGalat: {
    gap: ruang.r2,
    padding: ruang.r2,
  },
  kartuKonfirmasi: {
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
  },
  barisAksi: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: ruang.r2,
  },
  kemajuan: {
    gap: ruang.r1,
  },
  relProgres: {
    height: ruang.r1,
    borderRadius: radius.pil,
    overflow: 'hidden',
  },
  isiProgres: {
    height: '100%',
    borderRadius: radius.pil,
  },
  aksiTambahFoto: {
    gap: ruang.r1,
  },
  barisTombolFoto: {
    flexDirection: 'row',
    gap: ruang.r2,
  },
});
