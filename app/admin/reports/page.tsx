import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import ReportRow from './ReportRow'

const TARGET_LABELS: Record<string, string> = {
  product: 'Produit',
  seller: 'Vendeur',
  comment: 'Avis',
  message: 'Message',
}

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, description, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/reports" />
      <div className="admin-content">
        <h1>Signalements</h1>
        {!reports || reports.length === 0 ? (
          <p className="panel-sub">Aucun signalement.</p>
        ) : (
          <div className="admin-table">
            <div className="admin-table-head">
              <span>Cible</span><span>Motif</span><span>Statut</span><span>Date</span><span>Action</span>
            </div>
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} targetLabel={TARGET_LABELS[r.target_type] ?? r.target_type} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
