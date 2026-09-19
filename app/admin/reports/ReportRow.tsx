'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Report = {
  id: string
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
}

const STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed']
const LABELS: Record<string, string> = {
  pending: 'En attente',
  reviewed: 'Examiné',
  resolved: 'Résolu',
  dismissed: 'Rejeté',
}

export default function ReportRow({ report, targetLabel }: { report: Report; targetLabel: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(report.status)
  const [loading, setLoading] = useState(false)

  async function updateStatus(next: string) {
    setLoading(true)
    setStatus(next)
    await supabase.from('reports').update({ status: next }).eq('id', report.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="admin-table-row">
      <span>{targetLabel}</span>
      <span title={report.description ?? ''}>{report.reason}</span>
      <span className="badge">{LABELS[status]}</span>
      <span>{new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
      <select value={status} onChange={(e) => updateStatus(e.target.value)} disabled={loading}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{LABELS[s]}</option>
        ))}
      </select>
    </div>
  )
}
