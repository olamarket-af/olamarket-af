'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Ad = {
  id: string
  type: string
  status: string
  end_date: string | null
  seller: { full_name: string | null } | null
  product: { name: string; slug: string } | null
  store: { name: string; slug: string } | null
}

export default function AdModerationRow({ ad, typeLabel }: { ad: Ad; typeLabel: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function cancelAd() {
    if (!confirm('Annuler cette publicité ?')) return
    setLoading(true)
    await supabase.from('advertisements').update({ status: 'cancelled' }).eq('id', ad.id)
    setLoading(false)
    router.refresh()
  }

  const target = ad.product
    ? <Link href={`/market/product/${ad.product.slug}`}>{ad.product.name}</Link>
    : ad.store
      ? <Link href={`/market/store/${ad.store.slug}`}>{ad.store.name}</Link>
      : '—'

  return (
    <div className="admin-table-row">
      <span>{ad.seller?.full_name ?? '—'}</span>
      <span>{target}</span>
      <span>{typeLabel}</span>
      <span className={`badge ${ad.status === 'active' ? 'badge-ok' : ad.status === 'cancelled' ? 'badge-danger' : ''}`}>
        {ad.status}
      </span>
      {ad.status === 'active' ? (
        <button className="link-danger" onClick={cancelAd} disabled={loading}>
          {loading ? '…' : 'Annuler'}
        </button>
      ) : (
        <span></span>
      )}
    </div>
  )
}
