import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { ApiError } from '../api/client';
import { eksporDataSaya, hapusAkunSaya, kirimKodeHapusAkun } from '../api/auth';
import { badanHapusAkun, namaBerkasEkspor, type MetodeKonfirmasi } from '../lib/dataAkun';
import { bagikanEkspor } from '../lib/eksporSementara';
import { useSesi } from '../providers/AuthProvider';

/** Peramban: berkas langsung terunduh. HP: berkas sementara dibagikan lewat expo-sharing. */
async function simpanBerkas(namaBerkas: string, isi: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([isi], { type: 'application/json' }));
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas;
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  let hasil: Awaited<ReturnType<typeof bagikanEkspor>>;
  try {
    hasil = await bagikanEkspor(namaBerkas, isi);
  } catch (err) {
    throw new ApiError(0, `Berkas gagal dibagikan: ${(err as Error).message}`, 'BAGIKAN_GAGAL');
  }
  if (hasil === 'tidak_tersedia') throw new ApiError(0, 'Berbagi berkas tidak tersedia.', 'BAGIKAN_TIDAK_TERSEDIA');
}

export function useUnduhDataSaya() {
  const { token, pengguna } = useSesi();
  return useMutation<void, ApiError>({
    mutationFn: async () => {
      const data = await eksporDataSaya(token!);
      await simpanBerkas(
        namaBerkasEkspor(pengguna?.nama_pengguna ?? 'akun', new Date().toISOString()),
        JSON.stringify(data, null, 2)
      );
    },
  });
}

export function useKirimKodeHapus() {
  const { token } = useSesi();
  return useMutation<unknown, ApiError>({ mutationFn: () => kirimKodeHapusAkun(token!) });
}

type IsianHapus = { metode: MetodeKonfirmasi; kataSandi: string; kodeEmail: string };

export function useHapusAkun() {
  const { token, selesaiHapusAkun } = useSesi();
  return useMutation<unknown, ApiError, IsianHapus>({
    mutationFn: (isian) => hapusAkunSaya(token!, badanHapusAkun(isian)),
    onSuccess: () => selesaiHapusAkun(),
  });
}
