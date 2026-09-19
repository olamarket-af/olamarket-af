'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function ChatThread({
  conversationId,
  currentUserId,
  otherPartyName,
  initialMessages,
  isBlocked,
  blockedByMe,
}: {
  conversationId: string
  currentUserId: string
  otherPartyName: string
  initialMessages: Message[]
  isBlocked: boolean
  blockedByMe: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState(isBlocked)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || blocked) return

    setSending(true)
    const body = content.trim()
    setContent('')

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content: body })
      .select('id, sender_id, content, created_at')
      .single()

    setSending(false)

    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    }
  }

  async function toggleBlock() {
    if (blocked && !blockedByMe) return // seul celui qui a bloqué peut débloquer
    const next = blocked ? null : currentUserId
    await supabase.from('conversations').update({ blocked_by: next }).eq('id', conversationId)
    setBlocked(!!next)
    router.refresh()
  }

  async function reportConversation() {
    const reason = prompt('Motif du signalement ?')
    if (!reason) return
    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      target_type: 'message',
      target_id: messages[messages.length - 1]?.id ?? conversationId,
      reason,
    })
    alert('Signalement envoyé à l\'équipe O\'LA Market.')
  }

  return (
    <div className="chat-thread">
      <div className="chat-header">
        <span>{otherPartyName}</span>
        <div className="chat-header-actions">
          <button onClick={toggleBlock} disabled={blocked && !blockedByMe}>
            {blocked ? (blockedByMe ? 'Débloquer' : 'Bloqué') : 'Bloquer'}
          </button>
          <button onClick={reportConversation}>Signaler</button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.sender_id === currentUserId ? 'mine' : ''}`}>
            <p>{m.content}</p>
            <span className="chat-bubble-time">
              {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <p className="panel-sub" style={{ padding: '0 16px 16px' }}>
          {blockedByMe
            ? "Vous avez bloqué cette conversation. Débloquez-la pour reprendre l'échange."
            : "Cette conversation a été bloquée."}
        </p>
      ) : (
        <form className="chat-input-row" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Écrire un message…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button className="btn-primary" disabled={sending || !content.trim()}>Envoyer</button>
        </form>
      )}
    </div>
  )
}
