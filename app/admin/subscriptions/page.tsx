import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import PlansManager from './PlansManager'

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name, price, max_products, active')
    .order('price')

  const { data: adPlans } = await supabase
    .from('advertising_plans')
    .select('id, label, duration_days, price, active')
    .order('duration_days')

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/subscriptions" />
      <div className="admin-content">
        <h1>Abonnements & publicité</h1>
        <p className="panel-sub">
          Ces tarifs sont lus dynamiquement par le site — les modifier ici change immédiatement
          ce qui est affiché aux vendeurs, sans toucher au code.
        </p>
        <PlansManager initialPlans={plans ?? []} initialAdPlans={adPlans ?? []} />
      </div>
    </div>
  )
}
