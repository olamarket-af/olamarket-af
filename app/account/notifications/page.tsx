import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsList from '@/components/NotificationsList'

export default async function AccountNotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/account/notifications')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="orders-page">
      <h1>Notifications</h1>
      <NotificationsList initialNotifications={notifications ?? []} />
    </div>
  )
}
