import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Transaction } from '@/lib/fedapay'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// GET /api/payments/callback?payment_id=...&id=...&status=...
// FedaPay redirige le NAVIGATEUR du client ici après la tentative de
// paiement. Ce n'est qu'un affichage immédiat pour l'utilisateur — la
// confirmation qui fait foi et déclenche l'activation (via le trigger SQL
// notify_payment_completed) vient du webhook server-to-server, plus fiable
// qu'une redirection navigateur qui peut être interrompue.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('payment_id')
  const transactionId = searchParams.get('id')

  if (!paymentId) {
    return NextResponse.redirect(`${SITE_URL}/seller/dashboard`)
  }

  const supabase = createAdminClient()

  try {
    if (transactionId) {
      // Vérifie le statut réel auprès de FedaPay plutôt que de faire
      // confiance au paramètre `status` de l'URL, qui peut être falsifié.
      const transaction = await Transaction.retrieve(Number(transactionId))

      if (transaction.status === 'approved') {
        await supabase.from('payments').update({ status: 'completed' }).eq('id', paymentId).eq('status', 'pending')
      } else if (transaction.status === 'declined' || transaction.status === 'canceled') {
        await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId).eq('status', 'pending')
      }
      // Sinon (pending) : on laisse le webhook trancher plus tard.
    }
  } catch (err) {
    console.error('Erreur vérification transaction FedaPay au callback:', err)
    // On ne bloque pas l'utilisateur pour autant — le webhook rattrapera l'état correct.
  }

  const { data: payment } = await supabase.from('payments').select('purpose, status').eq('id', paymentId).single()

  const destination =
    payment?.purpose === 'advertising' ? '/seller/advertising' : '/seller/subscription'

  return NextResponse.redirect(`${SITE_URL}${destination}?payment=${payment?.status ?? 'pending'}`)
}
