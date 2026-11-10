// Konfigurasi bawaan Expo. Satu tambahan (LANJUT_011): saat EXPO_PUBLIC_PORTOFOLIO bukan '1', berkas
// rute portofolio dikeluarkan dari bundel. Expo Router mendaftarkan rute dari berkas, jadi hanya
// dengan cara ini rutenya benar-benar tidak ada saat saklar mati.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_PUBLIC_PORTOFOLIO !== '1') {
  config.resolver.blockList = [
    ...[].concat(config.resolver.blockList || []),
    /[\\/]app[\\/]\(app\)[\\/]portofolio(-[a-z]+)?\.tsx$/,
  ];
}

module.exports = config;
