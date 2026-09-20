import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../../market/ProductCard'
import { statusLabel } from '../../../account/orders/statusLabel'
import StatusUpdateForm from './StatusUpdateForm'

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/seller/orders/${id}`)

  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, order_number, subtotal, status, address, phone, created_at,
       order_items(id, quantity, unit_price, product:products(name, slug, image_url))`
    )
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!order) notFound()

  const items = (order.order_items as unknown as {
    id: string
    quantity: number
    unit_price: number
    product: { name: string; slug: string; image_url: string | null }
  }[]) ?? []

  return (
    <div className="orders-page">
      <p className="order-back"><Link href="/seller/orders">← Commandes reçues</Link></p>

      <div className="order-detail-header">
        <h1>{order.order_number}</h1>
        <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      <div className="order-items">
        {items.map((item) => (
          <div className="order-item-row" key={item.id}>
            <div className="cart-item-image">
              {item.product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.product.image_url} alt={item.product.name} />
              ) : null}
            </div>
            <Link href={`/market/product/${item.product.slug}`}>{item.product.name}</Link>
            <span>× {item.quantity}</span>
            <span>{formatFcfa(item.unit_price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="order-summary-block">
        <div className="cart-summary-row">
          <span>Total</span>
          <strong>{formatFcfa(order.subtotal)}</strong>
        </div>
        <p className="order-meta">Livraison : {order.address} · {order.phone}</p>
        <p className="order-meta">Reçue le {new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
      </div>

      <StatusUpdateForm orderId={order.id} currentStatus={order.status} />
    </div>
  )
}
