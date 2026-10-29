// tools/layani-web.js
// Server statis lokal sederhana untuk menguji berkas dist/ (SPA) hasil build web.
// Menyediakan SPA fallback: semua rute yang tidak memiliki berkas fisik diarahkan ke index.html.
//
// Penggunaan:
//   node tools/layani-web.js         -> Hanya localhost (127.0.0.1:5500)
//   node tools/layani-web.js --lan   -> Semua antarmuka (0.0.0.0:5500), untuk uji HP lewat Wi-Fi

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function parseArgs(argv = process.argv) {
  const isLan = argv.includes('--lan');
  const portArg = argv.find((a) => a.startsWith('--port='));
  let port = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT, 10) : 5500;
  if (portArg) {
    const val = parseInt(portArg.split('=')[1], 10);
    if (!isNaN(val) && val > 0) port = val;
  }
  return { isLan, port };
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Prioritaskan IPv4 yang bukan loopback/internal
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const DIST_DIR = path.resolve(__dirname, '..', '..', 'dist');

function buatServerStatis(distDir = DIST_DIR) {
  return http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);

    // Periksa apakah berkas statis fisik ada
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
        });
        return fs.createReadStream(filePath).pipe(res);
      }

      // SPA Fallback: arahkan ke dist/index.html
      const fallbackPath = path.join(distDir, 'index.html');
      fs.stat(fallbackPath, (fErr, fStats) => {
        if (!fErr && fStats.isFile()) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
          });
          return fs.createReadStream(fallbackPath).pipe(res);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Berkas dist/index.html belum dibangun. Jalankan "npm run build:web" terlebih dahulu.');
      });
    });
  });
}

const server = buatServerStatis(DIST_DIR);

if (require.main === module) {
  const { isLan, port } = parseArgs();
  const host = isLan ? '0.0.0.0' : '127.0.0.1';
  const lanIp = getLanIp();

  server.listen(port, host, () => {
    console.log(`=======================================================`);
    if (isLan) {
      console.log(`[layani-web] MODE LAN AKTIF — mendengarkan di 0.0.0.0:${port}`);
      console.log(`[PERINGATAN] Server terbuka untuk perangkat di jaringan yang sama.`);
      console.log(`Gunakan HANYA di Wi-Fi / jaringan pribadi yang tepercaya.`);
      console.log(`-------------------------------------------------------`);
      console.log(`Akses dari HP (Chrome / Safari):`);
      console.log(`  http://${lanIp}:${port}`);
      console.log(`Akses lokal dari komputer ini:`);
      console.log(`  http://localhost:${port}`);
    } else {
      console.log(`[layani-web] MODE LOKAL — mendengarkan di 127.0.0.1:${port}`);
      console.log(`[layani-web] Hanya dapat diakses dari komputer ini.`);
      console.log(`Akses lokal: http://localhost:${port}`);
      console.log(`[PETUNJUK] Berikan opsi --lan untuk mengizinkan akses HP lewat Wi-Fi:`);
      console.log(`  node tools/layani-web.js --lan`);
    }
    console.log(`Melayani berkas dari: ${DIST_DIR}`);
    console.log(`=======================================================`);
  });
}

module.exports = {
  server,
  buatServerStatis,
  parseArgs,
  getLanIp,
  MIME_TYPES,
  DIST_DIR,
};
