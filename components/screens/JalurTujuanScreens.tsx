import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { DaftarTujuan, JalurMinat, Tujuan } from '../../api/types';
import {
  useDaftarJalur,
  useDaftarTujuan,
  useJedaJalur,
  usePerjalanan,
  usePilihanJalur,
  usePilihJalur,
  useRiwayatTujuan,
  useSimpanTujuan,
  useTandaiTercapai,
} from '../../hooks/useJalurTujuan';
import {
  BATAS_TUJUAN,
  GALAT_ISIAN_TUJUAN,
  LABEL_STATUS_TUJUAN,
  TEKS_JALUR_TUJUAN as T,
  badanTujuan,
  galatMedanServerTujuan,
  keadaanData,
  periksaIsianTujuan,
  pesanGalatJalurTujuan,
  susunJalur,
  teksPeristiwa,
  type GalatIsianTujuan,
  type KeadaanData,
} from '../../lib/jalurTujuan';
import { formatTanggal } from '../../lib/linimasa';
import { color, font, spacing, teks } from '../../theme/tokens';
import { Kartu, Kepala, Kosong, Lencana, Memuat, Peringatan, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';

/**
 * Jalur & Tujuan (LANJUT_023 seri v2). DRAF, belum disetujui: semua teks dari lib/jalurTujuan.ts
 * (docs/draf-teks-jalur-tujuan.md), nama dan deskripsi jalur dari server (status_teks draf).
 *
 * Tidak ada tombol hapus: memilih ulang, menjeda, dan memperbarui tujuan selalu menambah riwayat.
 * Formulir membaca tujuan dari daftar, jadi id milik akun lain tampil sebagai "tidak ditemukan".
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

/** Daftar jalur menentukan keadaan: 404 di sana berarti saklar server mati. */
function useDataLayar() {
  const jalur = useDaftarJalur();
  const pilihan = usePilihanJalur();
  const tujuan = useDaftarTujuan();
  const semua = [jalur, pilihan, tujuan];
  const galat = semua.find((q) => q.error)?.error ?? null;
  const keadaan = keadaanData({ isPending: semua.some((q) => q.isPending), galat });
  const cobaLagi = () => semua.forEach((q) => q.refetch());
  return { jalur, pilihan, tujuan, keadaan, cobaLagi };
}

function namaJalurDari(jalur: readonly JalurMinat[]) {
  return (id: string | null) => jalur.find((j) => j.id === id)?.nama ?? '';
}

export function JalurTujuanScreen() {
  const router = useRouter();
  const { jalur, pilihan, tujuan, keadaan, cobaLagi } = useDataLayar();
  if (keadaan !== 'siap') return <KeadaanLayar keadaan={keadaan} onCoba={cobaLagi} />;

  const daftarJalur = jalur.data!;
  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.judul} pengantar={T.pengantar} />
      <View style={s.baris}>
        <Lencana varian="neutral">{T.labelDraf}</Lencana>
      </View>

      <BagianJalur jalur={daftarJalur} />

      <SeksiJudul>{T.bagianTujuan}</SeksiJudul>
      <Tombol label={T.tambahTujuan} besar penuh onPress={() => router.push('/jalur-tujuan-tulis' as any)} />
      <DaftarTujuanSaya data={tujuan.data!} namaJalur={namaJalurDari(daftarJalur)} />

      <SeksiJudul>{T.bagianPerjalanan}</SeksiJudul>
      <Perjalanan namaJalur={namaJalurDari(daftarJalur)} jumlahPilihan={pilihan.data!.length} />
    </View>
  );
}

function BagianJalur({ jalur }: { jalur: readonly JalurMinat[] }) {
  const pilihan = usePilihanJalur();
  const pilih = usePilihJalur();
  const jeda = useJedaJalur();
  const galat = pilih.error ?? jeda.error;
  return (
    <>
      <SeksiJudul>{T.bagianJalur}</SeksiJudul>
      {jalur.length === 0 ? (
        <Text style={s.keterangan}>{T.jalurBelumTersedia}</Text>
      ) : (
        <Text style={gaya.teksBody}>{T.petunjukJalur}</Text>
      )}
      {galat ? <PesanGalat teks={pesanGalatJalurTujuan(galat.kode)} /> : null}
      <View style={s.daftar}>
        {susunJalur(jalur, pilihan.data ?? []).map(({ jalur: j, aktif, jumlahBabak }) => (
          <Kartu key={j.id} style={s.kartu}>
            <View style={s.baris}>
              <Text style={s.judulKartu}>{j.nama}</Text>
              {aktif ? <Lencana>{T.sedangDijalani}</Lencana> : null}
            </View>
            <Text style={s.keterangan}>{j.deskripsi_singkat}</Text>
            {aktif ? (
              <Tombol label={T.jeda} varian="hantu" kecil proses={jeda.isPending && jeda.variables === aktif.id} onPress={() => jeda.mutate(aktif.id)} />
            ) : (
              <Tombol
                label={jumlahBabak > 0 ? T.pilihLagi : T.pilih}
                varian="garis"
                kecil
                proses={pilih.isPending && pilih.variables === j.id}
                onPress={() => pilih.mutate(j.id)}
              />
            )}
          </Kartu>
        ))}
      </View>
    </>
  );
}

