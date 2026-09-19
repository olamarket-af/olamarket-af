import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import SubscribeButton from './SubscribeButton'
import ManualPaymentForm from '@/components/ManualPaymentForm'

export default async function SellerSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; onboarding?: string }>
}) {
  const { payment, onboarding } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/subscription')

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, price, max_products, features')
    .eq('active', true)
    .order('price')

  const { data: currentSubscription } = await supabase
    .from('subscriptions')
    .select('id, status, end_date, plan:subscription_plans(name)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: manualPaymentSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'manual_payment')
    .maybeSingle()
  const manualPayment = manualPaymentSetting?.value as
    | { mtn_number?: string; moov_number?: string; owner_name?: string }
    | undefined

  return (
    <div className="seller-page">
      <h1>Abonnement</h1>

      {onboarding === '1' && (
        <div className="admin-panel" style={{ borderColor: 'var(--amber, #E8863A)' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>🎉 Boutique créée !</p>
          <p className="panel-sub" style={{ margin: '4px 0 10px' }}>
            Choisissez un plan pour commencer à publier — ou passez cette étape, vous pourrez
            publier un premier produit gratuitement en attendant.
          </p>
          <Link href="/seller/dashboard">Passer pour l'instant →</Link>
        </div>
      )}

      {payment === 'completed' && <p className="panel-sub" style={{ color: 'var(--green, #1F7A5C)' }}>✓ Paiement confirmé — votre abonnement est actif.</p>}
      {payment === 'pending' && <p className="panel-sub">Paiement en cours de confirmation — actualisez dans un instant.</p>}
      {payment === 'failed' && <p className="form-error">Le paiement a échoué. Vous pouvez réessayer ci-dessous.</p>}

      {currentSubscription && (
        <div className="admin-panel">
          {/* @ts-expect-error -- relation renvoyée comme objet unique */}
          <p style={{ margin: 0 }}>Plan actuel : <strong>{currentSubscription.plan?.name}</strong> — {currentSubscription.status}</p>
          {currentSubscription.status === 'active' && (
            <p className="panel-sub">Actif jusqu'au {new Date(currentSubscription.end_date).toLocaleDateString('fr-FR')}</p>
          )}
        </div>
      )}

      <div className="home-plans" style={{ marginTop: 24 }}>
        {plans?.map((plan) => (
          <div className="home-plan" key={plan.id}>
            <h3 style={{ textTransform: 'capitalize' }}>{plan.name}</h3>
            <div className="price">{formatFcfa(plan.price)} <sub>/ mois</sub></div>
            <ul>
              {(plan.features as string[]).map((f, i) => <li key={i}>{f}</li>)}
              <li>{plan.max_products ? `Jusqu'à ${plan.max_products} produits` : 'Produits illimités'}</li>
            </ul>
            <SubscribeButton planId={plan.id} />
            <ManualPaymentForm
              target={{ purpose: 'subscription', planId: plan.id }}
              mtnNumber={manualPayment?.mtn_number}
              moovNumber={manualPayment?.moov_number}
              ownerName={manualPayment?.owner_name}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
