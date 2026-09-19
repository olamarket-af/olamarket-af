import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import AdminNav from '../AdminNav'
import ProductModerationRow from './ProductModerationRow'

export default async function AdminProductsPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, status, featured, store:stores(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/products" />
      <div className="admin-content">
        <h1>Produits</h1>
        <p className="panel-sub">100 plus récents. Utiliser la recherche publique pour retrouver un produit précis.</p>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Produit</span><span>Boutique</span><span>Prix</span><span>Statut</span><span>Action</span>
          </div>
          {products?.map((p) => (
            // @ts-expect-error -- relation renvoyée comme objet unique
            <ProductModerationRow key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
