import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import DeleteProductButton from './DeleteProductButton'

export default async function SellerProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/products')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, stock, status, featured, image_url')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="seller-page">
      <div className="seller-page-header">
        <h1>Mes produits</h1>
        <Link href="/seller/products/new" className="btn-primary">+ Ajouter un produit</Link>
      </div>

      {!products || products.length === 0 ? (
        <p className="panel-sub">Vous n'avez pas encore publié de produit.</p>
      ) : (
        <div className="seller-product-list">
          {products.map((p) => (
            <div className="seller-product-row" key={p.id}>
              <div className="cart-item-image">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} />
                ) : null}
              </div>
              <div className="seller-product-info">
                <Link href={`/market/product/${p.slug}`}>{p.name}</Link>
                <span className={`product-status product-status-${p.status}`}>{productStatusLabel(p.status)}</span>
              </div>
              <span>{formatFcfa(p.price)}</span>
              <span className={p.stock === 0 ? 'stock-out' : ''}>{p.stock} en stock</span>
              <div className="seller-product-actions">
                <Link href={`/seller/products/${p.id}/edit`}>Modifier</Link>
                <DeleteProductButton productId={p.id} productName={p.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function productStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    active: 'En ligne',
    out_of_stock: 'Rupture',
    suspended: 'Suspendu',
  }
  return labels[status] ?? status
}
