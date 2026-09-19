import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../../market/ProductCard'
import { statusLabel } from '../statusLabel'

const STEPS = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed']

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/account/orders/${id}`)

  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, order_number, subtotal, status, address, phone, created_at,
       store:stores(name, slug, phone, whatsapp),
       order_items(id, quantity, unit_price, product:products(name, slug, image_url))`
    )
    .eq('id', id)
    .eq('client_id', user.id) // ceinture + bretelles en plus des RLS
    .single()

  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_status_history')
    .select('status, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  // @ts-expect-error -- relation renvoyée comme objet unique
  const store = order.store as { name: string; slug: string; phone: string | null; whatsapp: string | null }
  const items = (order.order_items as {
    id: string
    quantity: number
    unit_price: number
    product: { name: string; slug: string; image_url: string | null }
  }[]) ?? []

  const currentStepIndex = STEPS.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="orders-page">
      <p className="order-back"><Link href="/account/orders">← Mes commandes</Link></p>

      <div className="order-detail-header">
        <div>
          <h1>{order.order_number}</h1>
          <p className="order-store">
            Vendu par <Link href={`/market/store/${store.slug}`}>{store.name}</Link>
          </p>
        </div>
        <span className={`order-status status-${order.status}`}>{statusLabel(order.status)}</span>
      </div>

      {!isCancelled && (
        <ol className="order-timeline">
          {STEPS.map((step, i) => (
            <li key={step} className={i <= currentStepIndex ? 'done' : ''}>
              {statusLabel(step)}
            </li>
          ))}
        </ol>
      )}

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
        <p className="order-meta">
          Commandé le {new Date(order.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {history && history.length > 0 && (
        <div className="order-history">
          <h2>Historique</h2>
          {history.map((h, i) => (
            <p key={i} className="order-history-row">
              {statusLabel(h.status)} — {new Date(h.created_at).toLocaleString('fr-FR')}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
