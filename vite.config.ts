import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE: subpasta onde o site é publicado (no GitHub Pages, "/<nome-do-repositório>/")
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

export default defineConfig({
  base: env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
})