function DaftarTujuanSaya({ data, namaJalur }: { data: DaftarTujuan; namaJalur: (id: string | null) => string }) {
  if (!data.prodi_impian && data.tujuan.length === 0) return <Text style={s.keterangan}>{T.kosongTujuan}</Text>;
  return (
    <View style={s.daftar}>
      {data.prodi_impian ? (
        <Kartu varian="soft" style={s.kartu}>
          <View style={s.baris}>
            <Text style={s.judulKartu}>{data.prodi_impian.nama ?? data.prodi_impian.prodi_id}</Text>
            <Lencana varian="resmi">{T.dariDataAkun}</Lencana>
          </View>
          <Text style={s.keterangan}>{`${T.prodiImpian}. ${T.ubahDiDataAkun}`}</Text>
        </Kartu>
      ) : null}
      {data.tujuan.map((t) => (
        <KartuTujuan key={t.id} tujuan={t} jumlahVersi={t.jumlah_versi} namaJalur={namaJalur} />
      ))}
    </View>
  );
}

function KartuTujuan({ tujuan, jumlahVersi, namaJalur }: { tujuan: Tujuan; jumlahVersi: number; namaJalur: (id: string | null) => string }) {
  const router = useRouter();
  const tercapai = useTandaiTercapai();
  const [bukaRiwayat, setBukaRiwayat] = useState(false);
  const keterangan = [namaJalur(tujuan.jalur_minat_id), tujuan.target_pada ? `${T.targetPrefix} ${formatTanggal(tujuan.target_pada)}` : '']
    .filter(Boolean)
    .join(' · ');
  return (
    <Kartu style={s.kartu}>
      <View style={s.baris}>
        <Text style={s.judulKartu}>{tujuan.judul}</Text>
        <Lencana varian="neutral">{LABEL_STATUS_TUJUAN[tujuan.status]}</Lencana>
      </View>
      {keterangan ? <Text style={s.keterangan}>{keterangan}</Text> : null}
      {tujuan.uraian ? <Text style={gaya.teksBody}>{tujuan.uraian}</Text> : null}
      {tercapai.isError ? <PesanGalat teks={pesanGalatJalurTujuan(tercapai.error.kode)} /> : null}
      <View style={s.aksi}>
        {tujuan.status === 'aktif' ? (
          <>
            <Tombol label={T.perbarui} varian="garis" kecil onPress={() => router.push({ pathname: '/jalur-tujuan-tulis' as any, params: { id: tujuan.id } })} />
            <Tombol label={T.tandaiTercapai} varian="hantu" kecil proses={tercapai.isPending} onPress={() => tercapai.mutate(tujuan.id)} />
          </>
        ) : null}
        {jumlahVersi > 1 ? (
          <Tombol label={bukaRiwayat ? T.tutupRiwayat : T.lihatRiwayat} varian="hantu" kecil onPress={() => setBukaRiwayat(!bukaRiwayat)} />
        ) : null}
      </View>
      {bukaRiwayat ? <RiwayatTujuan id={tujuan.id} /> : null}
    </Kartu>
  );
}

function RiwayatTujuan({ id }: { id: string }) {
  const riwayat = useRiwayatTujuan(id, true);
  if (riwayat.isPending) return <Memuat />;
  if (riwayat.isError) return <PesanGalat teks={pesanGalatJalurTujuan(riwayat.error.kode)} />;
  const lama = riwayat.data.filter((t) => t.id !== id).reverse();
  return (
    <View style={s.riwayat}>
      {lama.map((t) => (
        <Text key={t.id} style={s.keterangan}>{`${T.sebelumnya} (${formatTanggal(t.dibuat_pada)}): ${t.judul}`}</Text>
      ))}
    </View>
  );
}

function Perjalanan({ namaJalur, jumlahPilihan }: { namaJalur: (id: string | null) => string; jumlahPilihan: number }) {
  const perjalanan = usePerjalanan();
  if (perjalanan.isPending) return <Memuat />;
  if (perjalanan.isError) return <PesanGalat teks={pesanGalatJalurTujuan(perjalanan.error.kode)} />;
  if (perjalanan.data.length === 0 && jumlahPilihan === 0) return <Text style={s.keterangan}>{T.kosongPerjalanan}</Text>;
  // Terbaru di atas.
  return (
    <View style={s.daftar}>
      {[...perjalanan.data].reverse().map((p, i) => (
        <View key={`${p.jenis}-${p.pilihan_id ?? p.tujuan_id}-${i}`} style={s.peristiwa}>
          <Text style={s.tanggal}>{formatTanggal(p.pada)}</Text>
          <Text style={gaya.teksBody}>{teksPeristiwa(p, namaJalur)}</Text>
        </View>
      ))}
    </View>
  );
}

