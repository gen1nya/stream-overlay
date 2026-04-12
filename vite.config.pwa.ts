import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Separate config for the mobile companion PWA. Shares node_modules
// with the desktop app but builds a completely independent bundle so
// neither side pulls in the other's code. Desktop build stays in
// dist/, this one lands in dist-pwa/.
export default defineConfig({
  root: path.resolve(__dirname, 'src/pwa'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist-pwa'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    // Bind to all interfaces so the PWA is reachable from the phone
    // during dev, not only from localhost on the dev machine.
    host: '0.0.0.0',
  },
});
