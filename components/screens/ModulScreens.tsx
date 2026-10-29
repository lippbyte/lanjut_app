import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import type { ModulRingkas } from '../../api/types';
import { useMapel } from '../../hooks/useMapel';
import {
  useCariModul,
  useHapusModul,
  useHapusSemuaModul,
  useModul,
  useModulSaya,
  useUnggahModul,
} from '../../hooks/useModul';
import { namaMapel } from '../../lib/arsip';
import { formatTanggal } from '../../lib/linimasa';
import { LABEL_JENIS, TEKS_MODUL as T, pesanGalatModul, pilihBerkas, ukuranTeks, type BerkasTerpilih } from '../../lib/modul';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Ikon, Kartu, KeadaanGalat, Kepala, Kosong, Lencana, Memuat, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';

/**
 * LANJUT_049 — modul di Arsip Belajar: materi yang diunggah siswa, disimpan
 * sebagai TEKS saja (berkas asli tidak disimpan server). Teks salinan §4.5
 * (LANJUT_049), DRAF. Tidak ada AI di layar ini, tetapi sejak LANJUT_055
 * potongan modul yang berkaitan bisa dikirim ke penyedia AI saat siswa
 * bertanya materi di Ngobrol (lihat docs/alur-data-ai-materi.md).
 */

/** Bagian "Modul" di layar Arsip Belajar. */
export function BagianModul() {
  const router = useRouter();
  const modulQuery = useModulSaya();
  const mapelQuery = useMapel();
  const hapusSemua = useHapusSemuaModul();
  const [yakinHapusSemua, setYakinHapusSemua] = useState(false);

  const isi = () => {
    if (modulQuery.isPending) return <Memuat />;
    if (modulQuery.isError) return <KeadaanGalat />;
    if (!modulQuery.data.length) return <Text style={gaya.teksKecil}>{T.kosong}</Text>;
    return (
      <>
        <View style={s.daftar}>
          {modulQuery.data.map((m) => (
            <BarisModul
              key={m.id}
              modul={m}
              namaMapel={namaMapel(m.mapel_id, mapelQuery.data)}
              onPress={() => router.push({ pathname: '/arsip-modul', params: { id: m.id } })}
            />
          ))}
        </View>
        <CariModul onBuka={(id) => router.push({ pathname: '/arsip-modul', params: { id } })} />
        {yakinHapusSemua ? (
          <Kartu varian="soft" style={s.konfirmasi}>
            <Text style={gaya.teksBody}>{T.hapusSemuaYakin}</Text>
            {hapusSemua.isError ? <Text style={s.galat}>{T.hapusGagal}</Text> : null}
            <View style={s.aksi}>
              <Tombol label={T.batal} varian="hantu" onPress={() => setYakinHapusSemua(false)} />
              <Tombol
                label={T.hapusSemuaYa}
                proses={hapusSemua.isPending}
                onPress={() => hapusSemua.mutate(undefined, { onSuccess: () => setYakinHapusSemua(false) })}
              />
            </View>
          </Kartu>
        ) : (
          <Tombol label={T.hapusSemua} varian="hantu" onPress={() => setYakinHapusSemua(true)} />
        )}
      </>
    );
  };

  return (
    <View style={s.bagian}>
      <SeksiJudul>{T.seksi}</SeksiJudul>
      <Text style={gaya.teksKecil}>{T.pengantar}</Text>
      <Tombol label={T.tombolUnggah} varian="sekunder" besar penuh onPress={() => router.push('/arsip-modul-unggah')} />
      {isi()}
    </View>
  );
}

function BarisModul({ modul: m, namaMapel: mapel, onPress }: { modul: ModulRingkas; namaMapel: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => (pressed ? s.ditekan : undefined)}>
      <Kartu style={s.kartu}>
        <View style={s.baris}>
          <View style={s.barisIsi}>
            <Text style={s.judul} numberOfLines={2}>
              {m.judul}
            </Text>
            <View style={s.lencana}>
              <Lencana varian="neutral">{mapel}</Lencana>
              <Lencana varian="neutral">{LABEL_JENIS[m.jenis]}</Lencana>
            </View>
            <Text style={s.caption}>Diunggah {formatTanggal(m.diunggah_pada)}</Text>
          </View>
          <Ikon nama="panah" ukuran={16} warna={color.ink500} />
        </View>
      </Kartu>
    </Pressable>
  );
}

