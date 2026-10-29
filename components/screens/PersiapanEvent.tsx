import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import type { EventSekolah, IsiEvent, JenisEvent } from '../../api/types';
import { useEventSekolah, useHapusEvent, usePilihanKartuEvent, useSimpanEvent } from '../../hooks/useEventSekolah';
import { useMapel } from '../../hooks/useMapel';
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
  untukPersiapanEvent,
} from '../../lib/eventSekolah';
import { formatTanggal } from '../../lib/linimasa';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Kartu, SeksiJudul, Tombol, gaya } from '../ui';
import { DaftarOpsi, Field, Input, OpsiPil, PesanGalat } from './auth/AuthUI';

/**
 * Persiapan Event di Daftar Periksa SMP, kelas 7–9 (LANJUT_076; LANJUT_076b
 * membatasinya ke SMP). Tampil HANYA bila GET /pengguna/event berhasil: saklar
 * event_sekolah_aktif mati, kebijakan belum diterima, kelas lain, memuat, atau
 * gagal → komponen ini tidak merender apa pun. Kelas 10–12 tidak pernah memakainya.
 */
export function PersiapanEvent() {
  const { pengguna } = useSesi();
  const aktif = untukPersiapanEvent(pengguna?.kelas);
  const eventQuery = useEventSekolah(aktif);
  const { data: mapel } = useMapel();
  const [form, setForm] = useState<{ event?: EventSekolah } | null>(null);
  const [lihatLewat, setLihatLewat] = useState(false);

  if (!aktif || eventQuery.isError || !eventQuery.data) return null;

  const { mendatang, lewat } = pisahEvent(eventQuery.data);
  const namaMapel = (id: string | null) => (id ? mapel?.find((m) => m.id === id)?.nama : undefined);

  return (
    <View style={s.seksi}>
      <SeksiJudul>{TEKS_EVENT.judul}</SeksiJudul>
      <Text style={gaya.teksKecil}>{TEKS_EVENT.pengantar}</Text>

      {form ? (
        <FormEvent key={form.event?.id ?? 'baru'} awal={form.event} onSelesai={() => setForm(null)} />
      ) : (
        <Tombol label={TEKS_EVENT.tombolTambah} varian="sekunder" penuh onPress={() => setForm({})} />
      )}

      {mendatang.length ? (
        mendatang.map((e) => <KartuEvent key={e.id} event={e} namaMapel={namaMapel(e.mapel_id)} onUbah={() => setForm({ event: e })} />)
      ) : (
        <Text style={gaya.teksKecil}>{TEKS_EVENT.kosong}</Text>
      )}

      {/* Event lewat tidak di daftar utama, tetapi tetap ada sampai dihapus sendiri. */}
      {lewat.length ? (
        <Pressable onPress={() => setLihatLewat((v) => !v)} accessibilityRole="button" aria-expanded={lihatLewat} style={s.tautanBaris}>
          <Text style={s.tautan}>{lihatLewat ? TEKS_EVENT.sembunyikanLewat : `${TEKS_EVENT.lihatLewat} (${lewat.length})`}</Text>
        </Pressable>
      ) : null}
      {lihatLewat
        ? lewat.map((e) => <KartuEvent key={e.id} event={e} namaMapel={namaMapel(e.mapel_id)} lewat onUbah={() => setForm({ event: e })} />)
        : null}
    </View>
  );
}

