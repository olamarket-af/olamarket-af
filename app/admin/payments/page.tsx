import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import RefundRow from './RefundRow'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, purpose, provider, provider_reference, status, created_at, user:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/payments" />
      <div className="admin-content">
        <h1>Paiements</h1>

        <div className="admin-panel" style={{ borderColor: 'var(--amber, #E8863A)' }}>
          <h3>⚠️ Remboursement : action manuelle obligatoire</h3>
          <p className="panel-sub" style={{ margin: 0 }}>
            FedaPay ne propose pas d'API de remboursement — l'opération se fait uniquement
            depuis le Dashboard FedaPay (bouton "Refund" sur la transaction), et uniquement
            pour les paiements MTN Mobile Money. Le bouton ci-dessous ne fait que mettre à jour
            l'état dans O'LA Market <strong>après</strong> avoir traité le remboursement côté FedaPay —
            il ne déclenche aucun virement.
          </p>
        </div>

        <div className="admin-table" style={{ marginTop: 20 }}>
          <div className="admin-table-head">
            <span>Utilisateur</span><span>Objet</span><span>Référence</span><span>Statut</span><span>Action</span>
          </div>
          {payments?.map((p) => (
            // @ts-expect-error -- relation renvoyée comme objet unique
            <RefundRow key={p.id} payment={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
