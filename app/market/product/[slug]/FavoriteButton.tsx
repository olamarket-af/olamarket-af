'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FavoriteButton({
  productId,
  initialIsFavorite,
}: {
  productId: string
  initialIsFavorite: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId)
      setIsFavorite(false)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId })
      setIsFavorite(true)
    }

    setLoading(false)
  }

  return (
    <button
      className={`btn-outline ${isFavorite ? 'is-favorite' : ''}`}
      onClick={toggle}
      disabled={loading}
    >
      {isFavorite ? '♥ Dans vos favoris' : '♡ Ajouter aux favoris'}
    </button>
  )
}
