import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

// Convention Next.js : servi automatiquement à /manifest.webmanifest et
// lié dans <head>. Les valeurs viennent de app_settings (modifiable dans
// /admin/settings) — jamais codées en dur.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const supabase = await createClient()
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'pwa').maybeSingle()

  const pwa = data?.value ?? {
    name: "O'LA Market",
    short_name: "O'LA Market",
    theme_color: '#1B2A4A',
    background_color: '#FBF6EC',
  }

  return {
    name: pwa.name,
    short_name: pwa.short_name,
    description: 'Vendez en ligne. Achetez simplement.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr',
    theme_color: pwa.theme_color,
    background_color: pwa.background_color,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
