import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import { statusLabel } from './statusLabel'

export default async function OrdersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/account/orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, status, created_at, store:stores(name, slug)')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="orders-page">
      <h1>Mes commandes</h1>

      {!orders || orders.length === 0 ? (
        <div className="orders-empty">
          <p>Vous n'avez pas encore commandé.</p>
          <Link href="/market" className="btn-primary">Découvrir les produits</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link href={`/account/orders/${order.id}`} className="order-row" key={order.id}>
              <div>
                <p className="order-number">{order.order_number}</p>
                {/* @ts-expect-error -- relation renvoyée comme objet unique */}
                <p className="order-store">{order.store?.name}</p>
              </div>
              <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
              <span className="order-total">{formatFcfa(order.subtotal)}</span>
              <span className="order-date">
                {new Date(order.created_at).toLocaleDateString('fr-FR')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
