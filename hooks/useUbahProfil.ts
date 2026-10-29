import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as authApi from '../api/auth';
import type { DataUbahProfil } from '../api/auth';
import { useSesi } from '../providers/AuthProvider';

// Data Akun — PATCH /pengguna/saya (pengguna.rute.js, dijaga wajibLogin).
// Tampilan hanya berubah setelah server menjawab sukses: yang tampil selalu
// yang benar-benar tersimpan, tidak ada pembaruan optimistis.
export function useUbahProfil() {
  const { token, perbaruiPengguna } = useSesi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DataUbahProfil) => authApi.ubahProfil(token!, data),
    onSuccess: async (profil) => {
      await perbaruiPengguna(profil);
      // LANJUT_079: kelas, rumpun, dan mapel pilihan menentukan isi Pilih Mapel.
      await qc.invalidateQueries({ queryKey: ['pilihan_mapel'] });
    },
  });
}
