import { useMutation } from '@tanstack/react-query';
import { Platform, Share } from 'react-native';

import { ApiError } from '../api/client';
import { eksporDataSaya, hapusAkunSaya, kirimKodeHapusAkun } from '../api/auth';
import { BATAS_BAGIKAN_HP, badanHapusAkun, namaBerkasEkspor, type MetodeKonfirmasi } from '../lib/dataAkun';
import { useSesi } from '../providers/AuthProvider';

/** Peramban: berkas langsung terunduh. HP: lembar bagikan bawaan, karena app belum punya modul berkas. */
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
  if (isi.length > BATAS_BAGIKAN_HP) throw new ApiError(0, 'Data terlalu besar untuk lembar bagikan.', 'TERLALU_BESAR_HP');
  await Share.share({ title: namaBerkas, message: isi });
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
