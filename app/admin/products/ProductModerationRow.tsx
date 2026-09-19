'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatFcfa } from '../../market/ProductCard'

type Product = {
  id: string
  name: string
  slug: string
  price: number
  status: string
  store: { name: string } | null
}

export default function ProductModerationRow({ product }: { product: Product }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function toggleSuspend() {
    setLoading(true)
    const next = product.status === 'suspended' ? 'active' : 'suspended'
    await supabase.from('products').update({ status: next }).eq('id', product.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="admin-table-row">
      <span><Link href={`/market/product/${product.slug}`}>{product.name}</Link></span>
      <span>{product.store?.name ?? '—'}</span>
      <span>{formatFcfa(product.price)}</span>
      <span className={`badge ${product.status === 'suspended' ? 'badge-danger' : 'badge-ok'}`}>{product.status}</span>
      <button className="link-danger" onClick={toggleSuspend} disabled={loading}>
        {product.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
      </button>
    </div>
  )
}
