import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: products }, { data: stores }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('status', 'active').limit(5000),
    supabase.from('stores').select('slug, updated_at').eq('status', 'active').limit(2000),
  ])

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/market`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/register`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/market/product/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const storeEntries: MetadataRoute.Sitemap = (stores ?? []).map((s) => ({
    url: `${SITE_URL}/market/store/${s.slug}`,
    lastModified: s.updated_at,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...storeEntries, ...productEntries]
}
