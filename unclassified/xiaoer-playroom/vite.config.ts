import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5188, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: [
            'three',
            'three/addons/controls/OrbitControls.js',
            'three/addons/geometries/RoundedBoxGeometry.js',
          ],
        },
      },
    },
  },
});
