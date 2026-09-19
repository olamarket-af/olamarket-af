'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string
  productName: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer "${productName}" ? Cette action est définitive.`)) return

    setLoading(true)
    await supabase.from('products').delete().eq('id', productId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button className="link-danger" onClick={handleDelete} disabled={loading}>
      {loading ? '…' : 'Supprimer'}
    </button>
  )
}