export function TujuanTulisScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { jalur, tujuan, keadaan, cobaLagi } = useDataLayar();
  if (keadaan !== 'siap') return <KeadaanLayar keadaan={keadaan} onCoba={cobaLagi} />;
  if (!id) return <FormTujuan jalur={jalur.data!} />;
  const awal = tujuan.data!.tujuan.find((t) => t.id === id && t.status === 'aktif');
  return awal ? <FormTujuan key={awal.id} jalur={jalur.data!} awal={awal} /> : <TidakDitemukan />;
}

function TidakDitemukan() {
  const router = useRouter();
  return (
    <View style={gaya.layarIsiRapat}>
      <Kosong
        judul={T.tidakDitemukanJudul}
        teks={T.tidakDitemukanTeks}
        aksi={<Tombol label={T.kembali} varian="sekunder" onPress={() => router.replace('/jalur-tujuan' as any)} />}
      />
    </View>
  );
}

/** Satu layar, satu tombol Simpan. Memperbarui membuat versi baru; yang lama tetap di riwayat. */
function FormTujuan({ jalur, awal }: { jalur: readonly JalurMinat[]; awal?: Tujuan }) {
  const router = useRouter();
  const simpan = useSimpanTujuan();
  const [judul, setJudul] = useState(awal?.judul ?? '');
  const [uraian, setUraian] = useState(awal?.uraian ?? '');
  const [target, setTarget] = useState(awal?.target_pada ?? '');
  const [jalurId, setJalurId] = useState<string | null>(awal?.jalur_minat_id ?? null);
  const [galat, setGalat] = useState<GalatIsianTujuan>({});

  const kirim = () => {
    const isian = { judul, uraian, target, jalur: jalurId };
    const periksa = periksaIsianTujuan(isian);
    const badan = badanTujuan(isian, awal);
    if (!badan && !Object.keys(periksa).length) periksa._ = GALAT_ISIAN_TUJUAN.tidakBerubah;
    setGalat(periksa);
    if (Object.keys(periksa).length || !badan) return;
    simpan.mutate(
      { id: awal?.id, badan },
      {
        onSuccess: () => router.replace('/jalur-tujuan' as any),
        onError: (err) => setGalat(galatMedanServerTujuan(err.medan)),
      }
    );
  };

  const adaGalatMedan = Object.keys(galat).length > 0;
  return (
    <View style={gaya.layarIsiRapat}>
      {awal ? <Text style={s.keterangan}>{T.catatanVersi}</Text> : null}
      <Field label={T.labelJudul} galat={galat.judul}>
        <Input value={judul} onChangeText={setJudul} maxLength={BATAS_TUJUAN.judul} autoCapitalize="sentences" autoFocus={!awal} />
      </Field>
      <Field label={T.labelJalur} labelTambahan={T.labelOpsional}>
        <DaftarOpsi>
          <OpsiPil label={T.tanpaJalur} aktif={jalurId === null} onPress={() => setJalurId(null)} />
          {jalur.map((j) => (
            <OpsiPil key={j.id} label={j.nama} aktif={jalurId === j.id} onPress={() => setJalurId(j.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label={T.labelUraian} labelTambahan={T.labelOpsional} galat={galat.uraian}>
        <Input value={uraian} onChangeText={setUraian} maxLength={BATAS_TUJUAN.uraian} multiline autoCapitalize="sentences" style={s.uraian} />
      </Field>
      <Field label={T.labelTarget} labelTambahan={T.labelOpsional} hint={T.petunjukTanggal} galat={galat.target_pada}>
        <Input value={target} onChangeText={setTarget} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      {galat._ ? <PesanGalat teks={galat._} /> : null}
      {simpan.isError && !adaGalatMedan ? <PesanGalat teks={pesanGalatJalurTujuan(simpan.error.kode)} /> : null}
      <Tombol label={simpan.isPending ? T.menyimpan : T.simpan} besar penuh proses={simpan.isPending} onPress={kirim} />
    </View>
  );
}

const s = StyleSheet.create({
  daftar: { gap: spacing.s3 },
  kartu: { gap: spacing.s2, padding: spacing.s3 },
  baris: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.s2 },
  judulKartu: { ...teks.title, fontFamily: font.semibold, color: color.textBody, flexShrink: 1 },
  keterangan: { ...teks.caption, color: color.textMuted },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  riwayat: { gap: spacing.s1, paddingTop: spacing.s2, borderTopWidth: 1, borderTopColor: color.ink100 },
  peristiwa: { gap: 2 },
  tanggal: { ...teks.caption, color: color.textMuted },
  uraian: { minHeight: 112, textAlignVertical: 'top' },
});