function CariModul({ onBuka }: { onBuka: (id: string) => void }) {
  const [kata, setKata] = useState('');
  const [q, setQ] = useState('');
  const [pendek, setPendek] = useState(false);
  const cari = useCariModul(q);
  const kirim = () => {
    const bersih = kata.trim();
    setPendek(bersih.length < 3);
    if (bersih.length >= 3) setQ(bersih);
  };

  return (
    <View style={s.cari}>
      <View style={s.cariBaris}>
        <View style={s.flex}>
          <Input value={kata} onChangeText={setKata} placeholder={T.cariPlaceholder} onSubmitEditing={kirim} returnKeyType="search" />
        </View>
        <Tombol label={T.cariTombol} varian="sekunder" onPress={kirim} />
      </View>
      {pendek ? <Text style={s.caption}>{T.cariPendek}</Text> : null}
      {q && !pendek ? (
        cari.isPending ? (
          <Memuat />
        ) : cari.isError ? (
          <KeadaanGalat />
        ) : (
          <View style={s.daftar}>
            <Text style={s.label}>{T.cariJudul}</Text>
            {cari.data.hasil.length ? (
              cari.data.hasil.map((h) => (
                <Pressable key={`${h.modul_id}-${h.urutan}`} onPress={() => onBuka(h.modul_id)} accessibilityRole="link">
                  <Kartu style={s.kartu}>
                    <Text style={s.judulKecil}>{h.judul}</Text>
                    <Text style={gaya.teksKecil} numberOfLines={4}>
                      {h.potongan}
                    </Text>
                  </Kartu>
                </Pressable>
              ))
            ) : (
              <Text style={gaya.teksKecil}>{T.cariKosong}</Text>
            )}
          </View>
        )
      ) : null}
    </View>
  );
}

/** `/arsip-modul?id=` — isi lengkap satu modul sendiri, sebagai teks biasa. */
export function ArsipModulScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const modulQuery = useModul(id);
  const mapelQuery = useMapel();
  const hapus = useHapusModul();
  const [yakin, setYakin] = useState(false);

  if (modulQuery.isPending && id) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  const tidakAda = !id || (modulQuery.error instanceof ApiError && modulQuery.error.status === 404);
  if (tidakAda) {
    return (
      <View style={gaya.layarIsiRapat}>
        <Kosong
          judul={T.tidakDitemukan}
          teks={T.tidakDitemukanTeks}
          aksi={<Tombol label={T.kembali} varian="sekunder" onPress={() => router.replace('/arsip')} />}
        />
      </View>
    );
  }
  if (modulQuery.isError || !modulQuery.data) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;
  const m = modulQuery.data;

  return (
    <View style={gaya.layarIsiRapat}>
      <View style={s.lencana}>
        <Lencana varian="neutral">{namaMapel(m.mapel_id, mapelQuery.data)}</Lencana>
        <Lencana varian="neutral">{LABEL_JENIS[m.jenis]}</Lencana>
      </View>
      <Text style={s.judulBesar} role="heading">
        {m.judul}
      </Text>
      <Text style={s.caption}>
        Diunggah {formatTanggal(m.diunggah_pada)}
        {m.nama_berkas ? ` · ${m.nama_berkas}` : ''} · {m.jumlah_karakter.toLocaleString('id-ID')} karakter
      </Text>
      <Kartu>
        <Text style={s.isi} selectable>
          {m.isi}
        </Text>
      </Kartu>
      {yakin ? (
        <Kartu varian="soft" style={s.konfirmasi}>
          <Text style={gaya.teksBody}>{T.hapusYakin}</Text>
          {hapus.isError ? <Text style={s.galat}>{T.hapusGagal}</Text> : null}
          <View style={s.aksi}>
            <Tombol label={T.batal} varian="hantu" onPress={() => setYakin(false)} />
            <Tombol
              label={T.hapusYa}
              proses={hapus.isPending}
              onPress={() => hapus.mutate(m.id, { onSuccess: () => router.replace('/arsip') })}
            />
          </View>
        </Kartu>
      ) : (
        <Tombol label={T.hapus} varian="hantu" onPress={() => setYakin(true)} />
      )}
    </View>
  );
}

type Sumber = 'berkas' | 'tempel';
type GalatForm = Partial<Record<'mapel_id' | 'judul' | 'berkas' | 'teks', string>>;

