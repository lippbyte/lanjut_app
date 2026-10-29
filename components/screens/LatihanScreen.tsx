import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { CatatanLatihan, Mapel, SesiLatihan } from '../../api/types';
import { useKartuSaya } from '../../hooks/useKartu';
import { useMulaiSesi, useSimpanHasilSesi } from '../../hooks/useLatihan';
import { useMapel } from '../../hooks/useMapel';
import { useModulLatihan } from '../../hooks/useModul';
import { namaMapel } from '../../lib/arsip';
import {
  BATAS_SESI,
  BATAS_SINGKAT,
  KEYAKINAN,
  TEKS_KEYAKINAN,
  TEKS_LATIHAN_MODUL,
  buatId,
  catatanJawaban,
  jumlahBahan,
  mapelLatihan,
  nilaiKeyakinan,
  perkiraanMenit,
  susunAntrian,
  type ItemLatihan,
  type KodeKeyakinan,
} from '../../lib/latihan';
import { TEKS_LEVELIN } from '../../lib/levelin';
import { urutkanMapelPilihan } from '../../lib/mapelPilihan';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { BilahProgres, Kartu, KeadaanGalat, Kepala, Kosong, Memuat, Tombol, gaya } from '../ui';
import { DaftarOpsi, OpsiPil, PesanGalat } from './auth/AuthUI';

const SEMUA = '__semua__';

type Sesi = { id: string; mapelId: string | null; batas: number; antrian: ItemLatihan[] };

/**
 * F7 Latihan (LANJUT_041) — antrian sederhana TANPA Level-In (lib/latihan.ts):
 * kartu milik sendiri, diacak, maks. 12 per sesi (pilihan singkat 5).
 * Tiga tahap di satu layar karena antriannya hanya hidup di memori:
 *   pilih   → mapel (atau semua) + Mulai / Ambil 5 kartu
 *   sesi    → satu kartu per layar, Lihat jawaban, nilai sendiri, Berikutnya
 *   selesai → ringkasan; jawaban dikirim sekaligus ke /riwayat-latihan, lalu
 *             sesi ditutup (bukan per kartu, SDD §6.4)
 * Kartu kurasi tidak pernah ikut: useKartuSaya meminta ?sumber=pengguna.
 * LANJUT_058: tiap kartu bertanya "Seberapa yakin kamu?" (boleh dilewati);
 * keyakinan ikut di catatan yang sama, jadi ikut terkirim ulang lewat
 * "Coba lagi". `?mapel=&asal=saran` (dari saran Level-In) memilih mapelnya.
 * 15 Okt 2026 (pilihan percakapan, belum disetujui PM): potongan modul yang diunggah ikut
 * dilatih (lib/latihan.ts ItemLatihan), jadi ikut dihitung Level-In. Modul gagal dimuat →
 * Latihan tetap jalan dengan kartu saja.
 */
