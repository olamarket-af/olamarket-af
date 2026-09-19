'use client'

import { useState } from 'react'
import { formatFcfa } from '../../market/ProductCard'
import ManualPaymentForm from '@/components/ManualPaymentForm'

type Product = { id: string; name: string }
type AdPlan = { id: string; label: string; duration_days: number; price: number }

export default function AdvertisingForm({
  storeId,
  products,
  adPlans,
  mtnNumber,
  moovNumber,
  ownerName,
}: {
  storeId: string
  products: Product[]
  adPlans: AdPlan[]
  mtnNumber?: string
  moovNumber?: string
  ownerName?: string
}) {
  const [type, setType] = useState<'sponsored_product' | 'featured_store'>('sponsored_product')
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [adPlanId, setAdPlanId] = useState(adPlans[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    if (type === 'sponsored_product' && !productId) {
      setError('Choisissez un produit à mettre en avant.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'advertising',
          advertisingPlanId: adPlanId,
          type,
          productId: type === 'sponsored_product' ? productId : null,
          storeId: type === 'featured_store' ? storeId : null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erreur inconnue')
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setError('Impossible de démarrer le paiement. Réessayez.')
      setLoading(false)
    }
  }

  if (adPlans.length === 0) {
    return <p className="panel-sub">Aucune formule de publicité disponible pour le moment.</p>
  }

  return (
    <div className="product-form" style={{ maxWidth: 480 }}>
      <label>
        Type de publicité
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="sponsored_product">Produit sponsorisé</option>
          <option value="featured_store">Boutique mise en avant</option>
        </select>
      </label>

      {type === 'sponsored_product' && (
        <label>
          Produit à promouvoir
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.length === 0 && <option value="">Aucun produit actif</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Durée
        <select value={adPlanId} onChange={(e) => setAdPlanId(e.target.value)}>
          {adPlans.map((p) => (
            <option key={p.id} value={p.id}>{p.label} — {formatFcfa(p.price)}</option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="btn-primary" onClick={handlePay} disabled={loading}>
        {loading ? 'Redirection…' : 'Payer et activer'}
      </button>

      <ManualPaymentForm
        target={{
          purpose: 'advertising',
          advertisingPlanId: adPlanId,
          type,
          productId: type === 'sponsored_product' ? productId : null,
          storeId: type === 'featured_store' ? storeId : null,
        }}
        mtnNumber={mtnNumber}
        moovNumber={moovNumber}
        ownerName={ownerName}
      />
    </div>
  )
}
