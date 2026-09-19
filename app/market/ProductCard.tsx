import Link from 'next/link'

type Product = {
  slug: string
  name: string
  price: number
  old_price: number | null
  image_url: string | null
  city: string | null
  featured: boolean
  store?: { name: string; slug: string } | null
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/market/product/${product.slug}`} className="product-card">
      <div className="product-card-image">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card-placeholder" aria-hidden="true" />
        )}
        {product.featured && <span className="badge-featured">Sponsorisé</span>}
      </div>
      <div className="product-card-body">
        <p className="product-card-name">{product.name}</p>
        {product.store && <p className="product-card-store">{product.store.name}</p>}
        <div className="product-card-price-row">
          <span className="product-card-price">{formatFcfa(product.price)}</span>
          {product.old_price && product.old_price > product.price && (
            <span className="product-card-old-price">{formatFcfa(product.old_price)}</span>
          )}
        </div>
        {product.city && <p className="product-card-city">{product.city}</p>}
      </div>
    </Link>
  )
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}