export function LatihanScreen() {
  const kartuQuery = useKartuSaya();
  const modulQuery = useModulLatihan();
  const mapelQuery = useMapel();
  const { pengguna } = useSesi();
  const mulaiSesi = useMulaiSesi();
  const simpan = useSimpanHasilSesi();
  const param = useLocalSearchParams<{ mapel?: string; asal?: string }>();
  const [pilihanMapel, setPilihanMapel] = useState<string>(param.mapel || SEMUA);
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [hasil, setHasil] = useState<CatatanLatihan[] | null>(null);
  const asalMula: SesiLatihan['asal_mula'] = param.asal === 'saran' ? 'beranda_saran' : 'arsip';

  // Layar yang sama dibuka lagi dengan mapel lain (mis. dari saran Level-In).
  useEffect(() => {
    if (param.mapel) setPilihanMapel(param.mapel);
  }, [param.mapel]);

  if (kartuQuery.isPending || mapelQuery.isPending || modulQuery.isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (kartuQuery.isError) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;
  const kartu = kartuQuery.data;
  const potongan = modulQuery.data?.potongan ?? [];
  const modulPerMapel = modulQuery.data?.per_mapel ?? [];
  const mapel = mapelQuery.data ?? [];

  const mulai = (mapelId: string | null, batas: number) => {
    const antrian = susunAntrian(kartu, potongan, mapelId, batas);
    if (!antrian.length) return;
    const id = buatId();
    mulaiSesi.mutate(
      { id, mapel_fokus_id: mapelId, jumlah_kartu_direncanakan: antrian.length, asal_mula: asalMula },
      {
        onSuccess: () => {
          setHasil(null);
          setSesi({ id, mapelId, batas, antrian });
          // Contoh potongan modul berikutnya diacak ulang untuk sesi sesudahnya ("Ulangi").
          void modulQuery.refetch();
        },
      }
    );
  };

  const selesai = (catatan: CatatanLatihan[]) => {
    if (!sesi) return;
    setHasil(catatan);
    simpan.mutate({ sesiId: sesi.id, catatan });
  };

  if (sesi && hasil) {
    return (
      <LangkahSelesai
        jumlahAntrian={sesi.antrian.length}
        catatan={hasil}
        simpan={simpan}
        onSimpanLagi={() => simpan.mutate({ sesiId: sesi.id, catatan: hasil })}
        onUlangi={() => mulai(sesi.mapelId, sesi.batas)}
        sedangMulai={mulaiSesi.isPending}
      />
    );
  }
  if (sesi) return <LangkahSesi key={sesi.id} sesi={sesi} mapel={mapel} onSelesai={selesai} />;

  // Saringan yang mapelnya sudah tidak punya kartu kembali ke Semua.
  // LANJUT_079: mapel pilihan (Mapel Saya / Pilih Mapel) tampil lebih dulu.
  const perMapel = mapelLatihan(kartu, modulPerMapel, urutkanMapelPilihan(mapel, pengguna?.mapel_pilihan));
  const aktif = pilihanMapel !== SEMUA && perMapel.some((m) => m.id === pilihanMapel) ? pilihanMapel : SEMUA;
  const mapelId = aktif === SEMUA ? null : aktif;
  return (
    <LangkahPilih
      tersedia={jumlahBahan(perMapel, mapelId)}
      perMapel={perMapel}
      totalKartu={jumlahBahan(perMapel, null)}
      aktif={aktif}
      onPilih={setPilihanMapel}
      onMulai={(batas) => mulai(mapelId, batas)}
      sedangMulai={mulaiSesi.isPending}
      galat={mulaiSesi.isError}
    />
  );
}

function LangkahPilih({
  tersedia,
  perMapel,
  totalKartu,
  aktif,
  onPilih,
  onMulai,
  sedangMulai,
  galat,
}: {
  tersedia: number;
  perMapel: { id: string; nama: string; jumlah: number }[];
  totalKartu: number;
  aktif: string;
  onPilih: (id: string) => void;
  onMulai: (batas: number) => void;
  sedangMulai: boolean;
  galat: boolean;
}) {
  const router = useRouter();
  const jumlah = Math.min(BATAS_SESI, tersedia);

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul="Latihan Hari Ini" pengantar="15 menit cukup." />
      {!totalKartu ? (
        <Kosong
          judul={TEKS_LATIHAN_MODUL.kosongJudul}
          teks={TEKS_LATIHAN_MODUL.kosongTeks}
          aksi={
            <View style={s.tumpuk}>
              <Tombol label="Tambah kartu" varian="sekunder" onPress={() => router.push('/arsip-tulis')} />
              <Tombol label={TEKS_LATIHAN_MODUL.unggahModul} varian="garis" onPress={() => router.push('/arsip-modul-unggah')} />
            </View>
          }
        />
      ) : (
        <>
          <Text style={s.label}>Mapel</Text>
          <DaftarOpsi>
            <OpsiPil label={`Semua (${totalKartu})`} aktif={aktif === SEMUA} onPress={() => onPilih(SEMUA)} />
            {perMapel.map((m) => (
              <OpsiPil key={m.id} label={`${m.nama} (${m.jumlah})`} aktif={aktif === m.id} onPress={() => onPilih(m.id)} />
            ))}
          </DaftarOpsi>
          <Kartu varian="soft">
            <Text style={gaya.teksBody}>
              {jumlah} kartu, kira-kira {perkiraanMenit(jumlah)} menit.
            </Text>
          </Kartu>
          {galat ? <PesanGalat teks="Latihan belum bisa dimulai. Coba lagi sebentar lagi." /> : null}
          <Tombol label="Mulai" besar penuh proses={sedangMulai} onPress={() => onMulai(BATAS_SESI)} />
          {tersedia > BATAS_SINGKAT ? (
            <View style={s.singkat}>
              <Text style={gaya.teksKecil}>Lagi padat? Ambil 5 kartu saja. Lebih baik sedikit daripada tidak sama sekali.</Text>
              <Tombol label="Ambil 5 kartu" varian="sekunder" kecil onPress={() => onMulai(BATAS_SINGKAT)} />
            </View>
          ) : null}
        </>
      )}
      <Tombol label="Riwayat latihan" varian="garis" penuh onPress={() => router.push('/latihan-riwayat')} />
      <Tombol label={TEKS_LEVELIN.lihatLevelIn} varian="garis" penuh onPress={() => router.push('/level-in')} />
    </View>
  );
}

