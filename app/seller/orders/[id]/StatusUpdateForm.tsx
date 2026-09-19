'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { statusLabel } from '../../../account/orders/statusLabel'

const STATUSES = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled']

export default function StatusUpdateForm({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('orders').update({ status }).eq('id', orderId)
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status,
      changed_by: user?.id,
    })

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="panel">
      <h3>Mettre à jour le statut</h3>
      <div className="field-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={handleUpdate} disabled={loading || status === currentStatus}>
          {loading ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
      </div>
    </div>
  )
}
