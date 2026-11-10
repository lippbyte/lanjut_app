import type { ExpoConfig } from 'expo/config';

/**
 * app.json digantikan app.config.ts (bukan dipakai berdampingan) supaya base
 * URL API bisa dihitung dari kode, bukan nilai statis. Berkas ini HANYA
 * menaruh tiga kandidat URL di `extra` (prod/dev-android/dev-web) — pilihan
 * MANA yang dipakai ditentukan saat runtime di `api/client.ts` lewat
 * `__DEV__` + `Platform.OS`, BUKAN di sini, karena `__DEV__` dan `Platform`
 * adalah global Metro/React Native yang hanya ada di runtime bundel JS,
 * tidak tersedia saat berkas config ini dieksekusi Expo CLI di proses Node
 * biasa (config-time, bukan run-time).
 */
// "Dev Android" dan "dev Web" WAJIB dibedakan: "localhost" di dalam proses
// Android (emulator MAUPUN device fisik) merujuk ke perangkat itu sendiri,
// BUKAN komputer yang menjalankan `npm start` di server/, sedangkan target
// Web berjalan langsung di browser komputer itu sendiri sehingga "localhost"
// justru benar untuknya. 10.0.2.2 adalah alias loopback host khusus emulator
// Android Studio. Untuk device Android FISIK, override lewat env var di bawah
// dengan IP LAN komputer (mis. http://192.168.x.x:4000/api/v1 — pola yang
// sama dipakai saat menguji PWA v1 langsung di HP).
// Build EAS selain profil development (preview, production) tidak membawa
// alamat dev sama sekali; di build rilis `__DEV__` false sehingga tidak dipakai.
// EAS_BUILD_PROFILE hanya ada di worker EAS, tidak saat `eas build` membaca config lokal.
const profilEas = process.env.EAS_BUILD_PROFILE;
const tanpaUrlDev = profilEas !== undefined && profilEas !== 'development';
const API_URL_DEV_ANDROID = tanpaUrlDev
  ? undefined
  : process.env.EXPO_PUBLIC_API_URL_DEV_ANDROID || 'http://10.0.2.2:4000/api/v1';
const API_URL_DEV_WEB = tanpaUrlDev
  ? undefined
  : process.env.EXPO_PUBLIC_API_URL_DEV_WEB || 'http://localhost:4000/api/v1';

// URL API produksi, dari variabel lingkungan (EAS: environment production/preview).
// Tidak ada nilai cadangan: build tanpa URL dibatalkan di bawah (LANJUT_061).
const API_URL_PROD =
  process.env.EXPO_PUBLIC_API_URL_PROD || process.env.EXPO_PUBLIC_API_URL || undefined;

// Satu URL yang mengalahkan ketiga kandidat di atas, di semua platform & mode.
// Dipakai build APK preview / production (eas.json) atau override lingkungan lokal.
const API_URL_OVERRIDE = process.env.EXPO_PUBLIC_API_URL || undefined;

// Build tanpa URL API harus gagal dengan pesan yang jelas (LANJUT_061, LANJUT_062):
const isEasBuild = process.env.EAS_BUILD === 'true';
const isProdEnv = process.env.NODE_ENV === 'production';
const isExport = process.argv.some((arg) => arg === 'export');
const targetApiUrl = API_URL_OVERRIDE || API_URL_PROD;

if ((isEasBuild || isProdEnv || isExport) && !targetApiUrl) {
  throw new Error(
    '[app.config.ts] Build dibatalkan: EXPO_PUBLIC_API_URL belum diisi. ' +
      'Isi di variabel lingkungan EAS (environment profil build) atau lingkungan lokal sebelum melakukan build.'
  );
}

// Build release Android memblokir http:// polos; hanya dibuka kalau build ini
// memang diarahkan ke backend http (mis. IP LAN saat pengujian dev), bukan untuk rilis https.
const IZINKAN_HTTP = targetApiUrl?.startsWith('http://') ?? false;

// usesCleartextTraffic hanya untuk build uji (profil development/preview, mis. ke IP server);
// profil lain (production, apk-sekolah) wajib https, jadi build ke http:// dibatalkan.
const PROFIL_UJI = ['development', 'preview'];
if (profilEas !== undefined && !PROFIL_UJI.includes(profilEas) && IZINKAN_HTTP) {
  throw new Error(
    `[app.config.ts] Build profil ${profilEas} dibatalkan: EXPO_PUBLIC_API_URL "${targetApiUrl}" memakai http://. ` +
      'Profil rilis wajib https://; http:// hanya untuk profil uji (preview).'
  );
}

