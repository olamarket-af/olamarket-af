import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SellerMessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/messages')

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`id, created_at, client:profiles!conversations_client_id_fkey(full_name)`)
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  const withMeta = await Promise.all(
    (conversations ?? []).map(async (c) => {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: unread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      return { ...c, lastMessage, unread: unread ?? 0 }
    })
  )

  return (
    <div className="seller-page">
      <h1>Messages</h1>

      {withMeta.length === 0 ? (
        <p className="panel-sub">Aucune conversation pour l'instant.</p>
      ) : (
        <div className="conv-list">
          {withMeta.map((c) => (
            <Link href={`/seller/messages/${c.id}`} key={c.id} className="conv-row">
              <div className="conv-row-main">
                {/* @ts-expect-error -- relation renvoyée comme objet unique */}
                <span className="conv-name">{c.client?.full_name ?? 'Client'}</span>
                <span className="conv-preview">{c.lastMessage?.content ?? 'Nouvelle conversation'}</span>
              </div>
              {c.unread > 0 && <span className="nav-notif-badge">{c.unread}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
