import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// __dirname in ES Module nachbilden
const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

async function buildApp() {
  try {
    await build({
      plugins: [react()],
      build: {
        outDir: resolve(__dirname, 'dist'), // <-- Wichtig: Absoluter Pfad
        sourcemap: false,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html')
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