import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { ProfilEksplorasi } from '../../../api/types';
import { usePerbaruiProfilV2, useProfilEksplorasiV2, useRiwayatProfilV2 } from '../../../hooks/useJelajahV2';
import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import {
  BATAS_DISCOVER,
  GALAT_ISIAN_DISCOVER,
  TEKS_JELAJAH_V2 as T,
  TEKS_PRIVASI_JELAJAH,
  blokProfil,
  daftarLabelJalurProfilV2,
  hitungBatasKarakter,
  keadaanData,
  periksaCatatanProfilV2,
  pesanGalatDiscover,
  teksDisembunyikan,
  teksVersi,
} from '../../../lib/jelajahV2';
import { elevasi, garis, radius, ruang, tataLetak } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Isian, PesanStatus, PlaceholderMemuat, Teks, Tombol } from '../../v2';
import { KartuMaskotKosongJelajahV2, KeadaanNonSiapJelajahV2 } from './JelajahV2';

const PERILAKU_PAPAN_KETIK = Platform.OS === 'ios' ? 'padding' : undefined;

/**
 * Layar Profil Eksplorasi v2 (`/discover-profil`, dibuka dari tab "Profil Saya", LANJUT_034).
 * - Kartu pintu "Akun & Privasi" di bagian atas tetap disediakan oleh `AppShellV2` (LANJUT_031).
 * - Menampilkan seluruh isian siswa apa adanya tanpa tafsiran (K44), memakai `labelJalur` untuk
 *   daftar jalur agar id mentah tidak pernah tampil.
 * - Tombol "Ubah" membuka isian catatan berbatas 500 karakter dengan penghitung sisa karakter.
 * - Riwayat versi terlipat ("Lihat perubahan"), bernomor dan berjam (`Versi ke-N · <tanggal> pukul <jam>`).
 */
