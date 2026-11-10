import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';

import type { ApiError } from '../../api/client';
import type { ButirBukti, FotoButir } from '../../api/types';
import { useFotoButir, useHapusFoto, useUnggahFoto } from '../../hooks/usePortofolio';
import { hapusBerkasSementara } from '../../lib/fotoSementara';
import { TEKS_PORTOFOLIO as T, batasFoto, bisaCobaLagi, pesanGalatPortofolio, teksJumlahFoto } from '../../lib/portofolio';
import { siapkanFoto, type FotoSiap, type SumberFoto } from '../../lib/portofolioFoto';
import { color, radius, spacing, teks } from '../../theme/tokens';
import { BilahProgres, Kartu, Memuat, Peringatan, SeksiJudul, Tombol, gaya } from '../ui';
import { PesanGalat } from './auth/AuthUI';

/** Foto diambil dengan token dan ditampilkan dari memori. Lihat useFotoButir. */
export function FotoTerlindung({
  butirId,
  fotoId,
  gambar,
  kecil = false,
}: {
  butirId: string;
  fotoId: string;
  gambar: StyleProp<ImageStyle>;
  kecil?: boolean;
}) {
  const foto = useFotoButir(butirId, fotoId);
  if (foto.data) return <Image source={{ uri: foto.data }} style={gambar} resizeMode={kecil ? 'cover' : 'contain'} accessibilityLabel={T.judulFoto} />;
  if (kecil || foto.isPending) return <View style={[gambar, s.tempat]}>{kecil ? null : <Memuat />}</View>;
  return (
    <View style={[gambar, s.tempat, s.tempatGalat]}>
      <Text style={gaya.teksKecil}>{T.fotoGagalMuat}</Text>
      <Tombol label={T.muatLagi} varian="garis" kecil onPress={() => foto.refetch()} />
    </View>
  );
}

function SatuFoto({ butirId, foto }: { butirId: string; foto: FotoButir }) {
  const hapus = useHapusFoto(butirId);
  const [yakin, setYakin] = useState(false);
  return (
    <View style={s.satuFoto}>
      <FotoTerlindung butirId={butirId} fotoId={foto.id} gambar={s.gambar} />
      {yakin ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <Text style={gaya.teksBody}>{T.yakinHapusFoto}</Text>
          {hapus.isError ? <PesanGalat teks={T.hapusGagal} /> : null}
          <View style={s.aksi}>
            <Tombol label={T.batal} varian="hantu" onPress={() => setYakin(false)} />
            <Tombol label={T.yaHapus} proses={hapus.isPending} onPress={() => hapus.mutate(foto.id)} />
          </View>
        </Kartu>
      ) : (
        <Tombol label={T.hapusFoto} varian="hantu" kecil onPress={() => setYakin(true)} />
      )}
    </View>
  );
}

type Tahap =
  | { nama: 'diam' }
  | { nama: 'izin_ditolak'; bisaTanyaLagi: boolean }
  | { nama: 'mengolah' }
  | { nama: 'mengunggah'; persen: number }
  | { nama: 'galat'; pesan: string }
  | { nama: 'gagal_kirim'; pesan: string; foto: FotoSiap };

/** Batas tampil sebelum dicoba. Isian butir aman: foto dikirim terpisah sesudah butirnya tersimpan. */
export function BagianFoto({ butir, jumlahAkun }: { butir: ButirBukti; jumlahAkun: number }) {
  const unggah = useUnggahFoto(butir.id);
  const [tahap, setTahap] = useState<Tahap>({ nama: 'diam' });
  const belumTerkirim = useRef<FotoSiap | null>(null);

  // Meninggalkan layar dengan unggahan gagal: berkas sementaranya tidak dibiarkan tertinggal.
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
    <View style={s.bagian}>
      <SeksiJudul>{T.judulFoto}</SeksiJudul>
      <Peringatan>{T.privasiFoto}</Peringatan>
      <Text style={gaya.teksKecil}>{teksJumlahFoto(butir.foto.length, jumlahAkun)}</Text>

      {butir.foto.map((f) => (
        <SatuFoto key={f.id} butirId={butir.id} foto={f} />
      ))}

      {tahap.nama === 'mengolah' ? <Text style={gaya.teksKecil}>{T.mengolah}</Text> : null}
      {tahap.nama === 'mengunggah' ? (
        <View style={s.kemajuan}>
          <Text style={gaya.teksKecil}>{`${T.mengunggah} ${tahap.persen}%`}</Text>
          <BilahProgres selesai={tahap.persen} total={100} label={T.mengunggah} />
        </View>
      ) : null}
      {tahap.nama === 'galat' ? <PesanGalat teks={tahap.pesan} /> : null}
      {tahap.nama === 'gagal_kirim' ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <PesanGalat teks={tahap.pesan} />
          <View style={s.aksi}>
            <Tombol
              label={T.batal}
              varian="hantu"
              onPress={() => {
                buang(tahap.foto);
                setTahap({ nama: 'diam' });
              }}
            />
            <Tombol label={T.cobaLagi} onPress={() => kirim(tahap.foto)} />
          </View>
        </Kartu>
      ) : null}
      {tahap.nama === 'izin_ditolak' ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <Text style={gaya.teksBody}>{T.izinDitolak}</Text>
          <Tombol label={T.bukaPengaturan} varian="garis" penuh onPress={() => Linking.openSettings()} />
        </Kartu>
      ) : null}

      {!batas.bolehTambah ? (
        <Text style={gaya.teksKecil}>{batas.alasan === 'butir' ? T.penuhButir : T.penuhAkun}</Text>
      ) : tahap.nama !== 'gagal_kirim' ? (
        <>
          <Tombol label={T.galeri} varian="sekunder" penuh proses={sibuk} onPress={() => mulai('galeri')} />
          <Tombol label={T.kamera} varian="garis" penuh proses={sibuk} onPress={() => mulai('kamera')} />
          <Text style={s.penjelas}>{T.penjelasIzin}</Text>
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  bagian: { gap: spacing.s3 },
  satuFoto: { gap: spacing.s2 },
  gambar: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: color.ink050 },
  tempat: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.ink050 },
  tempatGalat: { gap: spacing.s2, padding: spacing.s3 },
  konfirmasi: { gap: spacing.s3 },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.s2 },
  kemajuan: { gap: spacing.s2 },
  penjelas: { ...teks.caption, color: color.textMuted },
});
