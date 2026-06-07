import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

function rewriteNlsImports() {
  return {
    name: 'rewrite-nls-imports',
    enforce: 'pre' as const,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolveId(source: string, _importer?: string) {
      if (source.endsWith('/nls.js') || source === 'nls.js') {
        return resolve(__dirname, 'src/vse/nls.ts')
      }
      return null
    }
  }
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        'vs/base': resolve('src/vse/base'),
        'vs/editor': resolve('src/vse/editor'),
        'vs/platform': resolve('src/vse/platform'),
        'vs/nls': resolve('src/vse/nls')
      }
    },
    plugins: [react(), rewriteNlsImports()],
    assetsInclude: ['**/*.ttf']
  }
})
