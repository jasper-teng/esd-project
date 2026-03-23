// https://nuxt.com/docs/api/configuration/nuxt-config
import { resolve } from 'path'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  alias: {
    '~': resolve(__dirname, '.'),
    '@': resolve(__dirname, '.'),
  },

  vite: {
    resolve: {
      alias: {
        '~': resolve(__dirname, '.'),
        '@': resolve(__dirname, '.'),
      },
    },
  },
})
