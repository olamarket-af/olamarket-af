'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type User = {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  status: string
  created_at: string
}

export default function UserRow({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function toggleStatus() {
    setLoading(true)
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="admin-table-row">
      <span>{user.full_name ?? '—'}</span>
      <span>{user.phone ?? '—'}</span>
      <span className="badge">{user.role}</span>
      <span className={`badge ${user.status === 'suspended' ? 'badge-danger' : 'badge-ok'}`}>
        {user.status === 'suspended' ? 'Suspendu' : 'Actif'}
      </span>
      <button className="link-danger" onClick={toggleStatus} disabled={loading}>
        {loading ? '…' : user.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
      </button>
    </div>
  )
}
