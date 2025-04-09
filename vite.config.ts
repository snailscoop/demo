import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    host: true,
    port: 3001,
    open: true,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    watch: {
      usePolling: false
    },
    hmr: {
      overlay: false
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'nostr-tools': ['nostr-tools'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mantine': ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
          'utils': ['buffer']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: [
      'gun', 
      'buffer', 
      'react', 
      'react-dom', 
      'react-router-dom',
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/notifications',
      '@cosmjs/stargate',
      'nostr-tools'
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './')
    }
  },
  define: {
    'process.env': process.env,
    'global': 'globalThis'
  }
})
