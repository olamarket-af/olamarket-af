'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatFcfa } from '../market/ProductCard'

export type CartItemData = {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    stock: number
    image_url: string | null
    store_id: string
    seller_id: string
    store: { name: string; slug: string }
  }
}

export default function CartClient({
  initialItems,
  defaultAddress,
  defaultPhone,
}: {
  initialItems: CartItemData[]
  defaultAddress: string
  defaultPhone: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [items, setItems] = useState(initialItems)
  const [address, setAddress] = useState(defaultAddress)
  const [phone, setPhone] = useState(defaultPhone)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Un même panier peut contenir des produits de plusieurs vendeurs : on
  // regroupe par boutique, car chaque groupe deviendra une commande distincte
  // (table "orders", une ligne par vendeur — voir checkout_groups en base).
  const groups = useMemo(() => {
    const map = new Map<string, { store: CartItemData['product']['store']; sellerId: string; items: CartItemData[] }>()
    for (const item of items) {
      const key = item.product.store_id
      if (!map.has(key)) {
        map.set(key, { store: item.product.store, sellerId: item.product.seller_id, items: [] })
      }
      map.get(key)!.items.push(item)
    }
    return Array.from(map.values())
  }, [items])

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
    await supabase.from('cart_items').update({ quantity }).eq('id', itemId)
  }

  async function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    await supabase.from('cart_items').delete().eq('id', itemId)
  }

  async function handleCheckout() {
    if (!address || !phone) {
      setError('Renseignez une adresse et un numéro de téléphone de livraison.')
      return
    }

    setPlacing(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/cart')
        return
      }

      const { data: checkoutGroup, error: groupError } = await supabase
        .from('checkout_groups')
        .insert({ client_id: user.id, total, address, phone })
        .select('id')
        .single()

      if (groupError || !checkoutGroup) throw groupError

      for (const group of groups) {
        const subtotal = group.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            checkout_group_id: checkoutGroup.id,
            client_id: user.id,
            seller_id: group.sellerId,
            store_id: group.items[0].product.store_id,
            subtotal,
            address,
            phone,
          })
          .select('id')
          .single()

        if (orderError || !order) throw orderError

        const orderItems = group.items.map((i) => ({
          order_id: order.id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
        }))

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
        if (itemsError) throw itemsError
      }

      // Vide le panier une fois les commandes créées.
      await supabase
        .from('cart_items')
        .delete()
        .in('id', items.map((i) => i.id))

      router.push('/account/orders')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Impossible de finaliser la commande. Réessayez.')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <h1>Votre panier est vide</h1>
          <Link href="/market" className="btn-primary">Découvrir les produits</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <h1>Mon panier</h1>

      <div className="cart-layout">
        <div className="cart-groups">
          {groups.map((group) => (
            <div className="cart-store-group" key={group.store.slug}>
              <p className="cart-store-name">
                Vendu par <Link href={`/market/store/${group.store.slug}`}>{group.store.name}</Link>
              </p>

              {group.items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-image">
                    {item.product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.image_url} alt={item.product.name} />
                    ) : null}
                  </div>
                  <div className="cart-item-info">
                    <Link href={`/market/product/${item.product.slug}`}>{item.product.name}</Link>
                    <span className="cart-item-price">{formatFcfa(item.product.price)}</span>
                  </div>
                  <div className="cart-item-qty">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuer">−</button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Augmenter"
                      disabled={item.quantity >= item.product.stock}
                    >
                      +
                    </button>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeItem(item.id)}>
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <h2>Résumé</h2>
          <div className="cart-summary-row">
            <span>Total</span>
            <strong>{formatFcfa(total)}</strong>
          </div>

          <label>
            Adresse de livraison
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label>
            Téléphone
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn-primary" onClick={handleCheckout} disabled={placing}>
            {placing ? 'Validation…' : 'Passer la commande'}
          </button>
          <p className="cart-note">
            {groups.length > 1
              ? `Votre commande sera répartie en ${groups.length} commandes, une par vendeur.`
              : ''}
          </p>
        </aside>
      </div>
    </div>
  )
}
