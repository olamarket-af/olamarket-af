import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import SellerRow from './SellerRow'

export default async function AdminSellersPage() {
  const supabase = await createClient()

  const { data: sellers } = await supabase
    .from('seller_profiles')
    .select(
      `id, verification_status, business_name,
       profile:profiles!seller_profiles_user_id_fkey(id, full_name, phone),
       store:stores!stores_seller_id_fkey(id, name, slug, status)`
    )

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/sellers" />
      <div className="admin-content">
        <h1>Vendeurs</h1>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Vendeur</span><span>Boutique</span><span>Vérification</span><span>Boutique</span><span>Actions</span>
          </div>
          {sellers?.map((s) => (
            // @ts-expect-error -- relations renvoyées comme objets uniques
            <SellerRow key={s.id} seller={s} />
          ))}
        </div>
      </div>
    </div>
  )
}