function KartuEvent({
  event,
  namaMapel,
  lewat = false,
  onUbah,
}: {
  event: EventSekolah;
  namaMapel?: string;
  lewat?: boolean;
  onUbah: () => void;
}) {
  const router = useRouter();
  const hapus = useHapusEvent();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [panelTerbuka, setPanelTerbuka] = useState(false);
  const jenis = labelJenis(event.jenis);
  const judul = namaMapel ? `${jenis} · ${namaMapel}` : jenis;
  const hitung = lewat ? TEKS_EVENT.sudahLewat : teksHitungMundur(selisihHari(event.tanggal) ?? 0);
  // LANJUT_076b: keterangan & tombol materi diputuskan lib (tampilanMateri), dari data server.
  const materi = tampilanMateri(event);
  const kurasi = event.materi?.tersedia && event.materi.jenis === 'kurasi' ? event.materi : null;

  return (
    <Kartu style={s.event}>
      <View style={s.baris}>
        <Text style={s.eventJudul}>{judul}</Text>
        <Text style={s.hitung}>{hitung}</Text>
      </View>
      <Text style={s.tanggal}>{formatTanggal(event.tanggal)}</Text>
      {event.materi_teks ? <Text style={s.materi}>{event.materi_teks}</Text> : null}
      {materi.keterangan ? <Text style={materi.buka ? s.sumber : s.tidakTersedia}>{materi.keterangan}</Text> : null}
      {kurasi && panelTerbuka ? (
        <View style={s.panel}>
          <Text style={s.panelJudul}>{kurasi.judul}</Text>
          <Text style={s.materi}>{kurasi.isi}</Text>
        </View>
      ) : null}
      {konfirmasi ? (
        <View style={s.konfirmasi}>
          <Text style={gaya.teksKecil}>{TEKS_EVENT.konfirmasiHapus}</Text>
          <View style={s.aksi}>
            <Tombol label={TEKS_EVENT.yaHapus} varian="garis" kecil proses={hapus.isPending} onPress={() => hapus.mutate(event.id)} />
            <Tombol label={TEKS_EVENT.tombolBatal} varian="hantu" kecil onPress={() => setKonfirmasi(false)} />
          </View>
          <PesanGalat teks={hapus.isError ? TEKS_EVENT.galatSimpan : null} />
        </View>
      ) : (
        <View style={s.aksi}>
          {materi.buka === 'arsip' ? (
            <Tombol
              label={TEKS_EVENT.bukaMateri}
              varian="sekunder"
              kecil
              onPress={() => router.push({ pathname: '/arsip-kartu', params: { id: event.kartu_id! } })}
            />
          ) : null}
          {materi.buka === 'panel' ? (
            <Tombol
              label={panelTerbuka ? TEKS_EVENT.tutupMateri : TEKS_EVENT.bukaMateri}
              varian="sekunder"
              kecil
              onPress={() => setPanelTerbuka((v) => !v)}
            />
          ) : null}
          <Tombol label={TEKS_EVENT.ubah} varian="hantu" kecil onPress={onUbah} />
          <Tombol label={TEKS_EVENT.hapus} varian="hantu" kecil onPress={() => setKonfirmasi(true)} />
        </View>
      )}
    </Kartu>
  );
}