function LangkahSesi({ sesi, mapel, onSelesai }: { sesi: Sesi; mapel: Mapel[]; onSelesai: (c: CatatanLatihan[]) => void }) {
  const [indeks, setIndeks] = useState(0);
  const [terbuka, setTerbuka] = useState(false);
  const [benar, setBenar] = useState<boolean | null>(null);
  const [keyakinan, setKeyakinan] = useState<KodeKeyakinan | null>(null);
  const [catatan, setCatatan] = useState<CatatanLatihan[]>([]);
  const [ingatkan, setIngatkan] = useState(false);

  const total = sesi.antrian.length;
  const k = sesi.antrian[indeks];
  const soal = k.soal;
  const dariModul = k.modul !== null;
  const terakhir = indeks === total - 1;

  const berikutnya = () => {
    if (benar === null) return setIngatkan(true);
    const nilai = nilaiKeyakinan(keyakinan); // dilewati → tidak dikirim (kompatibel dengan server & app lama)
    const baru = [
      ...catatan,
      catatanJawaban(k, { id: buatId(), sesi_id: sesi.id, benar, waktu: new Date().toISOString(), ...(nilai ? { keyakinan: nilai } : {}) }),
    ];
    if (terakhir) return onSelesai(baru);
    setCatatan(baru);
    setIndeks(indeks + 1);
    setTerbuka(false);
    setBenar(null);
    setKeyakinan(null);
    setIngatkan(false);
  };
  const labelKeyakinan = KEYAKINAN.find((x) => x.kode === keyakinan)?.label;

  return (
    <View style={gaya.layarIsiRapat}>
      <View style={s.progres}>
        <Text style={s.label}>
          Kartu {indeks + 1} dari {total}
        </Text>
        <BilahProgres selesai={indeks} total={total} label="Kemajuan latihan" />
      </View>

      <Kartu style={s.kartu}>
        <Text style={s.eyebrow}>
          {namaMapel(k.mapelId, mapel)} · {soal ? 'Soal' : dariModul ? TEKS_LATIHAN_MODUL.jenis : 'Catatan'}
        </Text>
        <Text style={s.judul}>{k.judul}</Text>
        {k.modul ? <Text style={gaya.teksKecil}>{TEKS_LATIHAN_MODUL.bagian(k.modul.bagian, k.modul.jumlahBagian)}</Text> : null}
        {k.isyarat ? <Text style={gaya.teksBody}>{k.isyarat}</Text> : null}
        {soal ? null : (
          <Text style={gaya.teksKecil}>{dariModul ? TEKS_LATIHAN_MODUL.ajakan : 'Coba ingat isi catatan ini dulu.'}</Text>
        )}
      </Kartu>

      {terbuka ? (
        <>
          <Text style={gaya.teksKecil}>{labelKeyakinan ? TEKS_KEYAKINAN.terpilih(labelKeyakinan) : TEKS_KEYAKINAN.dilewati}</Text>
          <View style={s.jawaban}>
            <Text style={s.labelJawaban}>{soal ? 'Jawaban' : dariModul ? TEKS_LATIHAN_MODUL.labelIsi : 'Isi catatan'}</Text>
            <Text style={gaya.teksBody}>{k.isi}</Text>
          </View>
          <Text style={s.label}>{soal ? 'Jawabanmu tadi?' : 'Kamu ingat?'}</Text>
          <DaftarOpsi>
            <OpsiPil label={soal ? 'Salah' : 'Belum ingat'} aktif={benar === false} onPress={() => { setBenar(false); setIngatkan(false); }} />
            <OpsiPil label={soal ? 'Benar' : 'Sudah ingat'} aktif={benar === true} onPress={() => { setBenar(true); setIngatkan(false); }} />
          </DaftarOpsi>
          {ingatkan ? <PesanGalat teks="Pilih dulu hasilnya, baru lanjut." /> : null}
          <Tombol label={terakhir ? 'Lihat hasil' : 'Berikutnya'} besar penuh onPress={berikutnya} />
        </>
      ) : (
        <>
          {/* LANJUT_058 — keyakinan SEBELUM jawaban dibuka; boleh dilewati, ketuk lagi untuk membatalkan. */}
          <View style={s.keyakinan}>
            <Text style={s.label}>{TEKS_KEYAKINAN.tanya}</Text>
            <DaftarOpsi>
              {KEYAKINAN.map((x) => (
                <OpsiPil key={x.kode} label={x.label} aktif={keyakinan === x.kode} onPress={() => setKeyakinan(keyakinan === x.kode ? null : x.kode)} />
              ))}
            </DaftarOpsi>
            <Text style={gaya.teksKecil}>{TEKS_KEYAKINAN.petunjuk}</Text>
          </View>
          <Tombol label={soal ? 'Lihat jawaban' : 'Lihat isi'} besar penuh onPress={() => setTerbuka(true)} />
        </>
      )}

      <Tombol label="Selesai sekarang" varian="hantu" onPress={() => onSelesai(catatan)} />
    </View>
  );
}

