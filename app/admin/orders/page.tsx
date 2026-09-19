import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import { statusLabel } from '../../account/orders/statusLabel'
import AdminNav from '../AdminNav'

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, status, created_at, store:stores(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/orders" />
      <div className="admin-content">
        <h1>Commandes</h1>
        <p className="panel-sub">100 plus récentes, toutes boutiques confondues.</p>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>N°</span><span>Boutique</span><span>Statut</span><span>Total</span><span>Date</span>
          </div>
          {orders?.map((o) => (
            <div className="admin-table-row" key={o.id}>
              <span>{o.order_number}</span>
              {/* @ts-expect-error -- relation renvoyée comme objet unique */}
              <span>{o.store?.name ?? '—'}</span>
              <span className={`order-status status-${o.status}`}>{statusLabel(o.status)}</span>
              <span>{formatFcfa(o.subtotal)}</span>
              <span>{new Date(o.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