/** Tambah (tanpa `awal`) atau ubah event. Pemeriksaan isian di lib/eventSekolah.ts; server memeriksa ulang. */
function FormEvent({ awal, onSelesai }: { awal?: EventSekolah; onSelesai: () => void }) {
  const { pengguna } = useSesi();
  const simpan = useSimpanEvent();
  const { data: mapel } = useMapel();
  const { data: pilihanKartu } = usePilihanKartuEvent(true);
  const [jenis, setJenis] = useState<JenisEvent | null>(awal?.jenis ?? null);
  const [tanggal, setTanggal] = useState(awal?.tanggal ?? '');
  const [mapelId, setMapelId] = useState<string | null>(awal?.mapel_id ?? null);
  const [materi, setMateri] = useState(awal?.materi_teks ?? '');
  const [kartuId, setKartuId] = useState<string | null>(awal?.kartu_id ?? null);
  const [galat, setGalat] = useState<ReturnType<typeof periksaIsianEvent>>({});
  // Galat satu medan hilang begitu medan itu diubah (diperiksa ulang saat Simpan).
  const hapusGalat = (medan: keyof typeof galat) => setGalat((g) => ({ ...g, [medan]: undefined }));

  // LANJUT_076b: kartu milik sendiri + kurasi terverifikasi (disusun server), disaring mapel yang dipilih.
  const kartuPilihan = (pilihanKartu ?? []).filter((k) => !mapelId || k.mapel_id === mapelId);

  const pilihMapel = (id: string) => {
    const baru = mapelId === id ? null : id;
    setMapelId(baru);
    // Kartu yang sudah dipilih tetap hanya bila mapelnya cocok dengan mapel baru.
    if (kartuId && baru && pilihanKartu?.find((k) => k.id === kartuId)?.mapel_id !== baru) setKartuId(null);
  };

  const kirim = () => {
    const periksa = periksaIsianEvent({ jenis, tanggal, materi });
    setGalat(periksa);
    if (Object.keys(periksa).length || !jenis) return;
    const isi: IsiEvent = { jenis, tanggal: tanggal.trim(), mapel_id: mapelId, materi_teks: materi.trim() || null };
    // Saat mengubah, kartu_id hanya dikirim bila diganti: tautan yang sudah tidak tersedia
    // tidak ikut diperiksa ulang (dan tidak diubah) saat isian lain disimpan.
    if (!awal || kartuId !== awal.kartu_id) isi.kartu_id = kartuId;
    simpan.mutate({ id: awal?.id, isi }, { onSuccess: onSelesai });
  };

  const kodeGalat = simpan.error instanceof ApiError ? simpan.error.kode : undefined;

  return (
    <Kartu varian="soft" style={s.form}>
      <Field label={TEKS_EVENT.labelJenis} galat={galat.jenis}>
        <DaftarOpsi>
          {pilihanJenis(pengguna?.kelas, awal?.jenis).map((p) => (
            <OpsiPil
              key={p.nilai}
              label={p.label}
              aktif={jenis !== null && labelJenis(jenis) === p.label}
              onPress={() => {
                // UAS lama dan PAS sama-sama "UAS/PAS": nilai tersimpan tidak diganti bila label sama.
                if (!jenis || labelJenis(jenis) !== p.label) setJenis(p.nilai);
                hapusGalat('jenis');
              }}
            />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label={TEKS_EVENT.labelTanggal} hint={TEKS_EVENT.petunjukTanggal} galat={galat.tanggal}>
        <Input
          value={tanggal}
          onChangeText={(t) => {
            setTanggal(t);
            hapusGalat('tanggal');
          }}
          placeholder="2026-11-03"
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
      </Field>
      <Field label={TEKS_EVENT.labelMapel} labelTambahan={`(${TEKS_EVENT.opsional})`}>
        <DaftarOpsi>
          {(mapel ?? []).map((m) => (
            <OpsiPil key={m.id} label={m.nama} aktif={mapelId === m.id} onPress={() => pilihMapel(m.id)} />
          ))}
        </DaftarOpsi>
      </Field>
      <Field label={TEKS_EVENT.labelMateri} labelTambahan={`(${TEKS_EVENT.opsional})`} galat={galat.materi_teks}>
        {/* Petunjuk wajib selalu tampil (LANJUT_076 §F.22), tidak tergantikan pesan galat. */}
        <Text style={s.petunjuk}>{TEKS_EVENT.petunjukMateri}</Text>
        <Input
          value={materi}
          onChangeText={(t) => {
            setMateri(t);
            hapusGalat('materi_teks');
          }}
          multiline
          maxLength={MAKS_MATERI}
        />
      </Field>
      <Field
        label={TEKS_EVENT.labelKartu}
        labelTambahan={`(${TEKS_EVENT.opsional})`}
        galat={kodeGalat === 'KARTU_TIDAK_SAH' ? TEKS_EVENT.galatKartu : undefined}
      >
        {kartuPilihan.length ? (
          <DaftarOpsi>
            {kartuPilihan.map((k) => (
              <OpsiPil
                key={k.id}
                label={k.sumber_nama ? `${k.judul} · ${TEKS_EVENT.awalanSumber} ${k.sumber_nama}` : k.judul}
                aktif={kartuId === k.id}
                onPress={() => setKartuId(kartuId === k.id ? null : k.id)}
              />
            ))}
          </DaftarOpsi>
        ) : (
          <Text style={gaya.teksKecil}>{TEKS_EVENT.kartuKosong}</Text>
        )}
      </Field>
      <PesanGalat teks={simpan.isError && kodeGalat !== 'KARTU_TIDAK_SAH' ? TEKS_EVENT.galatSimpan : null} />
      <View style={s.aksiForm}>
        <Tombol label={TEKS_EVENT.tombolBatal} varian="hantu" onPress={onSelesai} />
        <Tombol label={TEKS_EVENT.tombolSimpan} proses={simpan.isPending} onPress={kirim} />
      </View>
    </Kartu>
  );
}

const s = StyleSheet.create({
  seksi: { gap: spacing.s3 },
  event: { gap: spacing.s1, padding: spacing.s4, borderRadius: radius.md },
  baris: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.s3 },
  eventJudul: { ...teks.body, fontFamily: font.semibold, color: color.textBody, flex: 1 },
  hitung: { ...teks.caption, fontFamily: font.semibold, color: color.blue600 },
  tanggal: { ...teks.caption, color: color.textMuted },
  materi: { ...teks.bodySm, color: color.textBody },
  sumber: { ...teks.caption, color: color.textMuted },
  tidakTersedia: { ...teks.caption, fontStyle: 'italic', color: color.textMuted },
  panel: { gap: spacing.s1, marginTop: spacing.s2, padding: spacing.s3, borderRadius: radius.md, backgroundColor: color.surfacePage },
  panelJudul: { ...teks.bodySm, fontFamily: font.semibold, color: color.textBody },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2, marginTop: spacing.s2 },
  konfirmasi: { gap: spacing.s1, marginTop: spacing.s2 },
  form: { gap: spacing.s4 },
  petunjuk: { ...teks.caption, color: color.textMuted },
  aksiForm: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s2 },
  tautanBaris: { minHeight: 44, justifyContent: 'center' },
  tautan: { ...teks.bodySm, fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline' },
});
