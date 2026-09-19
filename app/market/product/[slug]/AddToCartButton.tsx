'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AddToCartButton({
  productId,
  outOfStock,
}: {
  productId: string
  outOfStock: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleAdd() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    // Récupère (ou crée) le panier de l'utilisateur.
    const { data: cart } = await supabase
      .from('cart')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (!cart) {
      setLoading(false)
      return
    }

    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existingItem) {
      await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + 1 })
        .eq('id', existingItem.id)
    } else {
      await supabase.from('cart_items').insert({
        cart_id: cart.id,
        product_id: productId,
        quantity: 1,
      })
    }

    setLoading(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <button className="btn-primary" onClick={handleAdd} disabled={loading || outOfStock}>
      {outOfStock ? 'Rupture de stock' : added ? 'Ajouté ✓' : loading ? 'Ajout…' : 'Ajouter au panier'}
    </button>
  )
}
