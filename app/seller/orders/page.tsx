import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import { statusLabel } from '../../account/orders/statusLabel'

export default async function SellerOrdersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, status, created_at, client:profiles!orders_client_id_fkey(full_name)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="seller-page">
      <h1>Commandes reçues</h1>

      {!orders || orders.length === 0 ? (
        <p className="panel-sub">Aucune commande pour l'instant.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link href={`/seller/orders/${order.id}`} className="order-row" key={order.id}>
              <div>
                <p className="order-number">{order.order_number}</p>
                {/* @ts-expect-error -- relation renvoyée comme objet unique */}
                <p className="order-store">{order.client?.full_name ?? 'Client'}</p>
              </div>
              <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
              <span className="order-total">{formatFcfa(order.subtotal)}</span>
              <span className="order-date">{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
