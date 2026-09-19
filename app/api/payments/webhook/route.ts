import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Webhook } from '@/lib/fedapay'

// POST /api/payments/webhook
// Configurer cette URL dans FedaPay → Workbench → Webhooks (avec le secret
// correspondant dans FEDAPAY_WEBHOOK_SECRET). C'est le chemin qui fait foi
// pour activer un abonnement/une publicité (voir notify_payment_completed()
// dans ola_market_notifications.sql, déclenché par le passage de
// payments.status à 'completed').
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-fedapay-signature')
  const endpointSecret = process.env.FEDAPAY_WEBHOOK_SECRET!

  let event: any

  try {
    event = Webhook.constructEvent(rawBody, signature, endpointSecret)
  } catch (err) {
    console.error('Signature de webhook FedaPay invalide:', err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // NOTE: la forme exacte de la charge utile (event.object / event.entity /
  // event.data selon les versions du SDK) doit être confirmée en observant
  // un vrai événement en sandbox avant la mise en prod — logger l'objet
  // complet ci-dessous lors du premier test réel.
  const transaction = event.object?.entity ?? event.object ?? event.entity ?? event.data

  if (!transaction?.id) {
    console.warn('Webhook FedaPay reçu sans transaction identifiable, event brut :', JSON.stringify(event))
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()

  if (event.name === 'transaction.approved') {
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('provider_reference', String(transaction.id))
      .eq('status', 'pending')
  } else if (event.name === 'transaction.declined' || event.name === 'transaction.canceled') {
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('provider_reference', String(transaction.id))
      .eq('status', 'pending')
  }

  return NextResponse.json({ received: true })
}
