/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vite'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'dist'],
      css: false,
      // Shorter timeout for unit tests
      testTimeout: 10_000,
    },
  })
)
