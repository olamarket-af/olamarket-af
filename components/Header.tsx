import Image from 'next/image'
import Link from 'next/link'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'


export default async function Header() {
  const profile = await getCurrentProfile()
  let unreadCount = 0
  let unreadMessages = 0

  if (profile) {
    const supabase = await createClient()

    const [{ count: notifCount }, { data: myConversationIds }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false),
      supabase
        .from('conversations')
        .select('id')
        .or(`client_id.eq.${profile.id},seller_id.eq.${profile.id}`),
    ])

    unreadCount = notifCount ?? 0

    const ids = (myConversationIds ?? []).map((c) => c.id)
    if (ids.length > 0) {
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .eq('is_read', false)
        .neq('sender_id', profile.id)
      unreadMessages = msgCount ?? 0
    }
  }

  const notificationsHref = profile?.role === 'vendeur' ? '/seller/notifications' : '/account/notifications';'
  const messagesHref = profile?.role === 'vendeur' ? '/seller/messages' : '/account/messages'

  return (
    <header className="site-header">
      <Link href="/" className="site-logo">
        <Image src="/logo-icon.png" alt="" width={30} height={30} className="site-logo-mark" priority />
        O'LA Market
      </Link>

      <nav className="site-nav">
        <Link href="/market">Acheter</Link>
        <Link href="/cart">Panier</Link>
        {profile?.role === 'vendeur' && <Link href="/seller/dashboard">Ma boutique</Link>}
        {profile?.role === 'admin' && <Link href="/admin">Admin</Link>}
        {profile && (
          <Link href={messagesHref}>
            💬{unreadMessages > 0 && <span className="nav-notif-badge">{unreadMessages}</span>}
          </Link>
        )}
        {profile && (
          <Link href={notificationsHref}>
            🔔{unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
          </Link>
        )}
        {profile ? (
          <>
            <Link href="/account/orders">
              <span>Bonjour, </span>
              {profile.full_name?.split(' ')[0] ?? 'Mon compte'}
            </Link>
            <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
          </>
        ) : (
          <>
            <Link href="/login">Se connecter</Link>
            <Link href="/register" className="btn-primary">Créer un compte</Link>
          </>
        )}
      </nav>
    </header>
  )
}