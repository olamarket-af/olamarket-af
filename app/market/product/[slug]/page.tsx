import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AddToCartButton from './AddToCartButton'
import FavoriteButton from './FavoriteButton'
import ContactSellerButton from '@/components/ContactSellerButton'
import { formatFcfa } from '../../ProductCard'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, image_url, store:stores(name)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!product) return {}

  // @ts-expect-error -- relation renvoyée comme objet unique
  const storeName = product.store?.name as string | undefined
  const title = `${product.name} — ${formatFcfa(product.price)}`
  const description =
    product.description?.slice(0, 155) ??
    `${product.name}${storeName ? ` vendu par ${storeName}` : ''} sur O'LA Market.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/market/product/${slug}` },
    openGraph: {
      title,
      description,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
      type: 'website',
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      `id, name, description, price, old_price, stock, city, image_url,
       category:categories(name),
       store:stores(id, name, slug, city, seller_id),
       product_images(image_url, position),
       reviews(rating, comment, created_at, profiles(full_name))`
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!product) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isFavorite = false
  if (user) {
    const { data: fav } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle()
    isFavorite = !!fav
  }

  const images = [
    ...(product.image_url ? [{ image_url: product.image_url, position: -1 }] : []),
    ...((product.product_images as unknown as { image_url: string; position: number }[]) ?? []).sort(
      (a, b) => a.position - b.position
    ),
  ]

  const reviews = (product.reviews as any[]) ?? []
      const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // @ts-expect-error -- relation renvoyée comme objet unique
  const store = product.store as { id: string; name: string; slug: string; city: string | null; seller_id: string }
  // @ts-expect-error -- relation renvoyée comme objet unique
  const category = product.category as { name: string } | null

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: images[0]?.image_url ? [images[0].image_url] : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'XOF',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/market/product/${slug}`,
    },
    ...(averageRating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            reviewCount: reviews.length,
          },
        }
      : {}),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Marché', item: `${SITE_URL}/market` },
      ...(category
        ? [{ '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/market?category=${category.name}` }]
        : []),
      { '@type': 'ListItem', position: category ? 4 : 3, name: product.name, item: `${SITE_URL}/market/product/${slug}` },
    ],
  }

  return (
    <div className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="product-detail">
        <div>
          <div className="product-gallery-main">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].image_url} alt={product.name} />
            ) : null}
          </div>
          {images.length > 1 && (
            <div className="product-gallery-thumbs">
              {images.slice(1).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.image_url} alt="" />
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="product-info-store">
            Vendu par <Link href={`/market/store/${store.slug}`}>{store.name}</Link>
            {product.city ? ` · ${product.city}` : ''}
          </p>

          <div className="product-price-block">
            <span className="price">{formatFcfa(product.price)}</span>
            {product.old_price && product.old_price > product.price && (
              <span className="old-price">{formatFcfa(product.old_price)}</span>
            )}
          </div>

          {averageRating && (
            <p className="product-info-store">
              ★ {averageRating} · {reviews.length} avis
            </p>
          )}

          {product.description && <p className="product-description">{product.description}</p>}

          <p className={`product-stock ${product.stock === 0 ? 'out' : ''}`}>
            {product.stock > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
          </p>

          <div className="product-actions">
            <AddToCartButton productId={product.id} outOfStock={product.stock === 0} />
            <FavoriteButton productId={product.id} initialIsFavorite={isFavorite} />
            <ContactSellerButton sellerId={store.seller_id} storeId={store.id} />
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Avis clients</h2>
        {reviews.length === 0 && <p>Aucun avis pour l'instant.</p>}
        {reviews.map((review, i) => (
          <div className="review" key={i}>
            <span className="review-rating">★ {review.rating}</span>
            <span className="review-author">{review.profiles?.full_name ?? 'Client'}</span>
            {review.comment && <p>{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
