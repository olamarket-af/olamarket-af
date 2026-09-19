'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Seller = {
  id: string
  verification_status: string
  business_name: string | null
  profile: { id: string; full_name: string | null; phone: string | null } | null
  store: { id: string; name: string; slug: string; status: string } | null
}

export default function SellerRow({ seller }: { seller: Seller }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function toggleVerification() {
    setLoading(true)
    const next = seller.verification_status === 'verified' ? 'unverified' : 'verified'
    await supabase
      .from('seller_profiles')
      .update({ verification_status: next, verified_at: next === 'verified' ? new Date().toISOString() : null })
      .eq('id', seller.id)
    setLoading(false)
    router.refresh()
  }

  async function toggleStoreStatus() {
    if (!seller.store) return
    setLoading(true)
    const next = seller.store.status === 'suspended' ? 'active' : 'suspended'
    await supabase.from('stores').update({ status: next }).eq('id', seller.store.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="admin-table-row">
      <span>{seller.profile?.full_name ?? seller.business_name ?? '—'}</span>
      <span>
        {seller.store ? (
          <Link href={`/market/store/${seller.store.slug}`}>{seller.store.name}</Link>
        ) : (
          '— (pas encore de boutique)'
        )}
      </span>
      <span className={`badge ${seller.verification_status === 'verified' ? 'badge-ok' : ''}`}>
        {seller.verification_status === 'verified' ? '✓ Vérifié' : 'Non vérifié'}
      </span>
      <span className={`badge ${seller.store?.status === 'suspended' ? 'badge-danger' : 'badge-ok'}`}>
        {seller.store ? (seller.store.status === 'suspended' ? 'Suspendue' : 'Active') : '—'}
      </span>
      <div className="seller-product-actions">
        <button onClick={toggleVerification} disabled={loading}>
          {seller.verification_status === 'verified' ? 'Retirer le badge' : 'Vérifier'}
        </button>
        {seller.store && (
          <button className="link-danger" onClick={toggleStoreStatus} disabled={loading}>
            {seller.store.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
          </button>
        )}
      </div>
    </div>
  )
}
