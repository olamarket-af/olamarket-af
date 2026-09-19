import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import AdModerationRow from './AdModerationRow'

const TYPE_LABELS: Record<string, string> = {
  sponsored_product: 'Produit sponsorisé',
  featured_store: 'Boutique mise en avant',
  banner: 'Bannière',
  recommended: 'Produit recommandé',
  premium_placement: 'Emplacement premium',
}

export default async function AdminAdvertisementsPage() {
  const supabase = await createClient()

  const { data: ads } = await supabase
    .from('advertisements')
    .select(
      `id, type, status, price, start_date, end_date, created_at,
       seller:profiles!advertisements_seller_id_fkey(full_name),
       product:products(name, slug),
       store:stores(name, slug)`
    )
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/advertisements" />
      <div className="admin-content">
        <h1>Publicités</h1>
        <p className="panel-sub">
          100 plus récentes. Les tarifs des formules se modifient dans "Abonnements & pub".
        </p>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Vendeur</span><span>Cible</span><span>Type</span><span>Statut</span><span>Action</span>
          </div>
          {ads?.map((ad) => (
            // @ts-expect-error -- relations renvoyées comme objets uniques
            <AdModerationRow key={ad.id} ad={ad} typeLabel={TYPE_LABELS[ad.type] ?? ad.type} />
          ))}
        </div>
      </div>
    </div>
  )
}
