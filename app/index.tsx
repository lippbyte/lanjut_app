import React from 'react';
import { Redirect } from 'expo-router';

// Index diarahkan ke Linimasa: SDD Bagian 14 "Alur A" menyebut Linimasa
// sebagai "NILAI PERTAMA" yang wajib terlihat begitu pengguna baru masuk,
// jadi rute "/" tidak boleh punya isi sendiri yang bersaing dengan itu.
export default function IndexRoute() {
  return <Redirect href="/linimasa" />;
}
