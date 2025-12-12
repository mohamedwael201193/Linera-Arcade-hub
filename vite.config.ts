import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

const checkEnvironment = (required: string[]) => {
  return {
    name: 'checkEnvironment',
    config(_config: unknown, { mode }: { mode: string }) {
      const available = { ...process.env, ...loadEnv(mode, process.cwd(), 'VITE_') }
      const missing = required.filter(env => !available[env] || available[env] === 'REPLACE_WITH_DEPLOYED_ID')
      if (missing.length > 0) {
        console.warn(`⚠️  Required environment variables not set: ${missing.join(', ')}`)
        console.warn('   Please deploy contracts and set APP IDs in .env')
        console.warn('   Run: ./scripts/deploy_all_conway.sh')
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '',
  plugins: [
    react(),
    checkEnvironment([
      'VITE_LINERA_FAUCET_URL',
      'VITE_PLAYER_PROFILE_APP_ID',
      'VITE_GOL_APP_ID',
      'VITE_PREDICTION_PULSE_APP_ID',
      'VITE_MEME_BATTLE_APP_ID',
    ]),
  ],
  server: {
    port: 5173,
    host: true,
    headers: {
      // Required for SharedArrayBuffer (used by Wasm threads)
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      allow: [
        path.resolve(__dirname, '.'),
      ],
    },
    proxy: {
      // Proxy Linera validator requests to avoid CORS in development
      '/api/linera': {
        target: 'https://validator-1.testnet-conway.linera.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/linera/, ''),
        secure: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        linera: '@linera/client',
      },
      preserveEntrySignatures: 'strict',
    },
  },
  optimizeDeps: {
    exclude: ['@linera/client'],
  },
})
