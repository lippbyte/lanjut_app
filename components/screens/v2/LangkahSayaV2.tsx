import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import type {
  ButirDaftarPeriksa,
  EventSekolah,
  IsiEvent,
  JenisEvent,
  KategoriDaftarPeriksa,
} from '../../../api/types';
import { useLangkahSayaV2, type DataLangkahSayaV2 } from '../../../hooks/useLangkahSayaV2';
import { CATATAN_KATEGORI, type Progres } from '../../../lib/daftarPeriksa';
import {
  MAKS_MATERI,
  TEKS_EVENT,
  labelJenis,
  periksaIsianEvent,
  pilihanJenis,
  pisahEvent,
  selisihHari,
  tampilanMateri,
  teksHitungMundur,
} from '../../../lib/eventSekolah';
import {
  OPSI_JALUR_SELEKSI_LANGKAH,
  OPSI_KELAS_LANGKAH,
  TEKS_LANGKAH_SAYA,
  aksiKosongLangkahSaya,
  kalimatProgresLangkah,
  labelHapusButirPribadi,
  persenProgres,
  teksRingkasanProgres,
} from '../../../lib/langkahSayaV2';
import { formatTanggal } from '../../../lib/linimasa';
import { useSesi } from '../../../providers/AuthProvider';
import { elevasi, garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import {
  Ikon,
  Isian,
  Kartu,
  KeadaanGalat,
  PesanStatus,
  PlaceholderMemuat,
  Sentuh,
  Teks,
  Tombol,
} from '../../v2';

const UKURAN_KOTAK_CENTANG = ukuran.ikon + garis.fokus * 2;

/**
 * Layar Langkah Saya v2 (`/langkah-saya`, LANJUT_032, saklar EXPO_PUBLIC_NAVIGASI_V2).
 * - Reskin daftar periksa dengan satu progres ringkas di atas ("3 dari 8 selesai" + batang progres).
 * - Kotak centang >= 44 pt dengan `accessibilityRole="checkbox"` dan `accessibilityState.checked`.
 * - Butir selesai tampil tenang (tanpa coretan agresif); kalimat hangat singkat saat semua selesai.
 * - Keadaan kosong memakai maskot kelinci di dalam lingkaran `warna.latarMaskot` di kedua mode.
 * - Mempertahankan seluruh perilaku data v1 (`kemajuan_pengguna`, `butir_pribadi`, dan `event_sekolah` SMP).
 */
export function LangkahSayaV2() {
  const { warna } = useTemaV2();
  const router = useRouter();
  const { pengguna } = useSesi();
  const data = useLangkahSayaV2();
  const [konfirmasiHapusId, setKonfirmasiHapusId] = useState<string | null>(null);
  const [formEventSmp, setFormEventSmp] = useState<{ event?: EventSekolah } | null>(null);

  const aksiKosong = aksiKosongLangkahSaya({
    kelas: pengguna?.kelas,
    bisaEventSmp: data.smp.bisaEvent,
  });

  const jalankanAksiKosong = () => {
    if (aksiKosong.jenis === 'tambah_jadwal') {
      setFormEventSmp({});
    } else {
      router.push(aksiKosong.href as any);
    }
  };

  const tidakAdaIsiSamaSekali =
    data.kategori.length === 0 &&
    !data.perluPilihJalur &&
    (!data.smp.bisaEvent || (data.smp.daftarEvent.length === 0 && formEventSmp === null));

  return (
    <View style={s.wadah}>
      <Teks varian="badan" warna="teksSekunder">
        {TEKS_LANGKAH_SAYA.ringkasan}
      </Teks>

      {data.mode === 'kelas12' ? (
        <View
          style={StyleSheet.flatten([
            s.kartuSaring,
            { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
          ])}
        >
          <BarisPilSaring
            label={TEKS_LANGKAH_SAYA.saringKelasLabel}
            opsi={OPSI_KELAS_LANGKAH}
            tampil={(k) => `${TEKS_LANGKAH_SAYA.awalanKelas} ${k}`}
            aktif={data.saring.kelas}
            onPilih={data.saring.pilihKelas}
          />
          <BarisPilSaring
            label={TEKS_LANGKAH_SAYA.saringJalurLabel}
            opsi={OPSI_JALUR_SELEKSI_LANGKAH}
            tampil={(j) => j}
            aktif={data.saring.jalurSeleksi}
            onPilih={data.saring.pilihJalur}
          />
        </View>
      ) : null}

      {data.memuat ? (
        <View style={s.seksi}>
          <PlaceholderMemuat baris={2} label={TEKS_LANGKAH_SAYA.memuatLabel} />
          <PlaceholderMemuat baris={3} label={TEKS_LANGKAH_SAYA.memuatLabel} />
        </View>
      ) : data.galatJaringan ? (
        <KeadaanGalat
          judul={TEKS_LANGKAH_SAYA.galatJudul}
          pesan={TEKS_LANGKAH_SAYA.galatPesan}
          onCobaLagi={data.muatUlang}
        />
      ) : tidakAdaIsiSamaSekali ? (
        <KartuKosongMaskot
          judul={TEKS_LANGKAH_SAYA.kosongJudul}
          teks={TEKS_LANGKAH_SAYA.kosongTeks}
          labelTombol={aksiKosong.label}
          onTekan={jalankanAksiKosong}
        />
      ) : (
        <>
          {data.perluPilihJalur ? (
            <KartuKosongMaskot
              judul={TEKS_LANGKAH_SAYA.pilihJalurJudul}
              teks={TEKS_LANGKAH_SAYA.pilihJalurTeks}
            />
          ) : null}

          {data.kategori.length > 0 ? (
            <>
              <KartuProgresV2 progres={data.progres} />

              {data.galatAksiButir ? (
                <PesanStatus jenis="galat" berlatar>
                  {TEKS_LANGKAH_SAYA.galatSimpan}
                </PesanStatus>
              ) : null}

              {data.kategori.map((k) => (
                <KelompokLangkahV2
                  key={k.id}
                  kategori={k}
                  selesaiIds={data.selesaiIds}
                  pribadiIds={data.pribadiIds}
                  konfirmasiHapusId={konfirmasiHapusId}
                  sedangHapus={data.sedangHapusButir}
                  onAlih={data.alihButir}
                  onMintaHapus={(id) => setKonfirmasiHapusId(id)}
                  onBatalHapus={() => setKonfirmasiHapusId(null)}
                  onKonfirmasiHapus={(id) => {
                    data.hapusButirPribadi(id);
                    setKonfirmasiHapusId(null);
                  }}
                />
              ))}

              {data.adaCatatanSnpmb ? (
                <Teks varian="keterangan" warna="teksSekunder">
                  {TEKS_LANGKAH_SAYA.catatanSnpmbRingkas}
                </Teks>
              ) : null}

              <View style={s.barisPintuBawah}>
                <Tombol
                  varian="teks"
                  label={TEKS_LANGKAH_SAYA.pintuTambahPribadi}
                  onPress={() => router.push('/pilih-mapel' as any)}
                />
                <Tombol
                  varian="teks"
                  label={TEKS_LANGKAH_SAYA.pintuEksplorasi}
                  onPress={() => router.push('/eksplorasi-tujuan' as any)}
                />
              </View>
            </>
          ) : null}

          {data.smp.bisaEvent ? (
            <BagianJadwalSmpV2
              smp={data.smp}
              kelas={pengguna?.kelas ?? null}
              form={formEventSmp}
              setForm={setFormEventSmp}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function KartuKosongMaskot({
  judul,
  teks,
  labelTombol,
  onTekan,
}: {
  judul: string;
  teks: string;
  labelTombol?: string;
  onTekan?: () => void;
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
      {labelTombol && onTekan ? <Tombol varian="utama" label={labelTombol} onPress={onTekan} /> : null}
    </View>
  );
}

function KartuProgresV2({ progres }: { progres: Progres }) {
  const { mode, warna } = useTemaV2();
  const semuaSelesai = progres.status === 'selesai';
  const persen = persenProgres(progres);
  const ringkasan = teksRingkasanProgres(progres);
  const kalimat = kalimatProgresLangkah(progres.status);
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;

  return (
    <View
      style={StyleSheet.flatten([
        s.kartuProgres,
        bayangan,
        {
          backgroundColor: semuaSelesai ? warna.suksesLatar : warna.permukaan,
          borderColor: semuaSelesai ? warna.sukses : warna.garisHalus,
        },
      ])}
    >
      <View style={s.barisJudulProgres}>
        <Teks varian="judulKecil" warna="teks" gaya={s.fleks}>
          {ringkasan}
        </Teks>
        {semuaSelesai ? (
          <View style={s.lencanaSelesai}>
            <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.sukses} />
            <Teks varian="keterangan" warna="sukses" gaya={s.teksTebal}>
              {TEKS_LANGKAH_SAYA.lencanaSelesai}
            </Teks>
          </View>
        ) : null}
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={TEKS_LANGKAH_SAYA.progresLabelAkses}
        accessibilityValue={{ min: 0, max: progres.total, now: progres.selesai }}
        style={StyleSheet.flatten([s.batangLatar, { backgroundColor: warna.kerangka }])}
      >
        <View
          style={StyleSheet.flatten([
            s.batangIsi,
            {
              width: `${persen}%`,
              backgroundColor: semuaSelesai ? warna.sukses : warna.aksen,
            },
          ])}
        />
      </View>

      <Teks varian="badanKecil" warna={semuaSelesai ? 'teks' : 'teksSekunder'}>
        {kalimat}
      </Teks>
    </View>
  );
}

function BarisPilSaring<T extends string>({
  label,
  opsi,
  tampil,
  aktif,
  onPilih,
}: {
  label: string;
  opsi: readonly T[];
  tampil: (nilai: T) => string;
  aktif: string | null;
  onPilih: (nilai: T) => void;
}) {
  const { warna } = useTemaV2();
  return (
    <View style={s.barisSaring}>
      <Teks varian="badanKecil" warna="teksSekunder">
        {label}
      </Teks>
      <View style={s.daftarPil} accessibilityRole="radiogroup">
        {opsi.map((nilai) => {
          const terpilih = aktif === nilai;
          const teksPil = tampil(nilai);
          return (
            <Sentuh
              key={nilai}
              peran="radio"
              label={teksPil}
              terpilih={terpilih}
              dicentang={terpilih}
              onPress={() => onPilih(nilai)}
              gaya={({ ditekan }) => [
                s.pil,
                {
                  backgroundColor: terpilih
                    ? warna.permukaanLembut
                    : ditekan
                      ? warna.permukaanLembut
                      : warna.halaman,
                  borderColor: terpilih ? warna.aksen : warna.garisKontrol,
                  borderWidth: terpilih ? garis.fokus : garis.tipis,
                },
              ]}
            >
              {terpilih ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
              <Teks
                varian="badanKecil"
                warna="teks"
                gaya={terpilih ? s.teksTebal : undefined}
              >
                {teksPil}
              </Teks>
            </Sentuh>
          );
        })}
      </View>
    </View>
  );
}

function KelompokLangkahV2({
  kategori,
  selesaiIds,
  pribadiIds,
  konfirmasiHapusId,
  sedangHapus,
  onAlih,
  onMintaHapus,
  onBatalHapus,
  onKonfirmasiHapus,
}: {
  kategori: KategoriDaftarPeriksa;
  selesaiIds: ReadonlySet<string>;
  pribadiIds: ReadonlySet<string>;
  konfirmasiHapusId: string | null;
  sedangHapus: boolean;
  onAlih: (b: ButirDaftarPeriksa) => void;
  onMintaHapus: (id: string) => void;
  onBatalHapus: () => void;
  onKonfirmasiHapus: (id: string) => void;
}) {
  const { mode, warna } = useTemaV2();
  const catatan = CATATAN_KATEGORI[kategori.id];
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;

  return (
    <View style={s.seksi}>
      <Teks varian="h2">{kategori.nama}</Teks>
      {catatan ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {catatan}
        </Teks>
      ) : null}
      <View
        style={StyleSheet.flatten([
          s.kartuKelompok,
          bayangan,
          { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
        ])}
      >
        {kategori.butir.map((butir, indeks) => {
          const tercentang = selesaiIds.has(butir.id);
          const adalahPribadi = pribadiIds.has(butir.id);
          const mintaKonfirmasi = konfirmasiHapusId === butir.id;
          return (
            <View
              key={butir.id}
              style={StyleSheet.flatten([
                s.pembungkusButir,
                indeks > 0 && { borderTopWidth: garis.tipis, borderTopColor: warna.garisHalus },
                tercentang && { backgroundColor: warna.permukaanLembut },
              ])}
            >
              <View style={s.barisButir}>
                <Sentuh
                  peran="checkbox"
                  label={butir.judul}
                  dicentang={tercentang}
                  onPress={() => onAlih(butir)}
                  gaya={({ ditekan }) => [
                    s.sentuhCentang,
                    ditekan && { backgroundColor: warna.permukaanLembut },
                  ]}
                >
                  <View
                    style={StyleSheet.flatten([
                      s.kotakCentang,
                      {
                        borderColor: tercentang ? warna.aksen : warna.garisKontrol,
                        backgroundColor: tercentang ? warna.aksen : warna.transparan,
                      },
                    ])}
                  >
                    {tercentang ? (
                      <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.teksPadaAksen} />
                    ) : null}
                  </View>
                  <Teks
                    varian="badan"
                    warna={tercentang ? 'teksSekunder' : 'teks'}
                    gaya={s.fleks}
                  >
                    {butir.judul}
                  </Teks>
                </Sentuh>

                {adalahPribadi && !mintaKonfirmasi ? (
                  <Sentuh
                    peran="button"
                    label={labelHapusButirPribadi(butir.judul)}
                    onPress={() => onMintaHapus(butir.id)}
                    gaya={({ ditekan }) => [
                      s.tombolHapusKecil,
                      ditekan && { backgroundColor: warna.permukaanLembut },
                    ]}
                  >
                    <Teks varian="keterangan" warna="aksen" garisBawah>
                      {TEKS_LANGKAH_SAYA.hapus}
                    </Teks>
                  </Sentuh>
                ) : null}
              </View>

              {adalahPribadi && mintaKonfirmasi ? (
                <View style={s.konfirmasiBaris}>
                  <Teks varian="keterangan" warna="teksSekunder">
                    {TEKS_LANGKAH_SAYA.konfirmasiHapusButir}
                  </Teks>
                  <View style={s.konfirmasiTombol}>
                    <Tombol
                      varian="sekunder"
                      label={TEKS_LANGKAH_SAYA.yaHapus}
                      memuat={sedangHapus}
                      onPress={() => onKonfirmasiHapus(butir.id)}
                    />
                    <Tombol
                      varian="teks"
                      label={TEKS_LANGKAH_SAYA.batal}
                      onPress={onBatalHapus}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BagianJadwalSmpV2({
  smp,
  kelas,
  form,
  setForm,
}: {
  smp: DataLangkahSayaV2['smp'];
  kelas: '7' | '8' | '9' | '10' | '11' | '12' | null;
  form: { event?: EventSekolah } | null;
  setForm: (f: { event?: EventSekolah } | null) => void;
}) {
  const { warna } = useTemaV2();
  const [lihatLewat, setLihatLewat] = useState(false);
  const { mendatang, lewat } = pisahEvent(smp.daftarEvent);
  const namaMapel = (id: string | null) => (id ? smp.mapel.find((m) => m.id === id)?.nama : undefined);
  const labelLipatLewat = `${TEKS_EVENT.sudahLewat} (${lewat.length})`;

  return (
    <View style={s.seksi}>
      <Teks varian="h2">{TEKS_LANGKAH_SAYA.jadwalSmpJudul}</Teks>

      {form ? (
        <FormJadwalSmpV2
          key={form.event?.id ?? 'baru'}
          awal={form.event}
          kelas={kelas}
          smp={smp}
          onSelesai={() => setForm(null)}
        />
      ) : (
        <Tombol
          varian="sekunder"
          label={TEKS_LANGKAH_SAYA.tambahJadwal}
          onPress={() => setForm({})}
        />
      )}

      {mendatang.map((e) => (
        <KartuJadwalSmpV2
          key={e.id}
          event={e}
          namaMapel={namaMapel(e.mapel_id)}
          smp={smp}
          onUbah={() => setForm({ event: e })}
        />
      ))}

      {lewat.length > 0 ? (
        <Sentuh
          peran="button"
          label={labelLipatLewat}
          terbuka={lihatLewat}
          onPress={() => setLihatLewat((v) => !v)}
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
            nama={lihatLewat ? 'bawah' : 'panah'}
            ukuran={ukuran.ikon}
            warna={warna.teksSekunder}
          />
        </Sentuh>
      ) : null}

      {lihatLewat
        ? lewat.map((e) => (
            <KartuJadwalSmpV2
              key={e.id}
              event={e}
              namaMapel={namaMapel(e.mapel_id)}
              lewat
              smp={smp}
              onUbah={() => setForm({ event: e })}
            />
          ))
        : null}
    </View>
  );
}

function KartuJadwalSmpV2({
  event,
  namaMapel,
  lewat = false,
  smp,
  onUbah,
}: {
  event: EventSekolah;
  namaMapel?: string;
  lewat?: boolean;
  smp: DataLangkahSayaV2['smp'];
  onUbah: () => void;
}) {
  const { warna } = useTemaV2();
  const router = useRouter();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [panelTerbuka, setPanelTerbuka] = useState(false);
  const jenis = labelJenis(event.jenis);
  const judul = namaMapel ? `${jenis} · ${namaMapel}` : jenis;
  const jarak = lewat ? TEKS_EVENT.sudahLewat : teksHitungMundur(selisihHari(event.tanggal) ?? 0);
  const materi = tampilanMateri(event);
  const kurasi = event.materi?.tersedia && event.materi.jenis === 'kurasi' ? event.materi : null;
  const tanggalTeks = formatTanggal(event.tanggal);

  return (
    <Kartu judul={judul} keterangan={`${tanggalTeks} · ${jarak}`}>
      {event.materi_teks ? (
        <Teks varian="badanKecil" warna="teks">
          {event.materi_teks}
        </Teks>
      ) : null}
      {materi.keterangan ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {materi.keterangan}
        </Teks>
      ) : null}
      {kurasi && panelTerbuka ? (
        <View
          style={StyleSheet.flatten([
            s.panelKurasi,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="judulKecil">{kurasi.judul}</Teks>
          <Teks varian="badanKecil">{kurasi.isi}</Teks>
        </View>
      ) : null}

      {konfirmasi ? (
        <View style={s.konfirmasiBaris}>
          <Teks varian="keterangan" warna="teksSekunder">
            {TEKS_EVENT.konfirmasiHapus}
          </Teks>
          <View style={s.konfirmasiTombol}>
            <Tombol
              varian="sekunder"
              label={TEKS_EVENT.yaHapus}
              memuat={smp.sedangHapusEvent}
              onPress={() => smp.hapusEvent(event.id, () => setKonfirmasi(false))}
            />
            <Tombol
              varian="teks"
              label={TEKS_EVENT.tombolBatal}
              onPress={() => setKonfirmasi(false)}
            />
          </View>
          {smp.galatHapusEvent ? <PesanStatus jenis="galat">{TEKS_EVENT.galatSimpan}</PesanStatus> : null}
        </View>
      ) : (
        <View style={s.konfirmasiTombol}>
          {materi.buka === 'arsip' ? (
            <Tombol
              varian="teks"
              label={TEKS_EVENT.bukaMateri}
              onPress={() => router.push({ pathname: '/arsip-kartu', params: { id: event.kartu_id! } } as any)}
            />
          ) : null}
          {materi.buka === 'panel' ? (
            <Tombol
              varian="teks"
              label={panelTerbuka ? TEKS_EVENT.tutupMateri : TEKS_EVENT.bukaMateri}
              onPress={() => setPanelTerbuka((v) => !v)}
            />
          ) : null}
          <Tombol varian="teks" label={TEKS_EVENT.ubah} onPress={onUbah} />
          <Tombol varian="teks" label={TEKS_EVENT.hapus} onPress={() => setKonfirmasi(true)} />
        </View>
      )}
    </Kartu>
  );
}

function FormJadwalSmpV2({
  awal,
  kelas,
  smp,
  onSelesai,
}: {
  awal?: EventSekolah;
  kelas: '7' | '8' | '9' | '10' | '11' | '12' | null;
  smp: DataLangkahSayaV2['smp'];
  onSelesai: () => void;
}) {
  const { warna } = useTemaV2();
  const [jenis, setJenis] = useState<JenisEvent | null>(awal?.jenis ?? null);
  const [tanggal, setTanggal] = useState(awal?.tanggal ?? '');
  const [mapelId, setMapelId] = useState<string | null>(awal?.mapel_id ?? null);
  const [materi, setMateri] = useState(awal?.materi_teks ?? '');
  const [kartuId, setKartuId] = useState<string | null>(awal?.kartu_id ?? null);
  const [galat, setGalat] = useState<ReturnType<typeof periksaIsianEvent>>({});

  const hapusGalat = (medan: keyof typeof galat) => setGalat((g) => ({ ...g, [medan]: undefined }));
  const kartuPilihan = smp.pilihanKartu.filter((k) => !mapelId || k.mapel_id === mapelId);

  const pilihMapel = (id: string) => {
    const baru = mapelId === id ? null : id;
    setMapelId(baru);
    if (kartuId && baru && smp.pilihanKartu.find((k) => k.id === kartuId)?.mapel_id !== baru) {
      setKartuId(null);
    }
  };

  const kirim = () => {
    const periksa = periksaIsianEvent({ jenis, tanggal, materi });
    setGalat(periksa);
    if (Object.keys(periksa).length || !jenis) return;
    const isi: IsiEvent = {
      jenis,
      tanggal: tanggal.trim(),
      mapel_id: mapelId,
      materi_teks: materi.trim() || null,
    };
    if (!awal || kartuId !== awal.kartu_id) isi.kartu_id = kartuId;
    smp.simpanEvent({ id: awal?.id, isi }, onSelesai);
  };

  return (
    <View
      style={StyleSheet.flatten([
        s.kartuFormSmp,
        { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
      ])}
    >
      <View style={s.barisSaring}>
        <Teks varian="judulKecil">{TEKS_EVENT.labelJenis}</Teks>
        <View style={s.daftarPil} accessibilityRole="radiogroup">
          {pilihanJenis(kelas, awal?.jenis).map((p) => {
            const aktif = jenis !== null && labelJenis(jenis) === p.label;
            return (
              <Sentuh
                key={p.nilai}
                peran="radio"
                label={p.label}
                terpilih={aktif}
                dicentang={aktif}
                onPress={() => {
                  if (!jenis || labelJenis(jenis) !== p.label) setJenis(p.nilai);
                  hapusGalat('jenis');
                }}
                gaya={({ ditekan }) => [
                  s.pil,
                  {
                    backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.halaman,
                    borderColor: aktif ? warna.aksen : warna.garisKontrol,
                    borderWidth: aktif ? garis.fokus : garis.tipis,
                  },
                ]}
              >
                {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
                <Teks varian="badanKecil">{p.label}</Teks>
              </Sentuh>
            );
          })}
        </View>
        {galat.jenis ? <PesanStatus jenis="galat">{galat.jenis}</PesanStatus> : null}
      </View>

      <Isian
        label={TEKS_EVENT.labelTanggal}
        petunjuk={TEKS_EVENT.petunjukTanggal}
        nilai={tanggal}
        onUbah={(t) => {
          setTanggal(t);
          hapusGalat('tanggal');
        }}
        maksPanjang={10}
        galat={galat.tanggal}
      />

      {smp.mapel.length > 0 ? (
        <View style={s.barisSaring}>
          <Teks varian="judulKecil">{`${TEKS_EVENT.labelMapel} (${TEKS_EVENT.opsional})`}</Teks>
          <View style={s.daftarPil}>
            {smp.mapel.map((m) => {
              const aktif = mapelId === m.id;
              return (
                <Sentuh
                  key={m.id}
                  peran="checkbox"
                  label={m.nama}
                  dicentang={aktif}
                  onPress={() => pilihMapel(m.id)}
                  gaya={({ ditekan }) => [
                    s.pil,
                    {
                      backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.halaman,
                      borderColor: aktif ? warna.aksen : warna.garisKontrol,
                      borderWidth: aktif ? garis.fokus : garis.tipis,
                    },
                  ]}
                >
                  {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
                  <Teks varian="badanKecil">{m.nama}</Teks>
                </Sentuh>
              );
            })}
          </View>
        </View>
      ) : null}

      <Isian
        label={`${TEKS_EVENT.labelMateri} (${TEKS_EVENT.opsional})`}
        petunjuk={TEKS_EVENT.petunjukMateri}
        nilai={materi}
        onUbah={(t) => {
          setMateri(t);
          hapusGalat('materi_teks');
        }}
        maksPanjang={MAKS_MATERI}
        galat={galat.materi_teks}
      />

      {kartuPilihan.length > 0 ? (
        <View style={s.barisSaring}>
          <Teks varian="judulKecil">{`${TEKS_EVENT.labelKartu} (${TEKS_EVENT.opsional})`}</Teks>
          <View style={s.daftarPil}>
            {kartuPilihan.map((k) => {
              const aktif = kartuId === k.id;
              const labelKartu = k.sumber_nama
                ? `${k.judul} · ${TEKS_EVENT.awalanSumber} ${k.sumber_nama}`
                : k.judul;
              return (
                <Sentuh
                  key={k.id}
                  peran="checkbox"
                  label={labelKartu}
                  dicentang={aktif}
                  onPress={() => setKartuId(aktif ? null : k.id)}
                  gaya={({ ditekan }) => [
                    s.pil,
                    {
                      backgroundColor: aktif || ditekan ? warna.permukaanLembut : warna.halaman,
                      borderColor: aktif ? warna.aksen : warna.garisKontrol,
                      borderWidth: aktif ? garis.fokus : garis.tipis,
                    },
                  ]}
                >
                  {aktif ? <Ikon nama="centang" ukuran={ukuran.ikon} warna={warna.aksen} /> : null}
                  <Teks varian="badanKecil">{labelKartu}</Teks>
                </Sentuh>
              );
            })}
          </View>
          {smp.kodeGalatSimpanEvent === 'KARTU_TIDAK_SAH' ? (
            <PesanStatus jenis="galat">{TEKS_EVENT.galatKartu}</PesanStatus>
          ) : null}
        </View>
      ) : null}

      {smp.galatSimpanEvent && smp.kodeGalatSimpanEvent !== 'KARTU_TIDAK_SAH' ? (
        <PesanStatus jenis="galat">{TEKS_EVENT.galatSimpan}</PesanStatus>
      ) : null}

      <View style={s.konfirmasiTombol}>
        <Tombol varian="utama" label={TEKS_EVENT.tombolSimpan} memuat={smp.sedangSimpanEvent} onPress={kirim} />
        <Tombol varian="teks" label={TEKS_EVENT.tombolBatal} onPress={onSelesai} />
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
  seksi: {
    gap: ruang.r2,
  },
  fleks: {
    flex: 1,
    minWidth: 0,
  },
  teksTebal: {
    fontFamily: keluargaHuruf.badanTebal,
  },
  kartuSaring: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  barisSaring: {
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
    justifyContent: 'center',
    gap: ruang.r1,
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.pil,
  },
  kartuProgres: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  barisJudulProgres: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ruang.r2,
  },
  lencanaSelesai: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
  },
  batangLatar: {
    height: ruang.r1,
    borderRadius: radius.pil,
    overflow: 'hidden',
  },
  batangIsi: {
    height: ruang.r1,
    borderRadius: radius.pil,
  },
  kartuKelompok: {
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    overflow: 'hidden',
  },
  pembungkusButir: {
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    gap: ruang.r1,
  },
  barisButir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
  },
  sentuhCentang: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
  },
  kotakCentang: {
    width: UKURAN_KOTAK_CENTANG,
    height: UKURAN_KOTAK_CENTANG,
    borderRadius: radius.kecil,
    borderWidth: garis.fokus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tombolHapusKecil: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ruang.r1,
    borderRadius: radius.kecil,
  },
  konfirmasiBaris: {
    gap: ruang.r1,
    paddingBottom: ruang.r1,
  },
  konfirmasiTombol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ruang.r1,
  },
  barisPintuBawah: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ruang.r2,
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
  kartuFormSmp: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  panelKurasi: {
    padding: ruang.r2,
    borderRadius: radius.kecil,
    borderWidth: garis.tipis,
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
});
