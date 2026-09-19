import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../market/ProductCard'
import AdminNav from './AdminNav'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  const [
    { count: usersCount },
    { count: sellersCount },
    { count: storesCount },
    { count: productsCount },
    { count: ordersCount },
    { count: activeSubsCount },
    { count: expiredSubsCount },
    { count: pendingReportsCount },
    { data: payments },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vendeur'),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payments').select('amount, purpose').eq('status', 'completed'),
  ])

  const subscriptionRevenue = (payments ?? [])
    .filter((p) => p.purpose === 'subscription')
    .reduce((s, p) => s + Number(p.amount), 0)
  const advertisingRevenue = (payments ?? [])
    .filter((p) => p.purpose === 'advertising')
    .reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="admin-layout">
      <AdminNav active="/admin" />
      <div className="admin-content">
        <h1>Vue d'ensemble</h1>
        <div className="stat-grid">
          <Stat label="Clients" value={String(usersCount ?? 0)} />
          <Stat label="Vendeurs" value={String(sellersCount ?? 0)} />
          <Stat label="Boutiques" value={String(storesCount ?? 0)} />
          <Stat label="Produits" value={String(productsCount ?? 0)} />
          <Stat label="Commandes" value={String(ordersCount ?? 0)} />
          <Stat label="Abonnements actifs" value={String(activeSubsCount ?? 0)} />
          <Stat label="Abonnements expirés" value={String(expiredSubsCount ?? 0)} />
          <Stat label="Signalements en attente" value={String(pendingReportsCount ?? 0)} />
        </div>

        <div className="admin-panel">
          <h3>Revenus O'LA Market (pas de commission sur les ventes)</h3>
          <div className="stat-grid">
            <Stat label="Revenus abonnements" value={formatFcfa(subscriptionRevenue)} />
            <Stat label="Revenus publicité" value={formatFcfa(advertisingRevenue)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
