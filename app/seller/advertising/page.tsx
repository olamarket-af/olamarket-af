import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdvertisingForm from './AdvertisingForm'

export default async function SellerAdvertisingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const { payment } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/advertising')

  const { data: store } = await supabase.from('stores').select('id, name').eq('seller_id', user.id).maybeSingle()
  if (!store) redirect('/seller/register')

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .eq('seller_id', user.id)
    .eq('status', 'active')

  const { data: adPlans } = await supabase
    .from('advertising_plans')
    .select('id, label, duration_days, price')
    .eq('active', true)
    .order('duration_days')

  const { data: activeAds } = await supabase
    .from('advertisements')
    .select('id, type, status, start_date, end_date, product:products(name)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

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
      <h1>Publicité</h1>

      {payment === 'completed' && <p className="panel-sub" style={{ color: 'var(--green, #1F7A5C)' }}>✓ Paiement confirmé — votre publicité est active.</p>}
      {payment === 'failed' && <p className="form-error">Le paiement a échoué. Vous pouvez réessayer ci-dessous.</p>}

      <div className="admin-panel">
        <h3>Nouvelle publicité</h3>
        <AdvertisingForm
          storeId={store.id}
          products={products ?? []}
          adPlans={adPlans ?? []}
          mtnNumber={manualPayment?.mtn_number}
          moovNumber={manualPayment?.moov_number}
          ownerName={manualPayment?.owner_name}
        />
      </div>

      <h3 className="admin-section-title" style={{ marginTop: 32 }}>Historique</h3>
      {!activeAds || activeAds.length === 0 ? (
        <p className="panel-sub">Aucune publicité pour l'instant.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Produit / Boutique</span><span>Type</span><span>Statut</span><span>Expire</span><span></span>
          </div>
          {activeAds.map((ad) => (
            <div className="admin-table-row" key={ad.id}>
              {/* @ts-expect-error -- relation renvoyée comme objet unique */}
              <span>{ad.product?.name ?? store.name}</span>
              <span>{ad.type}</span>
              <span className={`badge ${ad.status === 'active' ? 'badge-ok' : ''}`}>{ad.status}</span>
              <span>{ad.end_date ? new Date(ad.end_date).toLocaleDateString('fr-FR') : '—'}</span>
              <span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
