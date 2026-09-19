import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AccountMessagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/account/messages')

  const { data: conversations } = await supabase
    .from('conversations')
    .select(
      `id, created_at,
       store:stores(name, slug),
       seller:profiles!conversations_seller_id_fkey(full_name)`
    )
    .eq('client_id', user.id)
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
    <div className="orders-page">
      <h1>Messages</h1>

      {withMeta.length === 0 ? (
        <p className="panel-sub">
          Aucune conversation pour l'instant. Contactez un vendeur depuis une fiche produit ou une boutique.
        </p>
      ) : (
        <div className="conv-list">
          {withMeta.map((c) => (
            <Link href={`/account/messages/${c.id}`} key={c.id} className="conv-row">
              <div className="conv-row-main">
                {/* @ts-expect-error -- relations renvoyées comme objets uniques */}
                <span className="conv-name">{c.seller?.full_name ?? c.store?.name ?? 'Vendeur'}</span>
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
