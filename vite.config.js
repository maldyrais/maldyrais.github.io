import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // `maldyrais.github.io` is a GitHub Pages USER site, so assets live at root.
  // Absolute root paths are also required by the generated /about/index.html,
  // /works/index.html, etc.
  base: '/',
})
