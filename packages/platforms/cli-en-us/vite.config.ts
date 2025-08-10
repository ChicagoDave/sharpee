import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SharpeeCLIPlatformEnUS',
      fileName: (format) => `sharpee-cli-en.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // External dependencies that shouldn't be bundled
      external: [
        '@sharpee/sharpee',
        'readline',
        'fs',
        'path',
        'events',
        'util',
        'stream',
        'child_process',
        'os'
      ],
      output: {
        // Global variables for UMD build
        globals: {
          readline: 'readline',
          fs: 'fs',
          path: 'path',
          events: 'events'
        }
      }
    },
    // Disable minification for now (terser not installed)
    minify: false,
    // Source maps for debugging
    sourcemap: true,
    // Optimize deps
    optimizeDeps: {
      include: ['@sharpee/sharpee']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});