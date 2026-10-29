// LANJUT_086: tanda tangan rilis Android dari keystore DI LUAR repo. Plugin konfigurasi Expo,
// supaya bertahan saat `npx expo prebuild --clean` membuat ulang android/ (folder itu tidak ada
// di repo). android/app/build.gradle membaca keystore.properties dari jalur di variabel
// lingkungan LANJUT_KEYSTORE_PROPS (storeFile, storePassword, keyAlias, keyPassword).
// Tanpa berkas itu, setiap tugas rilis :app GAGAL — build rilis tidak pernah jatuh ke
// debug.keystore. Build debug tetap memakai debug.keystore seperti biasa.
const { withAppBuildGradle } = require('expo/config-plugins');

const PENANDA = '// LANJUT_086: keystore rilis';

const PEMBACA = `${PENANDA} (keystore.properties di luar repo, lewat LANJUT_KEYSTORE_PROPS)
def lanjutKeystorePropsJalur = System.getenv('LANJUT_KEYSTORE_PROPS')
def lanjutKeystoreProps = new Properties()
def lanjutKeystoreAda = lanjutKeystorePropsJalur != null && new File(lanjutKeystorePropsJalur).isFile()
if (lanjutKeystoreAda) {
    new File(lanjutKeystorePropsJalur).withInputStream { lanjutKeystoreProps.load(it) }
}

`;

const KONFIG_RILIS = `        release {
            if (lanjutKeystoreAda) {
                storeFile file(lanjutKeystoreProps['storeFile'])
                storePassword lanjutKeystoreProps['storePassword']
                keyAlias lanjutKeystoreProps['keyAlias']
                keyPassword lanjutKeystoreProps['keyPassword']
            }
        }
`;

const PENJAGA = `
${PENANDA}: tugas rilis :app tanpa keystore.properties gagal, tidak jatuh ke debug.keystore.
gradle.taskGraph.whenReady { graf ->
    def tugasRilis = graf.allTasks.findAll { it.project == project && it.name.toLowerCase().contains('release') }
    if (!tugasRilis.isEmpty() && !lanjutKeystoreAda) {
        throw new GradleException('LANJUT_086: build rilis butuh keystore rilis. Set LANJUT_KEYSTORE_PROPS ke keystore.properties di luar repo. Build rilis tidak memakai debug.keystore.')
    }
}
`;

/** Ubah isi app/build.gradle template Expo; idempoten. Melempar galat bila pola template berubah. */
function tambahkanTandaTanganRilis(isiAsli) {
  const eol = isiAsli.includes('\r\n') ? '\r\n' : '\n';
  let isi = isiAsli.replace(/\r\n/g, '\n');
  if (isi.includes(PENANDA)) return isiAsli;

  const awalAndroid = isi.indexOf('\nandroid {\n');
  if (awalAndroid < 0) throw new Error('[withKeystoreRilis] blok "android {" tidak ditemukan di app/build.gradle');
  isi = `${isi.slice(0, awalAndroid + 1)}${PEMBACA}${isi.slice(awalAndroid + 1)}`;

  const debugSigning = /(\n {4}signingConfigs \{\n {8}debug \{\n[\s\S]*?\n {8}\}\n)/;
  if (!debugSigning.test(isi)) throw new Error('[withKeystoreRilis] signingConfigs.debug template tidak ditemukan');
  isi = isi.replace(debugSigning, `$1${KONFIG_RILIS}`);

  const rilis = /(\n {4}buildTypes \{[\s\S]*?\n {8}release \{\n)([\s\S]*?)signingConfig signingConfigs\.debug\n/;
  if (!rilis.test(isi)) throw new Error('[withKeystoreRilis] buildTypes.release dengan signingConfigs.debug tidak ditemukan');
  isi = isi.replace(rilis, (_, kepala, sebelum) => {
    // Komentar "Caution! ... debug keystore" template dibuang; baris lain di depannya tetap.
    const indent = /( *)$/.exec(sebelum)[1];
    const sisa = sebelum
      .slice(0, sebelum.length - indent.length)
      .split('\n')
      .filter((b) => !/Caution! In production|signed-apk-android/.test(b))
      .join('\n');
    return `${kepala}${sisa}${indent}${PENANDA}: keystore.properties di luar repo, tanpa cadangan debug key.\n${indent}signingConfig signingConfigs.release\n`;
  });

  isi = `${isi.replace(/\n*$/, '\n')}${PENJAGA}`;
  return isi.replace(/\n/g, eol);
}

const withKeystoreRilis = (config) =>
  withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== 'groovy') {
      throw new Error('[withKeystoreRilis] app/build.gradle harus Groovy');
    }
    c.modResults.contents = tambahkanTandaTanganRilis(c.modResults.contents);
    return c;
  });

module.exports = withKeystoreRilis;
module.exports.tambahkanTandaTanganRilis = tambahkanTandaTanganRilis;
module.exports.PENANDA = PENANDA;
