'use client'

import { useState } from 'react'

export default function SubscribeButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'subscription', planId }),
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

  return (
    <div>
      <button className="btn-primary" onClick={handleSubscribe} disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Redirection…' : 'Souscrire'}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