export function ProfilEksplorasiV2() {
  const { mode, warna } = useTemaV2();
  const kurangiGerak = useKurangiGerak();
  const profil = useProfilEksplorasiV2();
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [bukaRiwayat, setBukaRiwayat] = useState(false);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);

  const keadaan = keadaanData({ isPending: profil.isPending, galat: profil.error });
  if (keadaan !== 'siap') {
    return (
      <KeadaanNonSiapJelajahV2
        keadaan={keadaan}
        labelMemuat={T.memuatProfil}
        onCobaLagi={() => void profil.refetch()}
      />
    );
  }

  const { profil: terkini, jumlah_versi: jumlahVersi } = profil.data!;
  const bayangan = mode === 'terang' ? elevasi.angkat : elevasi.datar;

  return (
    <View style={s.wadah}>
      <View style={s.kepala}>
        <Teks varian="h1">{T.judulProfil}</Teks>
        <Teks varian="badan" warna="teksSekunder">
          {T.ringkasanProfil}
        </Teks>
      </View>

      {pesanSukses ? (
        <PesanStatus jenis="sukses" berlatar>
          {pesanSukses}
        </PesanStatus>
      ) : null}

      {terkini ? (
        <View
          style={StyleSheet.flatten([
            s.kartuProfil,
            bayangan,
            { backgroundColor: warna.permukaan, borderColor: warna.garisHalus },
          ])}
        >
          <View style={s.barisAtasKartu}>
            <Teks varian="keterangan" warna="teksSekunder" gaya={s.fleks}>
              {teksVersi(terkini.versi_ke, terkini.dibuat_pada)}
            </Teks>
            <Tombol
              varian="sekunder"
              label={T.ubahProfil}
              onPress={() => {
                setPesanSukses(null);
                setModalTerbuka(true);
              }}
            />
          </View>

          <IsiSatuProfilV2 profil={terkini} />

          {jumlahVersi > 1 ? (
            <View style={StyleSheet.flatten([s.bagianAksiBawah, { borderTopColor: warna.garisHalus }])}>
              <Tombol
                varian="teks"
                label={bukaRiwayat ? T.tutupRiwayat : T.lihatRiwayat}
                onPress={() => setBukaRiwayat((v) => !v)}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <KartuMaskotKosongJelajahV2
          judul={T.belumAdaProfilJudul}
          teks={T.belumAdaProfilTeks}
          labelAksi={T.susunProfil}
          onAksi={() => {
            setPesanSukses(null);
            setModalTerbuka(true);
          }}
        />
      )}

      {jumlahVersi > 1 && bukaRiwayat ? <DaftarRiwayatProfilV2 /> : null}

      <Modal
        visible={modalTerbuka}
        animationType={kurangiGerak ? 'none' : 'slide'}
        onRequestClose={() => setModalTerbuka(false)}
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
              {terkini ? T.formProfilJudulUbah : T.formProfilJudulBaru}
            </Teks>
            <Tombol varian="teks" label={T.batal} onPress={() => setModalTerbuka(false)} />
          </View>

          <ScrollView contentContainerStyle={s.modalGulir} keyboardShouldPersistTaps="handled">
            <View style={s.modalKolom}>
              <FormProfilV2
                key={terkini?.id ?? 'baru'}
                awal={terkini}
                onSelesai={(pesan) => {
                  setModalTerbuka(false);
                  setPesanSukses(pesan);
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function IsiSatuProfilV2({ profil, ringkas = false }: { profil: ProfilEksplorasi; ringkas?: boolean }) {
  const { warna } = useTemaV2();
  const blok = blokProfil(profil);
  const mapel = profil.mapel_pilihan.map((m) => m.nama ?? m.id);
  const jalurAman = daftarLabelJalurProfilV2(profil.jalur);

  return (
    <View style={s.daftarIsi}>
      {blok.map((b, idx) => (
        <View key={idx} style={s.blokRefleksi}>
          <Teks varian="badan">{b.kalimat}</Teks>
          {b.kutipan.map((k) => (
            <View
              key={k.label}
              style={StyleSheet.flatten([s.kutipan, { borderLeftColor: warna.garisKontrol }])}
            >
              <Teks varian="keterangan" warna="teksSekunder">
                {k.label}
              </Teks>
              <Teks varian="badanKecil">{`"${k.teks}"`}</Teks>
            </View>
          ))}
        </View>
      ))}

      {profil.refleksi_disembunyikan > 0 ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {teksDisembunyikan(profil.refleksi_disembunyikan)}
        </Teks>
      ) : null}

      {profil.catatan ? (
        <View style={StyleSheet.flatten([s.blokBagian, { borderTopColor: warna.garisHalus }])}>
          <Teks varian="keterangan" warna="teksSekunder">
            {T.labelCatatanRingkas}
          </Teks>
          <Teks varian="badanKecil">{`"${profil.catatan}"`}</Teks>
        </View>
      ) : null}

      {!ringkas && (profil.minat_rumpun.length > 0 || mapel.length > 0) ? (
        <View style={StyleSheet.flatten([s.blokBagian, { borderTopColor: warna.garisHalus }])}>
          <Teks varian="judulKecil">{T.bagianDataAkun}</Teks>
          {profil.minat_rumpun.length > 0 ? (
            <Teks varian="badanKecil">{`${T.labelMinatRumpun}: ${profil.minat_rumpun.join(', ')}`}</Teks>
          ) : null}
          {mapel.length > 0 ? (
            <Teks varian="badanKecil">{`${T.labelMapelPilihan}: ${mapel.join(', ')}`}</Teks>
          ) : null}
        </View>
      ) : null}

      {!ringkas && (jalurAman.length > 0 || profil.tujuan.length > 0) ? (
        <View style={StyleSheet.flatten([s.blokBagian, { borderTopColor: warna.garisHalus }])}>
          <Teks varian="judulKecil">{T.bagianJalurTujuan}</Teks>
          {jalurAman.length > 0 ? (
            <Teks varian="badanKecil">{`${T.labelJalur}: ${jalurAman.join(', ')}`}</Teks>
          ) : null}
          {profil.tujuan.map((t) => (
            <Teks key={t.id} varian="badanKecil">
              {`${T.labelTujuan}: ${t.judul}`}
            </Teks>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DaftarRiwayatProfilV2() {
  const { warna } = useTemaV2();
  const riwayat = useRiwayatProfilV2(true);

  if (riwayat.isPending) {
    return <PlaceholderMemuat baris={2} label={T.memuatProfil} />;
  }
  if (riwayat.isError) {
    return <PesanStatus jenis="galat">{pesanGalatDiscover(riwayat.error.kode)}</PesanStatus>;
  }

  const versiLama = riwayat.data.filter((v) => v.status === 'diubah').reverse();
  return (
    <View style={s.daftarRiwayat}>
      {versiLama.map((v) => (
        <View
          key={v.id}
          style={StyleSheet.flatten([
            s.kartuRiwayat,
            { backgroundColor: warna.permukaanLembut, borderColor: warna.garisHalus },
          ])}
        >
          <Teks varian="keterangan" warna="teksSekunder">
            {teksVersi(v.versi_ke, v.dibuat_pada)}
          </Teks>
          <IsiSatuProfilV2 profil={v} ringkas />
        </View>
      ))}
    </View>
  );
}

function FormProfilV2({
  awal,
  onSelesai,
}: {
  awal: ProfilEksplorasi | null;
  onSelesai: (pesan: string) => void;
}) {
  const { warna } = useTemaV2();
  const perbarui = usePerbaruiProfilV2();
  const [catatan, setCatatan] = useState(awal?.catatan ?? '');
  const [galat, setGalat] = useState<string | null>(null);

  const infoCatatan = hitungBatasKarakter(catatan, BATAS_DISCOVER.catatan);
  const galatAktif = galat ?? periksaCatatanProfilV2(catatan);

  const kirim = () => {
    const salah = periksaCatatanProfilV2(catatan);
    if (salah) {
      setGalat(salah);
      return;
    }
    setGalat(null);
    perbarui.mutate(
      { catatan: catatan.trim() || null },
      {
        onSuccess: () => onSelesai(T.berhasilSimpanProfil),
        onError: (err) =>
          setGalat(
            err.kode === 'VALIDASI_GAGAL'
              ? GALAT_ISIAN_DISCOVER.tidakBerubah
              : pesanGalatDiscover(err.kode)
          ),
      }
    );
  };

  const hapusCatatan = () => {
    setGalat(null);
    perbarui.mutate(
      { catatan: null },
      {
        onSuccess: () => onSelesai(T.berhasilHapusCatatan),
        onError: (err) => setGalat(pesanGalatDiscover(err.kode)),
      }
    );
  };

  return (
    <View style={s.formWadah}>
      {awal ? (
        <Teks varian="keterangan" warna="teksSekunder">
          {T.formProfilCatatanVersi}
        </Teks>
      ) : null}

      <View style={s.kolomDenganHitung}>
        <Isian
          label={T.labelCatatan}
          nilai={catatan}
          onUbah={(v) => {
            setCatatan(v);
            setGalat(null);
          }}
          barisGanda
          galat={galatAktif ?? undefined}
        />
        <Teks
          varian="keterangan"
          warna={infoCatatan.melewati ? 'galat' : 'teksSekunder'}
          gaya={s.penghitung}
        >
          {infoCatatan.teksRingkas}
        </Teks>
      </View>

      <Teks varian="keterangan" warna="teksSekunder">
        {TEKS_PRIVASI_JELAJAH}
      </Teks>

      <View style={StyleSheet.flatten([s.barisSimpanForm, { borderTopColor: warna.garisHalus }])}>
        <Tombol varian="utama" label={T.simpan} memuat={perbarui.isPending} onPress={kirim} />
        {awal?.catatan ? (
          <Tombol
            varian="teks"
            label={T.hapusCatatan}
            nonaktif={perbarui.isPending}
            onPress={hapusCatatan}
          />
        ) : null}
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
  fleks: {
    flex: 1,
    minWidth: 0,
  },
  kartuProfil: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
  },
  barisAtasKartu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ruang.r2,
  },
  daftarIsi: {
    gap: ruang.r2,
  },
  blokRefleksi: {
    gap: ruang.r1,
  },
  kutipan: {
    borderLeftWidth: garis.fokus,
    paddingLeft: ruang.r2,
    gap: ruang.r1,
  },
  blokBagian: {
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r2,
    gap: ruang.r1,
  },
  bagianAksiBawah: {
    borderTopWidth: garis.tipis,
    paddingTop: ruang.r1,
    alignItems: 'flex-start',
  },
  daftarRiwayat: {
    gap: ruang.r2,
  },
  kartuRiwayat: {
    padding: ruang.r2,
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    gap: ruang.r2,
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
  kolomDenganHitung: {
    gap: ruang.r1,
  },
  penghitung: {
    alignSelf: 'flex-end',
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
