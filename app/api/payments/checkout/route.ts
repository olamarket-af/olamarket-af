import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Transaction } from '@/lib/fedapay'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// POST /api/payments/checkout
// body: { purpose: 'subscription', planId: string }
//    or { purpose: 'advertising', advertisingPlanId: string, productId?: string, storeId?: string, type: string }
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()

  let amount: number
  let description: string
  let referenceTable: 'subscriptions' | 'advertisements'
  let referenceId: string

  try {
    if (body.purpose === 'subscription') {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('id, name, price')
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
      description = `Abonnement O'LA Market — plan ${plan.name}`
      referenceTable = 'subscriptions'
      referenceId = subscription.id
    } else if (body.purpose === 'advertising') {
      const { data: adPlan } = await supabase
        .from('advertising_plans')
        .select('id, label, duration_days, price')
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
      description = `Publicité O'LA Market — ${adPlan.label}`
      referenceTable = 'advertisements'
      referenceId = ad.id
    } else {
      return NextResponse.json({ error: 'purpose_invalide' }, { status: 400 })
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        purpose: body.purpose,
        reference_id: referenceId,
        provider: 'fedapay',
        status: 'pending',
      })
      .select('id')
      .single()
    if (paymentError || !payment) throw paymentError

    const [firstname, ...rest] = (profile?.full_name ?? 'Client O\'LA').split(' ')

    const transaction = await Transaction.create({
      description,
      amount,
      currency: { iso: 'XOF' },
      callback_url: `${SITE_URL}/api/payments/callback?payment_id=${payment.id}`,
      customer: {
        firstname: firstname || 'Client',
        lastname: rest.join(' ') || 'O\'LA',
        email: user.email,
        phone_number: profile?.phone ? { number: profile.phone, country: 'bj' } : undefined,
      },
    })

    await supabase.from('payments').update({ provider_reference: String(transaction.id) }).eq('id', payment.id)

    const token = await transaction.generateToken()

    return NextResponse.json({ url: token.url })
  } catch (err: any) {
    console.error('Erreur création paiement FedaPay:', err)
    return NextResponse.json({ error: 'Impossible de créer le paiement.' }, { status: 500 })
  }
}
