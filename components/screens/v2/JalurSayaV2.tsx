import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { DaftarTujuan, JalurMinat, Tujuan } from '../../../api/types';
import {
  useDataJalurSayaV2,
  useJedaJalurV2,
  usePerjalananV2,
  usePilihJalurV2,
  useRiwayatTujuanV2,
  useSimpanTujuanV2,
  useTandaiTercapaiV2,
} from '../../../hooks/useJalurSayaV2';
import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import {
  BATAS_TUJUAN,
  GALAT_ISIAN_TUJUAN,
  LABEL_STATUS_TUJUAN,
  TEKS_JALUR_SAYA_V2 as T,
  badanTujuan,
  galatMedanServerTujuan,
  jalurDisetujuiSaja,
  labelJalur,
  periksaIsianTujuan,
  pesanGalatJalurTujuan,
  susunKartuJalurV2,
  teksPeristiwaAmanV2,
  teksVersiTujuan,
  type GalatIsianTujuan,
  type KartuJalurDisetujuiV2,
  type KeadaanData,
} from '../../../lib/jalurSayaV2';
import { formatTanggal } from '../../../lib/linimasa';
import { elevasi, garis, keluargaHuruf, radius, ruang, tataLetak, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import {
  Ikon,
  Isian,
  Kartu,
  KeadaanGalat,
  KeadaanKosong,
  PesanStatus,
  PlaceholderMemuat,
  Sentuh,
  Teks,
  Tombol,
} from '../../v2';

const UKURAN_KOTAK_PILIH = ukuran.ikon + garis.fokus * 2;
const PERILAKU_PAPAN_KETIK = Platform.OS === 'ios' ? 'padding' : undefined;

/**
 * Layar Jalur Saya v2 (`/jalur-tujuan`, LANJUT_033, di balik EXPO_PUBLIC_JALUR_TUJUAN & EXPO_PUBLIC_NAVIGASI_V2).
 * - Kartu besar interaktif untuk setiap jalur disetujui (boleh memilih lebih dari satu, penanda tertulis "Dipilih").
 * - Jalur yang kembali draf tampil netral ("Jalur belum tersedia") dengan tombol "Jeda", tanpa id mentah atau teks draf.
 * - Kartu "Tujuanmu" dengan tombol "Ubah", batas panjang tetap, dan riwayat versi bernomor & berjam ("Lihat perubahan").
 * - Keadaan kosong jalur menampilkan maskot kelinci di dalam lingkaran `warna.latarMaskot` di kedua mode.
 */
export function JalurSayaV2() {
  const { warna } = useTemaV2();
  const kurangiGerak = useKurangiGerak();
  const { jalur, pilihan, tujuan, keadaan, muatUlang } = useDataJalurSayaV2();
  const pilihJalur = usePilihJalurV2();
  const jedaJalur = useJedaJalurV2();

  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [modalTujuan, setModalTujuan] = useState<{ awal?: Tujuan } | null>(null);
  const [perjalananTerbuka, setPerjalananTerbuka] = useState(false);

  if (keadaan !== 'siap') {
    return <KeadaanNonSiapV2 keadaan={keadaan} onCobaLagi={muatUlang} />;
  }

  const daftarJalurSah = jalurDisetujuiSaja(jalur.data);
  const kartuJalur = susunKartuJalurV2(daftarJalurSah, pilihan.data);
  const galatMutasiJalur = pilihJalur.error ?? jedaJalur.error;

  const alihKartuJalur = (k: KartuJalurDisetujuiV2) => {
    setPesanSukses(null);
    if (k.dipilih && k.pilihanAktifId) {
      jedaJalur.mutate(k.pilihanAktifId, {
        onSuccess: () => setPesanSukses(T.berhasilJedaJalur),
      });
    } else {
      pilihJalur.mutate(k.idJalur, {
        onSuccess: () => setPesanSukses(T.berhasilSimpanJalur),
      });
    }
  };

  const jedaKartuDraf = (pilihanId: string) => {
    setPesanSukses(null);
    jedaJalur.mutate(pilihanId, {
      onSuccess: () => setPesanSukses(T.berhasilJedaJalur),
    });
  };

  return (
    <View style={s.wadah}>
      <Teks varian="badan" warna="teksSekunder">
        {T.ringkasan}
      </Teks>

      {pesanSukses ? (
        <PesanStatus jenis="sukses" berlatar>
          {pesanSukses}
        </PesanStatus>
      ) : null}

      {galatMutasiJalur ? (
        <PesanStatus jenis="galat" berlatar>
          {pesanGalatJalurTujuan(galatMutasiJalur.kode)}
        </PesanStatus>
      ) : null}

      <View style={s.seksi}>
        {kartuJalur.drafAktif.map((d) => (
          <View
            key={d.pilihanId}
            style={StyleSheet.flatten([
              s.kartuDraf,
              { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
            ])}
          >
            <View style={s.isiFleks}>
              <Teks varian="judulKecil">{d.judul}</Teks>
              <Teks varian="badanKecil" warna="teksSekunder">
                {d.keterangan}
              </Teks>
            </View>
            <Tombol
              varian="sekunder"
              label={T.jeda}
              petunjuk={T.labelAksiJedaDraf}
              memuat={jedaJalur.isPending && jedaJalur.variables === d.pilihanId}
              onPress={() => jedaKartuDraf(d.pilihanId)}
            />
          </View>
        ))}

        {kartuJalur.disetujui.length === 0 ? (
          <KartuMaskotKosongV2 judul={T.kosongJalurJudul} teks={T.kosongJalurTeks} />
        ) : (
          kartuJalur.disetujui.map((k) => {
            const sibuk =
              (pilihJalur.isPending && pilihJalur.variables === k.idJalur) ||
              (jedaJalur.isPending && jedaJalur.variables === k.pilihanAktifId);
            return (
              <KartuPilihanJalurBesarV2
                key={k.idJalur}
                kartu={k}
                sibuk={sibuk}
                onTekan={() => alihKartuJalur(k)}
              />
            );
          })
        )}
      </View>

      <SeksiTujuanV2
        data={tujuan.data!}
        daftarJalur={daftarJalurSah}
        onTambah={() => {
          setPesanSukses(null);
          setModalTujuan({});
        }}
        onUbah={(awal) => {
          setPesanSukses(null);
          setModalTujuan({ awal });
        }}
        onBerhasilTercapai={() => setPesanSukses(T.berhasilTercapai)}
      />

      <View style={s.seksi}>
        <Sentuh
          peran="button"
          label={T.perjalananJudul}
          terbuka={perjalananTerbuka}
          onPress={() => setPerjalananTerbuka((v) => !v)}
          gaya={({ ditekan }) => [
            s.lipatTombol,
            {
              backgroundColor: ditekan ? warna.permukaanLembut : warna.permukaan,
              borderColor: warna.garisHalus,
            },
          ]}
        >
          <Teks varian="judulKecil" warna="teksSekunder" gaya={s.fleks}>
            {T.perjalananJudul}
          </Teks>
          <Ikon
            nama={perjalananTerbuka ? 'bawah' : 'panah'}
            ukuran={ukuran.ikon}
            warna={warna.teksSekunder}
          />
        </Sentuh>

        {perjalananTerbuka ? (
          <DaftarPerjalananV2
            daftarJalur={daftarJalurSah}
            jumlahPilihan={(pilihan.data ?? []).length}
          />
        ) : null}
      </View>

      <Modal
        visible={modalTujuan !== null}
        animationType={kurangiGerak ? 'none' : 'slide'}
        onRequestClose={() => setModalTujuan(null)}
      >
        <KeyboardAvoidingView
          behavior={PERILAKU_PAPAN_KETIK}
          style={StyleSheet.flatten([s.modalAkar, { backgroundColor: warna.halaman }])}
        >
          <View
            style={StyleSheet.flatten([
              s.modalBilahAtas,
              { backgroundColor: warna.permukaan, borderBottomColor: warna.garisHalus },
            ])}
          >
            <Teks varian="judulKecil" gaya={s.fleks}>
              {modalTujuan?.awal ? T.formJudulUbah : T.formJudulBaru}
            </Teks>
            <Tombol varian="teks" label={T.batal} onPress={() => setModalTujuan(null)} />
          </View>
          <ScrollView
            contentContainerStyle={s.modalGulir}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.modalKolom}>
              {modalTujuan ? (
                <FormTujuanV2
                  key={modalTujuan.awal?.id ?? 'baru'}
                  daftarJalur={daftarJalurSah}
                  awal={modalTujuan.awal}
                  onSelesai={() => {
                    setModalTujuan(null);
                    setPesanSukses(T.berhasilSimpanTujuan);
                  }}
                />
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/**
 * Layar rute langsung `/jalur-tujuan-tulis` saat `EXPO_PUBLIC_NAVIGASI_V2=1`.
 * Memakai komponen formulir yang sama agar tautan langsung maupun riwayat kembali tetap konsisten.
 */
export function TujuanTulisV2() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { jalur, tujuan, keadaan, muatUlang } = useDataJalurSayaV2();

  if (keadaan !== 'siap') {
    return <KeadaanNonSiapV2 keadaan={keadaan} onCobaLagi={muatUlang} />;
  }

  const daftarJalurSah = jalurDisetujuiSaja(jalur.data);
  const kembali = () => router.replace('/jalur-tujuan' as any);

  if (!id) {
    return (
      <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
        <FormTujuanV2 daftarJalur={daftarJalurSah} onSelesai={kembali} onBatal={kembali} />
      </KeyboardAvoidingView>
    );
  }

  const awal = tujuan.data!.tujuan.find((t) => t.id === id && t.status === 'aktif');
  if (!awal) {
    return (
      <KeadaanKosong
        judul={T.tidakDitemukanJudul}
        teks={T.tidakDitemukanTeks}
        aksi={{ label: T.kembaliKeJalur, onPress: kembali }}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={PERILAKU_PAPAN_KETIK} style={s.wadah}>
      <FormTujuanV2
        key={awal.id}
        daftarJalur={daftarJalurSah}
        awal={awal}
        onSelesai={kembali}
        onBatal={kembali}
      />
    </KeyboardAvoidingView>
  );
}

function KeadaanNonSiapV2({ keadaan, onCobaLagi }: { keadaan: KeadaanData; onCobaLagi: () => void }) {
  const router = useRouter();
  if (keadaan === 'memuat') {
    return (
      <View style={s.wadah}>
        <PlaceholderMemuat baris={2} label={T.memuatLabel} />
        <PlaceholderMemuat baris={3} label={T.memuatLabel} />
      </View>
    );
  }
  if (keadaan === 'fitur_mati') {
    return <KeadaanKosong judul={T.fiturMatiJudul} teks={T.fiturMatiTeks} />;
  }
  if (keadaan === 'perlu_kebijakan') {
    return (
      <KeadaanKosong
        judul={T.perluKebijakanJudul}
        teks={T.perluKebijakanTeks}
        aksi={{ label: T.bacaKebijakan, onPress: () => router.push('/terima-kebijakan' as any) }}
      />
    );
  }
  return <KeadaanGalat judul={T.galatJudul} pesan={T.galatPesan} onCobaLagi={onCobaLagi} />;
}

function KartuMaskotKosongV2({ judul, teks }: { judul: string; teks: string }) {
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
    </View>
  );
}

function KartuPilihanJalurBesarV2({
  kartu,
  sibuk,
  onTekan,
}: {
  kartu: KartuJalurDisetujuiV2;
  sibuk: boolean;
  onTekan: () => void;
}) {
  const { mode, warna } = useTemaV2();
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const petunjuk = kartu.dipilih ? T.petunjukKetukJeda : T.petunjukKetukPilih;

  return (
    <Sentuh
      peran="checkbox"
      label={kartu.judul}
      petunjuk={petunjuk}
      dicentang={kartu.dipilih}
      sibuk={sibuk}
      onPress={onTekan}
      gaya={({ ditekan }) => [
        s.kartuJalurBesar,
        bayangan,
        {
          backgroundColor: kartu.dipilih || ditekan ? warna.permukaanLembut : warna.permukaan,
          borderColor: kartu.dipilih ? warna.aksen : warna.garisKontrol,
          borderWidth: kartu.dipilih ? garis.fokus : garis.tipis,
        },
      ]}
    >
      <View
        style={StyleSheet.flatten([
          s.kotakPilih,
          {
            borderColor: kartu.dipilih ? warna.aksen : warna.garisKontrol,
            backgroundColor: kartu.dipilih ? warna.aksen : warna.transparan,
          },
        ])}
      >
        {kartu.dipilih ? (
          <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.teksPadaAksen} />
        ) : null}
      </View>

      <View style={s.isiFleks}>
        <View style={s.barisJudulKartu}>
          <Teks varian="judulKecil" gaya={s.fleks}>
            {kartu.judul}
          </Teks>
          {kartu.dipilih ? (
            <View
              style={StyleSheet.flatten([
                s.lencanaDipilih,
                { backgroundColor: warna.halaman, borderColor: warna.aksen },
              ])}
            >
              <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} />
              <Teks varian="keterangan" warna="aksen" gaya={s.teksTebal}>
                {T.penandaDipilih}
              </Teks>
            </View>
          ) : null}
        </View>
        <Teks varian="badanKecil" warna="teksSekunder">
          {kartu.ringkasan}
        </Teks>
      </View>
    </Sentuh>
  );
}

function SeksiTujuanV2({
  data,
  daftarJalur,
  onTambah,
  onUbah,
  onBerhasilTercapai,
}: {
  data: DaftarTujuan;
  daftarJalur: readonly JalurMinat[];
  onTambah: () => void;
  onUbah: (awal: Tujuan) => void;
  onBerhasilTercapai: () => void;
}) {
  const { warna } = useTemaV2();
  const belumAdaTujuan = data.tujuan.length === 0;
  const namaProdiAman = data.prodi_impian?.nama?.trim() || T.prodiBelumTersedia;

  return (
    <View style={s.seksi}>
      <View style={s.barisJudulSeksi}>
        <Teks varian="h2" gaya={s.fleks}>
          {T.tujuanJudul}
        </Teks>
        {!belumAdaTujuan ? (
          <Tombol varian="teks" label={T.tambahTujuan} onPress={onTambah} />
        ) : null}
      </View>

      {data.prodi_impian ? (
        <Kartu
          varian="lembut"
          judul={namaProdiAman}
          keterangan={T.prodiKeterangan}
        />
      ) : null}

      {belumAdaTujuan ? (
        <View
          style={StyleSheet.flatten([
            s.kartuTujuanKosong,
            { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="badanKecil" warna="teksSekunder">
            {T.kosongTujuanTeks}
          </Teks>
          <View style={s.barisAksiKiri}>
            <Tombol varian="utama" label={T.tulisTujuan} onPress={onTambah} />
          </View>
        </View>
      ) : (
        data.tujuan.map((t) => (
          <KartuSatuTujuanV2
            key={t.id}
            tujuan={t}
            daftarJalur={daftarJalur}
            onUbah={() => onUbah(t)}
            onBerhasilTercapai={onBerhasilTercapai}
          />
        ))
      )}
    </View>
  );
}

function KartuSatuTujuanV2({
  tujuan,
  daftarJalur,
  onUbah,
  onBerhasilTercapai,
}: {
  tujuan: Tujuan & { jumlah_versi: number };
  daftarJalur: readonly JalurMinat[];
  onUbah: () => void;
  onBerhasilTercapai: () => void;
}) {
  const { mode, warna } = useTemaV2();
  const tercapai = useTandaiTercapaiV2();
  const [bukaRiwayat, setBukaRiwayat] = useState(false);

  const labelJalurTerkait = labelJalur(tujuan.jalur_minat_id, daftarJalur);
  const labelTarget = tujuan.target_pada ? `${T.targetAwalan} ${formatTanggal(tujuan.target_pada)}` : null;
  const meta = [labelJalurTerkait, labelTarget].filter(Boolean).join(' · ');
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;
  const labelTombolRiwayat = bukaRiwayat ? T.tutupRiwayat : T.lihatRiwayat;

  return (
    <View
      style={StyleSheet.flatten([
        s.kartuTujuan,
        bayangan,
        { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
      ])}
    >
      <View style={s.barisJudulKartu}>
        <Teks varian="judulKecil" gaya={s.fleks}>
          {tujuan.judul}
        </Teks>
        <View
          style={StyleSheet.flatten([
            s.lencanaStatus,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="keterangan" warna="teksSekunder">
            {LABEL_STATUS_TUJUAN[tujuan.status]}
          </Teks>
        </View>
      </View>

      {meta ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {meta}
        </Teks>
      ) : null}

      {tujuan.uraian ? <Teks varian="badanKecil">{tujuan.uraian}</Teks> : null}

      {tercapai.isError ? (
        <PesanStatus jenis="galat">{pesanGalatJalurTujuan(tercapai.error.kode)}</PesanStatus>
      ) : null}

      <View style={s.barisAksiTujuan}>
        {tujuan.status === 'aktif' ? (
          <>
            <Tombol
              varian="sekunder"
              label={T.ubahTujuan}
              petunjuk={tujuan.judul}
              onPress={onUbah}
            />
            <Tombol
              varian="teks"
              label={T.tandaiTercapai}
              memuat={tercapai.isPending}
              onPress={() => tercapai.mutate(tujuan.id, { onSuccess: onBerhasilTercapai })}
            />
          </>
        ) : null}

        {tujuan.jumlah_versi > 1 ? (
          <Tombol
            varian="teks"
            label={labelTombolRiwayat}
            onPress={() => setBukaRiwayat((v) => !v)}
          />
        ) : null}
      </View>

      {bukaRiwayat ? <DaftarRiwayatVersiV2 tujuanId={tujuan.id} /> : null}
    </View>
  );
}

function DaftarRiwayatVersiV2({ tujuanId }: { tujuanId: string }) {
  const { warna } = useTemaV2();
  const riwayat = useRiwayatTujuanV2(tujuanId, true);

  if (riwayat.isPending) {
    return <PlaceholderMemuat baris={2} label={T.memuatLabel} />;
  }
  if (riwayat.isError) {
    return <PesanStatus jenis="galat">{pesanGalatJalurTujuan(riwayat.error.kode)}</PesanStatus>;
  }

  const versiLama = riwayat.data.filter((v) => v.id !== tujuanId).reverse();
  return (
    <View style={StyleSheet.flatten([s.riwayatWadah, { borderTopColor: warna.garisHalus }])}>
      {versiLama.map((v) => (
        <Teks key={v.id} varian="keterangan" warna="teksSekunder">
          {teksVersiTujuan(v)}
        </Teks>
      ))}
    </View>
  );
}

function DaftarPerjalananV2({
  daftarJalur,
  jumlahPilihan,
}: {
  daftarJalur: readonly JalurMinat[];
  jumlahPilihan: number;
}) {
  const { warna } = useTemaV2();
  const perjalanan = usePerjalananV2(true);

  if (perjalanan.isPending) {
    return <PlaceholderMemuat baris={2} label={T.memuatLabel} />;
  }
  if (perjalanan.isError) {
    return <PesanStatus jenis="galat">{pesanGalatJalurTujuan(perjalanan.error.kode)}</PesanStatus>;
  }
  if (perjalanan.data.length === 0 && jumlahPilihan === 0) {
    return (
      <Teks varian="badanKecil" warna="teksSekunder">
        {T.perjalananKosong}
      </Teks>
    );
  }

  return (
    <View
      style={StyleSheet.flatten([
        s.perjalananWadah,
        { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
      ])}
    >
      {[...perjalanan.data].reverse().map((p, indeks) => (
        <View
          key={`${p.jenis}-${p.pilihan_id ?? p.tujuan_id}-${indeks}`}
          style={StyleSheet.flatten([
            s.peristiwaBaris,
            indeks > 0 && { borderTopWidth: garis.tipis, borderTopColor: warna.garisHalus },
          ])}
        >
          <Teks varian="keterangan" warna="teksSekunder">
            {formatTanggal(p.pada)}
          </Teks>
          <Teks varian="badanKecil">{teksPeristiwaAmanV2(p, daftarJalur)}</Teks>
        </View>
      ))}
    </View>
  );
}

function FormTujuanV2({
  daftarJalur,
  awal,
  onSelesai,
  onBatal,
}: {
  daftarJalur: readonly JalurMinat[];
  awal?: Tujuan;
  onSelesai: () => void;
  onBatal?: () => void;
}) {
  const { warna } = useTemaV2();
  const simpan = useSimpanTujuanV2();
  const [judul, setJudul] = useState(awal?.judul ?? '');
  const [uraian, setUraian] = useState(awal?.uraian ?? '');
  const [target, setTarget] = useState(awal?.target_pada ?? '');
  const [jalurId, setJalurId] = useState<string | null>(awal?.jalur_minat_id ?? null);
  const [galat, setGalat] = useState<GalatIsianTujuan>({});

  const idSah = new Set(daftarJalur.map((j) => j.id));
  const awalJalurDraf = Boolean(awal?.jalur_minat_id && !idSah.has(awal.jalur_minat_id));

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
        onSuccess: onSelesai,
        onError: (err) => setGalat(galatMedanServerTujuan(err.medan)),
      }
    );
  };

  const adaGalatMedan = Object.keys(galat).length > 0;

  return (
    <View style={s.formWadah}>
      {awal ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {T.formCatatanVersi}
        </Teks>
      ) : null}

      <Isian
        label={T.labelJudul}
        nilai={judul}
        onUbah={(v) => {
          setJudul(v);
          setGalat((g) => ({ ...g, judul: undefined, _: undefined }));
        }}
        maksPanjang={BATAS_TUJUAN.judul}
        fokusAwal={!awal}
        galat={galat.judul}
      />

      <View style={s.seksiPil}>
        <Teks varian="judulKecil">{T.labelJalur}</Teks>
        <View style={s.daftarPil} accessibilityRole="radiogroup">
          <PilihanRadioKecilV2
            label={T.tanpaJalur}
            aktif={jalurId === null}
            onPilih={() => {
              setJalurId(null);
              setGalat((g) => ({ ...g, _: undefined }));
            }}
          />
          {awalJalurDraf && awal?.jalur_minat_id ? (
            <PilihanRadioKecilV2
              label={T.jalurBelumTersedia}
              aktif={jalurId === awal.jalur_minat_id}
              onPilih={() => {
                setJalurId(awal.jalur_minat_id);
                setGalat((g) => ({ ...g, _: undefined }));
              }}
            />
          ) : null}
          {daftarJalur.map((j) => {
            const namaAman = labelJalur(j) ?? T.jalurBelumTersedia;
            return (
              <PilihanRadioKecilV2
                key={j.id}
                label={namaAman}
                aktif={jalurId === j.id}
                onPilih={() => {
                  setJalurId(j.id);
                  setGalat((g) => ({ ...g, _: undefined }));
                }}
              />
            );
          })}
        </View>
      </View>

      <Isian
        label={T.labelUraian}
        nilai={uraian}
        onUbah={(v) => {
          setUraian(v);
          setGalat((g) => ({ ...g, uraian: undefined, _: undefined }));
        }}
        maksPanjang={BATAS_TUJUAN.uraian}
        galat={galat.uraian}
      />

      <Isian
        label={T.labelTarget}
        petunjuk={T.petunjukTarget}
        nilai={target}
        onUbah={(v) => {
          setTarget(v);
          setGalat((g) => ({ ...g, target_pada: undefined, _: undefined }));
        }}
        maksPanjang={10}
        galat={galat.target_pada}
      />

      {galat._ ? <PesanStatus jenis="galat">{galat._}</PesanStatus> : null}
      {simpan.isError && !adaGalatMedan ? (
        <PesanStatus jenis="galat">{pesanGalatJalurTujuan(simpan.error.kode)}</PesanStatus>
      ) : null}

      <View
        style={StyleSheet.flatten([
          s.barisSimpanForm,
          { borderTopColor: warna.garisHalus },
        ])}
      >
        <Tombol varian="utama" label={T.simpan} memuat={simpan.isPending} onPress={kirim} />
        {onBatal ? <Tombol varian="teks" label={T.batal} onPress={onBatal} /> : null}
      </View>
    </View>
  );
}

function PilihanRadioKecilV2({
  label,
  aktif,
  onPilih,
}: {
  label: string;
  aktif: boolean;
  onPilih: () => void;
}) {
  const { warna } = useTemaV2();
  return (
    <Sentuh
      peran="radio"
      label={label}
      terpilih={aktif}
      dicentang={aktif}
      onPress={onPilih}
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
        {label}
      </Teks>
    </Sentuh>
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
  kartuJalurBesar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
  },
  kotakPilih: {
    width: UKURAN_KOTAK_PILIH,
    height: UKURAN_KOTAK_PILIH,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barisJudulKartu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: ruang.r1,
  },
  lencanaDipilih: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  kartuDraf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    padding: ruang.r2,
    borderRadius: radius.sedang,
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
  barisJudulSeksi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ruang.r2,
  },
  kartuTujuanKosong: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  barisAksiKiri: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  kartuTujuan: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  lencanaStatus: {
    paddingHorizontal: ruang.r1,
    borderRadius: radius.pil,
    borderWidth: garis.tipis,
  },
  barisAksiTujuan: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ruang.r2,
  },
  riwayatWadah: {
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r2,
    gap: ruang.r1,
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
  perjalananWadah: {
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    paddingHorizontal: ruang.r2,
  },
  peristiwaBaris: {
    paddingVertical: ruang.r2,
    gap: ruang.r1,
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
  barisSimpanForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ruang.r2,
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r2,
  },
});