// LANJUT_011: portofolio MATI kecuali build dibuat dengan EXPO_PUBLIC_PORTOFOLIO=1. Saat mati,
// plugin pemilih foto tidak dipasang dan izin kamera dicabut, jadi APK tidak meminta apa pun untuknya.
const PORTOFOLIO_AKTIF = process.env.EXPO_PUBLIC_PORTOFOLIO === '1';

const config: ExpoConfig = {
  name: 'LANJUT',
  slug: 'lanjut',
  owner: 'lippbyte',
  scheme: 'lanjut',
  // Satu-satunya sumber versi (eas.json appVersionSource "local"). Format X.Y.Z, sama dengan
  // releases.json landing. versionCode di bawah naik tiap build yang dibagikan (1 = preview lama).
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  // Ikon status bar gelap sejak aplikasi dibuka (sebelum JS jalan); di
  // runtime dijaga <StatusBar style="dark"> di app/_layout.tsx.
  androidStatusBar: { barStyle: 'dark-content' },
  plugins: [
    'expo-router',
    ['expo-build-properties', { android: { usesCleartextTraffic: IZINKAN_HTTP } }],
    // LANJUT_086: build rilis ditandatangani keystore rilis di luar repo (LANJUT_KEYSTORE_PROPS);
    // tanpa keystore, build rilis gagal, tidak jatuh ke debug.keystore.
    './plugins/withKeystoreRilis',
    ...(PORTOFOLIO_AKTIF
      ? [
          [
            'expo-image-picker',
            {
              photosPermission: 'LANJUT membuka galeri saat kamu memilih foto untuk catatan portofoliomu.',
              cameraPermission: 'LANJUT memakai kamera saat kamu mengambil foto untuk catatan portofoliomu.',
              microphonePermission: false,
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
  ],
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.edilakso.lanjut',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(PORTOFOLIO_AKTIF ? {} : { blockedPermissions: ['android.permission.CAMERA'] }),
  },
  web: {
    favicon: './assets/favicon.png',
    name: 'LANJUT',
    shortName: 'LANJUT',
    lang: 'id',
    display: 'standalone',
    startUrl: '/',
    scope: '/',
    themeColor: '#456A8C',
    backgroundColor: '#FFFFFF',
  },
  extra: {
    eas: { projectId: 'cbb2972d-24a7-450e-8604-6360aee3d190' },
    apiUrl: API_URL_OVERRIDE,
    apiUrlProd: API_URL_PROD,
    apiUrlDevAndroid: API_URL_DEV_ANDROID,
    apiUrlDevWeb: API_URL_DEV_WEB,
    // LANJUT_080b: mikrofon Ngobrol MATI kecuali build dibuat dengan
    // EXPO_PUBLIC_MIKROFON_NGOBROL=1 (dibaca lib/fiturApp.ts). Menunggu tinjauan hukum.
    mikrofonNgobrol: process.env.EXPO_PUBLIC_MIKROFON_NGOBROL === '1',
    // LANJUT_009: unduh data dan hapus akun MATI kecuali build dibuat dengan
    // EXPO_PUBLIC_KELOLA_DATA_AKUN=1 (dibaca lib/fiturApp.ts). Menunggu persetujuan teks.
    kelolaDataAkun: process.env.EXPO_PUBLIC_KELOLA_DATA_AKUN === '1',
    // LANJUT_011: dibaca lib/fiturApp.ts. Rutenya dikeluarkan dari bundel di metro.config.js.
    portofolio: PORTOFOLIO_AKTIF,
    // LANJUT_083: masuk dengan Google (lib/googleMasuk.ts). Client ID OAuth bersifat
    // publik; Client Secret TIDAK pernah diisi di app. Kosong = tombol Google tidak
    // tampil. Android/iOS juga butuh alamat halaman penerus di domain landing
    // (mis. https://<domain>/google-kembali.html), yang didaftarkan di Google Console.
    // `undefined`, bukan `null`: di manifest dev web, null di `extra` terbaca sebagai `{}`.
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || undefined,
    googleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || undefined,
  },
};

export default config;