function LangkahSelesai({
  jumlahAntrian,
  catatan,
  simpan,
  onSimpanLagi,
  onUlangi,
  sedangMulai,
}: {
  jumlahAntrian: number;
  catatan: CatatanLatihan[];
  simpan: { isPending: boolean; isError: boolean; isSuccess: boolean };
  onSimpanLagi: () => void;
  onUlangi: () => void;
  sedangMulai: boolean;
}) {
  const router = useRouter();
  const dijawab = catatan.length;
  const benar = catatan.filter((c) => c.benar).length;

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul="Latihan Selesai" />
      <Kartu varian="brand">
        <Text style={s.angka}>
          {dijawab} dari {jumlahAntrian} kartu
        </Text>
        <Text style={s.ringkas}>
          {dijawab === 0
            ? 'Belum ada kartu yang dijawab.'
            : dijawab === jumlahAntrian
              ? `Beres. ${benar} benar dari ${dijawab}.`
              : `Berhenti sebelum selesai — tidak apa-apa. ${benar} benar dari ${dijawab}.`}
        </Text>
      </Kartu>

      {simpan.isPending ? (
        <Text style={gaya.teksKecil}>Menyimpan hasil…</Text>
      ) : simpan.isError ? (
        <View style={s.tumpuk}>
          <PesanGalat teks="Hasil latihan belum tersimpan." />
          <Tombol label="Coba lagi" varian="sekunder" onPress={onSimpanLagi} />
        </View>
      ) : simpan.isSuccess ? (
        <Text style={gaya.teksKecil}>Tersimpan di Riwayat Latihan.</Text>
      ) : null}

      <Tombol label="Ulangi" besar penuh proses={sedangMulai} onPress={onUlangi} />
      <Tombol label="Lihat riwayat latihan" varian="garis" penuh onPress={() => router.push('/latihan-riwayat')} />
      <Tombol label={TEKS_LEVELIN.lihatLevelIn} varian="garis" penuh onPress={() => router.push('/level-in')} />
      <Tombol label="Kembali ke Arsip" varian="hantu" onPress={() => router.replace('/arsip')} />
    </View>
  );
}

const s = StyleSheet.create({
  label: { ...teks.label, color: color.textMuted },
  singkat: { gap: spacing.s2, alignItems: 'flex-start' },
  progres: { gap: spacing.s2 },
  kartu: { gap: spacing.s3 },
  eyebrow: { ...teks.label, color: color.blue600 },
  judul: { ...teks.h3, color: color.textBody },
  jawaban: { gap: spacing.s1, padding: spacing.s3, borderRadius: radius.md, backgroundColor: color.statusOkBg },
  labelJawaban: { ...teks.label, color: color.statusOkFg, fontFamily: font.semibold },
  angka: { ...teks.h2, color: color.textBody },
  ringkas: { ...teks.bodySm, color: color.textMuted, marginTop: spacing.s1 },
  tumpuk: { gap: spacing.s2 },
  keyakinan: { gap: spacing.s2 },
});
