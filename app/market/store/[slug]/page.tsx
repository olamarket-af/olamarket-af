import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '../../ProductCard'
import ContactSellerButton from '@/components/ContactSellerButton'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('name, description, city, logo_url')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!store) return {}

  const description = store.description?.slice(0, 155) ?? `Boutique ${store.name} sur O'LA Market${store.city ? ` — ${store.city}` : ''}.`

  return {
    title: store.name,
    description,
    alternates: { canonical: `${SITE_URL}/market/store/${slug}` },
    openGraph: {
      title: store.name,
      description,
      images: store.logo_url ? [{ url: store.logo_url }] : undefined,
    },
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, cover_url, city, phone, whatsapp, status, seller_id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!store) notFound()

  const { data: sellerProfile } = await supabase
    .from('seller_profiles')
    .select('verification_status')
    .eq('user_id', store.seller_id)
    .maybeSingle()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, old_price, image_url, city, featured')
    .eq('store_id', store.id)
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marché', item: `${SITE_URL}/market` },
      { '@type': 'ListItem', position: 3, name: store.name, item: `${SITE_URL}/market/store/${slug}` },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="store-header">
        <div
          className="store-cover"
          style={store.cover_url ? { backgroundImage: `url(${store.cover_url})` } : undefined}
        />
        <div className="store-header-content">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="store-logo" src={store.logo_url} alt={store.name} />
          ) : (
            <div className="store-logo" aria-hidden="true" />
          )}
          <div className="store-header-info">
            <h1>
              {store.name}{' '}
              {sellerProfile?.verification_status === 'verified' && (
                <span title="Vendeur vérifié">✓</span>
              )}
            </h1>
            <p>{store.city}{store.phone ? ` · ${store.phone}` : ''}</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ContactSellerButton sellerId={store.seller_id} storeId={store.id} />
          </div>
        </div>
      </div>

      <div className="market-page">
        <div className="product-page" style={{ maxWidth: 1180 }}>
          {store.description && <p className="product-description">{store.description}</p>}

          {products && products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{ ...product, store: { name: store.name, slug: store.slug } }}
                />
              ))}
            </div>
          ) : (
            <p className="market-empty">Cette boutique n'a pas encore de produits en ligne.</p>
          )}
        </div>
      </div>
    </div>
  )
}
