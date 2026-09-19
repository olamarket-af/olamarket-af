import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChatThread from '@/components/ChatThread'

export default async function AccountMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/account/messages/${id}`)

  const { data: conversation } = await supabase
    .from('conversations')
    .select(
      `id, blocked_by,
       seller:profiles!conversations_seller_id_fkey(full_name),
       store:stores(name)`
    )
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (!conversation) notFound()

  // Marque comme lus les messages reçus avant d'afficher le fil.
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // @ts-expect-error -- relations renvoyées comme objets uniques
  const otherPartyName = conversation.seller?.full_name ?? conversation.store?.name ?? 'Vendeur'

  return (
    <div className="orders-page">
      <p className="order-back"><Link href="/account/messages">← Messages</Link></p>
      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        otherPartyName={otherPartyName}
        initialMessages={messages ?? []}
        isBlocked={!!conversation.blocked_by}
        blockedByMe={conversation.blocked_by === user.id}
      />
    </div>
  )
}
