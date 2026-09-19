'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ContactSellerButton({
  sellerId,
  storeId,
}: {
  sellerId: string
  storeId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleContact() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (user.id === sellerId) {
      setLoading(false)
      return // le vendeur ne peut pas se contacter lui-même
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .upsert(
        { client_id: user.id, seller_id: sellerId, store_id: storeId },
        { onConflict: 'client_id,seller_id,store_id' }
      )
      .select('id')
      .single()

    setLoading(false)

    if (!error && conversation) {
      router.push(`/account/messages/${conversation.id}`)
    }
  }

  return (
    <button className="btn-outline" onClick={handleContact} disabled={loading}>
      {loading ? '…' : '💬 Contacter le vendeur'}
    </button>
  )
}
