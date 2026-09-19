'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFcfa } from '../../market/ProductCard'

type Payment = {
  id: string
  amount: number
  purpose: string
  provider: string | null
  provider_reference: string | null
  status: string
  created_at: string
  user: { full_name: string | null } | null
}

const PURPOSE_LABELS: Record<string, string> = {
  subscription: 'Abonnement',
  advertising: 'Publicité',
  other: 'Autre',
}

export default function RefundRow({ payment }: { payment: Payment }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const isManual = payment.provider === 'manual_momo'

  async function updateStatus(status: 'completed' | 'failed' | 'refunded') {
    if (status === 'refunded') {
      const confirmed = confirm(
        "Confirmez-vous avoir déjà traité ce remboursement depuis le Dashboard FedaPay ? " +
          "Ce bouton ne fait que mettre à jour l'état ici, il ne rembourse pas le client."
      )
      if (!confirmed) return
    }
    if (status === 'completed' && isManual) {
      const confirmed = confirm('Confirmez-vous avoir bien reçu ce paiement Mobile Money sur votre téléphone ?')
      if (!confirmed) return
    }

    setLoading(true)
    await supabase.from('payments').update({ status }).eq('id', payment.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="admin-table-row">
      <span>{payment.user?.full_name ?? '—'}</span>
      <span>{PURPOSE_LABELS[payment.purpose] ?? payment.purpose} · {formatFcfa(payment.amount)}</span>
      <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>
        {isManual && <span className="badge" style={{ marginRight: 6 }}>Manuel</span>}
        {payment.provider_reference ?? '—'}
      </span>
      <span className={`badge ${payment.status === 'completed' ? 'badge-ok' : payment.status === 'refunded' || payment.status === 'failed' ? 'badge-danger' : ''}`}>
        {payment.status}
      </span>
      <div className="seller-product-actions">
        {payment.status === 'pending' && isManual && (
          <>
            <button onClick={() => updateStatus('completed')} disabled={loading}>Confirmer</button>
            <button className="link-danger" onClick={() => updateStatus('failed')} disabled={loading}>Rejeter</button>
          </>
        )}
        {payment.status === 'completed' && (
          <button className="link-danger" onClick={() => updateStatus('refunded')} disabled={loading}>
            {loading ? '…' : 'Marquer remboursé'}
          </button>
        )}
      </div>
    </div>
  )
}
