import React from 'react';
import { Article } from '@expo/html-elements';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { RingkasanMapel } from '../../api/types';
import { useKonfigLevelIn, useRingkasanLevelIn, useSaranHarian } from '../../hooks/useLevelIn';
import { useMapel } from '../../hooks/useMapel';
import { namaMapel } from '../../lib/arsip';
import { TEKS_LEVELIN as T, angkaKonfig, artiLevel, kartuSaran, kurangKartu, mapelDilatih, ringkasKeyakinan } from '../../lib/levelin';
import { color, font, radius, spacing, teks } from '../../theme/tokens';
import { Kartu, Kepala, Kosong, Lencana, Memuat, Peringatan, SeksiJudul, Tombol, gaya } from '../ui';

/**
 * Level-In (LANJUT_058) — hasil yang dihitung SERVER, untuk semua kelas 7–12
 * (tanpa gerbang kelas 12):
 *   - saran harian (/saran-harian) sebagai kartu terpisah, tombol ke Latihan;
 *   - per mapel yang sudah dilatih: level akurasi + arti satu kalimat, atau
 *     "Belum cukup data" + berapa kartu lagi (ambang dari /konfigurasi/levelin);
 *   - kalibrasi keyakinan bila datanya cukup, atau ajakan mengisi keyakinan.
 * Kosong (belum pernah latihan) → ajakan Latihan. Galat → pesan + Coba lagi.
 */
export function LevelInScreen() {
  const router = useRouter();
  const ringkasan = useRingkasanLevelIn();
  const saran = useSaranHarian();
  const konfig = useKonfigLevelIn();
  const mapelQuery = useMapel();
  const nama = (id: string) => namaMapel(id, mapelQuery.data);

  const kepala = <Kepala judul={T.judul} pengantar={T.pengantar} />;
  if (ringkasan.isPending) {
    return (
      <View style={gaya.layarIsiRapat}>
        {kepala}
        <Memuat />
      </View>
    );
  }
  if (ringkasan.isError) {
    return (
      <View style={gaya.layarIsiRapat}>
        {kepala}
        <Peringatan>{T.galat}</Peringatan>
        <Tombol
          label={T.cobaLagi}
          varian="sekunder"
          onPress={() => {
            ringkasan.refetch();
            saran.refetch();
            konfig.refetch();
          }}
        />
      </View>
    );
  }

  const dilatih = mapelDilatih(ringkasan.data);
  if (!dilatih.length) {
    return (
      <View style={gaya.layarIsiRapat}>
        {kepala}
        <Kosong
          judul={T.kosongJudul}
          teks={T.kosongIsi}
          aksi={<Tombol label={T.kosongAksi} varian="sekunder" onPress={() => router.push('/latihan')} />}
        />
      </View>
    );
  }

  const minimumLevel = angkaKonfig(konfig.data, 'level_minimum_kartu');
  const batas = { bawah: angkaKonfig(konfig.data, 'level_batas_bawah'), atas: angkaKonfig(konfig.data, 'level_batas_atas') };
  const keyakinan = ringkasKeyakinan(ringkasan.data, angkaKonfig(konfig.data, 'minimum_kartu'));

  return (
    <View style={gaya.layarIsiRapat}>
      {kepala}

      <View style={s.seksi}>
        <SeksiJudul>{T.seksiSaran}</SeksiJudul>
        {saran.isPending ? (
          <Memuat />
        ) : saran.isError ? (
          <Peringatan>{T.galat}</Peringatan>
        ) : (
          (() => {
            const k = kartuSaran(saran.data, nama);
            return (
              <Kartu varian="brand" style={s.saran}>
                <Text style={s.saranTeks}>{k.teks}</Text>
                <Tombol label={k.tombol} onPress={() => router.push(k.tujuan)} />
              </Kartu>
            );
          })()
        )}
      </View>

      <View style={s.seksi}>
        <SeksiJudul>{T.seksiMapel}</SeksiJudul>
        {dilatih.map((b) => (
          <BarisMapel key={b.mapel_id} baris={b} nama={nama(b.mapel_id)} minimum={minimumLevel} batas={batas} />
        ))}
      </View>

      <View style={s.seksi}>
        <SeksiJudul>{T.seksiKeyakinan}</SeksiJudul>
        <Kartu varian="soft" style={s.keyakinan}>
          {keyakinan.jenis === 'tanpa_data' ? (
            <Text style={gaya.teksBody}>{T.ajakanKeyakinan}</Text>
          ) : keyakinan.jenis === 'kurang' ? (
            <Text style={gaya.teksBody}>{keyakinan.kurang === null ? T.keyakinanKurangTanpaAngka : T.keyakinanKurang(keyakinan.kurang)}</Text>
          ) : (
            <>
              {keyakinan.terlaluYakin.map((id) => (
                <Text key={`oc-${id}`} style={gaya.teksBody}>
                  {T.terlaluYakin(nama(id))}
                </Text>
              ))}
              {keyakinan.pas.length ? <Text style={gaya.teksBody}>{T.pas(keyakinan.pas.map(nama).join(', '))}</Text> : null}
            </>
          )}
        </Kartu>
      </View>
    </View>
  );
}

function BarisMapel({
  baris,
  nama,
  minimum,
  batas,
}: {
  baris: RingkasanMapel;
  nama: string;
  minimum: number | null;
  batas: { bawah: number | null; atas: number | null };
}) {
  const { level, kartu_dijawab } = baris.level_akurasi;
  const belum = level === 'belum_cukup_data';
  const arti = belum ? null : artiLevel(level, batas);
  const kurang = belum ? kurangKartu(baris, minimum) : null;
  return (
    <Article>
      <Kartu style={s.kartu}>
        <View style={s.baris}>
          <Text style={s.judul}>{nama}</Text>
          <Lencana varian={belum ? 'neutral' : 'biasa'}>{belum ? T.belumCukup : arti!.label}</Lencana>
        </View>
        <Text style={gaya.teksKecil}>{T.kartuDijawab(kartu_dijawab)}</Text>
        <Text style={gaya.teksBody}>{belum ? (kurang === null ? T.kurangKartuTanpaAngka : T.kurangKartu(kurang)) : arti!.arti}</Text>
      </Kartu>
    </Article>
  );
}

const s = StyleSheet.create({
  seksi: { gap: spacing.s3 },
  saran: { gap: spacing.s3 },
  saranTeks: { ...teks.body, color: color.textBody },
  keyakinan: { gap: spacing.s2 },
  kartu: { padding: spacing.s3, borderRadius: radius.md, gap: spacing.s1 },
  baris: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s2 },
  judul: { ...teks.body, fontFamily: font.semibold, color: color.textBody, flex: 1 },
});
