import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML untuk static web export Expo Router (Expo SDK 57 / Expo Router v4).
 * Berkas ini berjalan di Node.js saat static export, mengonfigurasi elemen <head> dan <body>
 * untuk dist/index.html.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>LANJUT</title>

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />

        {/* PWA & iOS Safari meta tags */}
        <meta name="theme-color" content="#456A8C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LANJUT" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Reset gaya React Native Web */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
