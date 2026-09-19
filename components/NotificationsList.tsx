'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notificationIcon } from '@/lib/notifications'

type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = useState(initialNotifications)

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    router.refresh()
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    router.refresh()
  }

  if (notifications.length === 0) {
    return <p className="panel-sub">Aucune notification pour l'instant.</p>
  }

  return (
    <div>
      {notifications.some((n) => !n.is_read) && (
        <button className="link-danger" style={{ color: 'var(--green, #1F7A5C)', marginBottom: 12 }} onClick={markAllAsRead}>
          Tout marquer comme lu
        </button>
      )}
      <div className="notif-list">
        {notifications.map((n) => (
          <button
            key={n.id}
            className={`notif-row ${n.is_read ? '' : 'unread'}`}
            onClick={() => !n.is_read && markAsRead(n.id)}
          >
            <span className="notif-icon">{notificationIcon(n.type)}</span>
            <span className="notif-body">
              <span className="notif-title">{n.title}</span>
              {n.message && <span className="notif-message">{n.message}</span>}
              <span className="notif-date">{new Date(n.created_at).toLocaleString('fr-FR')}</span>
            </span>
            {!n.is_read && <span className="notif-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
