import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/payments/manual
// Solution transitoire tant qu'il n'y a pas de registre de commerce pour
// ouvrir un compte FedaPay marchand : le vendeur envoie l'argent par Mobile
// Money aux numéros affichés (gérés dans /admin/settings), déclare son
// numéro d'envoi ici, et un admin confirme manuellement depuis
// /admin/payments après avoir vérifié la réception sur son téléphone.
// Même mécanique d'activation que FedaPay ensuite : dès que payments.status
// passe à 'completed', le trigger SQL notify_payment_completed() active
// l'abonnement ou la publicité automatiquement.
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = await request.json()
  const payerPhone: string | undefined = body.payerPhone
  const note: string | undefined = body.note

  if (!payerPhone) {
    return NextResponse.json({ error: 'numero_requis' }, { status: 400 })
  }

  let amount: number
  let referenceId: string

  try {
    if (body.purpose === 'subscription') {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id, price')
        .eq('id', body.planId)
        .single()
      if (!plan) return NextResponse.json({ error: 'plan_introuvable' }, { status: 404 })

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          seller_id: user.id,
          plan_id: plan.id,
          amount: plan.price,
          status: 'pending',
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single()
      if (error || !subscription) throw error

      amount = plan.price
      referenceId = subscription.id
    } else if (body.purpose === 'advertising') {
      const { data: adPlan } = await supabase
        .from('advertising_plans')
        .select('id, price')
        .eq('id', body.advertisingPlanId)
        .single()
      if (!adPlan) return NextResponse.json({ error: 'formule_introuvable' }, { status: 404 })

      const { data: ad, error } = await supabase
        .from('advertisements')
        .insert({
          seller_id: user.id,
          advertising_plan_id: adPlan.id,
          product_id: body.productId ?? null,
          store_id: body.storeId ?? null,
          type: body.type ?? 'sponsored_product',
          price: adPlan.price,
          status: 'pending',
        })
        .select('id')
        .single()
      if (error || !ad) throw error

      amount = adPlan.price
      referenceId = ad.id
    } else {
      return NextResponse.json({ error: 'purpose_invalide' }, { status: 400 })
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      amount,
      purpose: body.purpose,
      reference_id: referenceId,
      provider: 'manual_momo',
      provider_reference: note ? `${payerPhone} — ${note}` : payerPhone,
      status: 'pending',
    })
    if (paymentError) throw paymentError

    // Alerte les admins pour vérification manuelle. Passe par le client
    // service_role car un vendeur n'a pas le droit RLS de créer une
    // notification pour un autre utilisateur (ici, l'admin).
    const admin = createAdminClient()
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    if (admins && admins.length > 0) {
      await admin.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          type: 'manual_payment_submitted',
          title: 'Paiement manuel à vérifier',
          message: `${amount} FCFA déclaré depuis le ${payerPhone}. À confirmer dans /admin/payments.`,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur paiement manuel:', err)
    return NextResponse.json({ error: 'Impossible d\'enregistrer le paiement.' }, { status: 500 })
  }
}
