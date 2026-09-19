import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChatThread from '@/components/ChatThread'

export default async function SellerMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/seller/messages/${id}`)

  const { data: conversation } = await supabase
    .from('conversations')
    .select(`id, blocked_by, client:profiles!conversations_client_id_fkey(full_name)`)
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!conversation) notFound()

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

  // @ts-expect-error -- relation renvoyée comme objet unique
  const otherPartyName = conversation.client?.full_name ?? 'Client'

  return (
    <div className="seller-page">
      <p className="order-back"><Link href="/seller/messages">← Messages</Link></p>
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