/** `/arsip-modul-unggah` — pilih berkas atau tempel teks, judul, mapel. */
export function ArsipModulUnggahScreen() {
  const router = useRouter();
  const mapelQuery = useMapel();
  const unggah = useUnggahModul();
  const [sumber, setSumber] = useState<Sumber>('berkas');
  const [berkas, setBerkas] = useState<BerkasTerpilih | null>(null);
  const [pemilihTidakAda, setPemilihTidakAda] = useState(false);
  const [teksTempel, setTeksTempel] = useState('');
  const [judul, setJudul] = useState('');
  const [mapelId, setMapelId] = useState<string | null>(null);
  const [galat, setGalat] = useState<GalatForm>({});

  if (mapelQuery.isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (mapelQuery.isError) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;

  const pilih = async () => {
    const hasil = await pilihBerkas();
    if (hasil === 'tidak_tersedia') {
      setPemilihTidakAda(true);
      setSumber('tempel');
      return;
    }
    if (hasil) {
      setBerkas(hasil);
      setGalat((g) => ({ ...g, berkas: undefined }));
      // Judul diisi dari nama berkas bila masih kosong; siswa boleh mengubahnya.
      if (!judul.trim()) setJudul(hasil.nama.replace(/\.(txt|md|pdf)$/i, '').slice(0, 200));
    }
  };

  const kirim = () => {
    const cek: GalatForm = {};
    if (!mapelId) cek.mapel_id = T.galatMapel;
    if (!judul.trim()) cek.judul = T.galatJudul;
    if (sumber === 'berkas' && !berkas) cek.berkas = T.galatBerkas;
    if (sumber === 'tempel' && !teksTempel.trim()) cek.teks = T.galatTeks;
    setGalat(cek);
    if (Object.keys(cek).length || !mapelId) return;
    const dasar = { judul: judul.trim(), mapel_id: mapelId };
    unggah.mutate(sumber === 'berkas' && berkas ? { ...dasar, berkas } : { ...dasar, teks: teksTempel }, {
      onSuccess: (m) => router.replace({ pathname: '/arsip-modul', params: { id: m.id } }),
    });
  };

  const medan = unggah.error instanceof ApiError ? unggah.error.medan : undefined;
  const galatDari = (k: keyof GalatForm) => galat[k] ?? medan?.[k];

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.formJudul} />
      <Kartu varian="soft" style={s.peringatan}>
        <Text style={s.peringatanJudul} role="heading" aria-level={2}>
          {T.peringatanJudul}
        </Text>
        {T.peringatan.map((p) => (
          <View key={p} style={s.butir}>
            <Text style={gaya.teksKecil}>•</Text>
            <Text style={[gaya.teksKecil, s.flex]}>{p}</Text>
          </View>
        ))}
      </Kartu>

      <DaftarOpsi>
        <OpsiPil label={T.sumberBerkas} aktif={sumber === 'berkas'} onPress={() => setSumber('berkas')} />
        <OpsiPil label={T.sumberTempel} aktif={sumber === 'tempel'} onPress={() => setSumber('tempel')} />
      </DaftarOpsi>
      {pemilihTidakAda ? <Text style={s.caption}>{T.pemilihTidakAda}</Text> : null}

      {sumber === 'berkas' ? (
        <Field label="Berkas" hint={berkas ? undefined : T.berkasPetunjuk} galat={galatDari('berkas')}>
          {berkas ? (
            <Text style={gaya.teksBody}>
              {berkas.nama}
              {berkas.ukuran !== null ? ` (${ukuranTeks(berkas.ukuran)})` : ''}
            </Text>
          ) : null}
          <View style={s.aksiKiri}>
            <Tombol label={berkas ? T.gantiBerkas : T.pilihBerkas} varian="garis" onPress={pilih} />
          </View>
        </Field>
      ) : (
        <Field label={T.teksLabel} galat={galatDari('teks')}>
          <Input
            value={teksTempel}
            onChangeText={(v) => {
              setTeksTempel(v);
              setGalat((g) => ({ ...g, teks: undefined }));
            }}
            placeholder={T.teksPlaceholder}
            multiline
            autoCapitalize="sentences"
            style={s.area}
            textAlignVertical="top"
          />
        </Field>
      )}

      <Field label="Judul" galat={galatDari('judul')}>
        <Input
          value={judul}
          onChangeText={(v) => {
            setJudul(v);
            setGalat((g) => ({ ...g, judul: undefined }));
          }}
          placeholder={T.judulPlaceholder}
          maxLength={200}
          autoCapitalize="sentences"
        />
      </Field>
      <Field label="Mapel" galat={galatDari('mapel_id')}>
        <DaftarOpsi>
          {(mapelQuery.data ?? []).map((m) => (
            <OpsiPil
              key={m.id}
              label={m.nama}
              aktif={mapelId === m.id}
              onPress={() => {
                setMapelId(m.id);
                setGalat((g) => ({ ...g, mapel_id: undefined }));
              }}
            />
          ))}
        </DaftarOpsi>
      </Field>

      <PesanGalat teks={unggah.isError ? pesanGalatModul(unggah.error) : null} />
      <Tombol label={unggah.isPending ? T.mengunggah : T.tombolUnggah} besar penuh proses={unggah.isPending} onPress={kirim} />
    </View>
  );
}

const s = StyleSheet.create({
  bagian: { gap: spacing.s3, marginTop: spacing.s4 },
  daftar: { gap: spacing.s2 },
  kartu: { padding: spacing.s3, borderRadius: radius.md, gap: spacing.s1 },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3 },
  barisIsi: { flex: 1, minWidth: 0, gap: spacing.s2 },
  judul: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  judulKecil: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  judulBesar: { ...teks.h2, color: color.textBody },
  lencana: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  caption: { ...teks.caption, color: color.textMuted },
  label: { ...teks.label, color: color.blue600 },
  isi: { ...teks.body, color: color.textBody },
  cari: { gap: spacing.s2, marginTop: spacing.s2 },
  cariBaris: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
  flex: { flex: 1 },
  konfirmasi: { gap: spacing.s3 },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s2 },
  aksiKiri: { flexDirection: 'row' },
  galat: { ...teks.caption, color: color.blue600 },
  ditekan: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  peringatan: { gap: spacing.s2 },
  peringatanJudul: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  butir: { flexDirection: 'row', gap: spacing.s2 },
  area: { minHeight: 160, paddingTop: spacing.s3 },
});
