import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// Konfigurasi Vite: React + PWA sederhana (manifest + service worker), gratis, sesuai §12 PRD
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Batas default 2 MiB sudah kelampauan seiring fitur bertambah (bundle app makin besar).
        // Dinaikkan ke 5 MiB supaya build tidak gagal gara-gara precache; idealnya bundle
        // dipecah pakai code-splitting (manualChunks/dynamic import) untuk performa loading.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      manifest: {
        name: 'Riwayat Tanah Desa',
        short_name: 'TanahDesa',
        description: 'Aplikasi Pencatatan Riwayat Kepemilikan Tanah Desa',
        theme_color: '#166534',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});
