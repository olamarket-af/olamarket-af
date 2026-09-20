import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatFcfa } from '../../market/ProductCard'
import { statusLabel } from '../../account/orders/statusLabel'

// Rappel : ces chiffres sont les ventes du vendeur, pas des revenus O'LA
// Market — la plateforme ne prélève aucune commission dessus.
export default async function SellerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/dashboard')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug, status')
    .eq('seller_id', user.id)
    .maybeSingle()

  if (!store) redirect('/seller/register')

  const { data: stats } = await supabase
    .from('seller_statistics')
    .select('*')
    .eq('seller_id', user.id)
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, end_date, plan:subscription_plans(name, max_products)')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: activeAdsCount } = await supabase
    .from('advertisements')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)
    .eq('status', 'active')

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, subtotal, status, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const plan = subscription?.plan as { name: string; max_products: number | null } | undefined

  return (
    <div className="seller-page">
      <div className="seller-page-header">
        <div>
          <h1>{store.name}</h1>
          <Link href={`/market/store/${store.slug}`} className="seller-view-store">
            Voir ma boutique publique →
          </Link>
        </div>
        <Link href="/seller/products/new" className="btn-primary">+ Ajouter un produit</Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Ventes (livrées/terminées)" value={formatFcfa(stats?.total_sales ?? 0)} />
        <StatCard label="Commandes" value={String(stats?.total_orders ?? 0)} />
        <StatCard label="Produits actifs" value={String(stats?.active_products ?? 0)} />
        <StatCard label="En rupture" value={String(stats?.out_of_stock_products ?? 0)} />
        <StatCard label="Vues cumulées" value={String(stats?.total_views ?? 0)} />
        <StatCard label="Favoris" value={String(stats?.total_favorites ?? 0)} />
        <StatCard
          label="Note moyenne"
          value={stats?.total_reviews ? `★ ${Number(stats.average_rating).toFixed(1)} (${stats.total_reviews})` : '—'}
        />
        <StatCard label="Publicités actives" value={String(activeAdsCount ?? 0)} />
      </div>

      <div className="seller-panels">
        <div className="panel">
          <h3>Abonnement</h3>
          {subscription ? (
            <>
              <p>Plan <strong>{plan?.name}</strong> — actif jusqu'au {new Date(subscription.end_date).toLocaleDateString('fr-FR')}</p>
              <p className="panel-sub">
                {plan?.max_products ? `Jusqu'à ${plan.max_products} produits` : 'Produits illimités'}
              </p>
            </>
          ) : (
            <p>Aucun abonnement actif. Certaines fonctionnalités sont limitées.</p>
          )}
          <Link href="/seller/subscription">Gérer mon abonnement →</Link>
          <br />
          <Link href="/seller/advertising">Booster mes produits (publicité) →</Link>
        </div>

        <div className="panel">
          <h3>Commandes récentes</h3>
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((o) => (
              <Link href={`/seller/orders/${o.id}`} key={o.id} className="mini-order-row">
                <span>{o.order_number}</span>
                <span className={`order-status status-${o.status}`}>{statusLabel(o.status)}</span>
                <span>{formatFcfa(o.subtotal)}</span>
              </Link>
            ))
          ) : (
            <p className="panel-sub">Aucune commande pour l'instant.</p>
          )}
          <Link href="/seller/orders">Voir toutes mes commandes →</Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
