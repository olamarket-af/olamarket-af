'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ManualPaymentTarget =
  | { purpose: 'subscription'; planId: string }
  | { purpose: 'advertising'; advertisingPlanId: string; type: string; productId?: string | null; storeId?: string | null }

export default function ManualPaymentForm({
  target,
  mtnNumber,
  moovNumber,
  ownerName,
}: {
  target: ManualPaymentTarget
  mtnNumber?: string
  moovNumber?: string
  ownerName?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [payerPhone, setPayerPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, payerPhone, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')

      setSubmitted(true)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError("Impossible d'enregistrer votre déclaration de paiement.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <p className="panel-sub" style={{ color: 'var(--green, #1F7A5C)' }}>
        ✓ Déclaration envoyée. Un administrateur va vérifier la réception et activer votre
        {target.purpose === 'subscription' ? ' abonnement' : ' publicité'} sous peu.
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)} style={{ width: '100%', marginTop: 8 }}>
        Payer manuellement par Mobile Money
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="product-form" style={{ marginTop: 12, padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Envoyez le montant à :</p>
      <ul style={{ margin: '4px 0 4px', paddingLeft: 18, fontSize: '0.88rem' }}>
        {mtnNumber && <li>MTN Mobile Money : <strong>{mtnNumber}</strong></li>}
        {moovNumber && <li>Moov Money : <strong>{moovNumber}</strong></li>}
      </ul>
      {ownerName && <p className="panel-sub" style={{ margin: '0 0 8px' }}>Au nom de {ownerName}</p>}

      <label>
        Numéro depuis lequel vous avez payé
        <input
          type="tel"
          required
          placeholder="+229 ..."
          value={payerPhone}
          onChange={(e) => setPayerPhone(e.target.value)}
        />
      </label>
      <label>
        Référence ou note (optionnel)
        <input
          type="text"
          placeholder="ID de transaction, heure d'envoi..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="btn-primary" disabled={loading}>
        {loading ? 'Envoi…' : "J'ai envoyé le paiement"}
      </button>
    </form>
  )
}
