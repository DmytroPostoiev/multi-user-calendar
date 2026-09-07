// frontend/build.js
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

async function buildApp() {
  try {
    await build({
      plugins: [react()],
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          input: {
            main: resolve(process.cwd(), 'index.html')
          }
        }
      }
    })
    console.log('✅ Build successful!')
  } catch (err) {
    console.error('❌ Build failed:', err)
    process.exit(1)
  }
}

buildApp()