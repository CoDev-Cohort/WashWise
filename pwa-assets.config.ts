import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates favicon.ico, pwa-64/192/512, maskable-icon-512 and apple-touch-icon-180 from public/logo.svg.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1F335C' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1F335C' } },
  },
  images: ['public/logo.svg'],
})
