import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

/*
 * The website admin (2026-10-07). Same build rules as the main admin panel:
 * our own code is obfuscated in production, no source maps are published, and
 * in development /admin/api is passed to the local gateway so the page works
 * from any address. A built site sets VITE_API_BASE and calls the API directly.
 */
const obfuscate = obfuscator({
  apply: 'build',
  include: [/src\/.*\.(js|jsx)$/],
  exclude: [/node_modules/],
  options: {
    compact: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    splitStrings: false,
    transformObjectKeys: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    debugProtection: false,
    unicodeEscapeSequence: false,
    sourceMap: false,
  },
});

export default defineConfig({
  plugins: [react(), obfuscate],
  server: {
    port: 5175, strictPort: true, host: true,
    proxy: { '/admin/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5007', changeOrigin: false, xfwd: true } },
  },
  preview: { port: 4175, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
});
