import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import UserRow from './UserRow'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/users" />
      <div className="admin-content">
        <h1>Utilisateurs</h1>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Nom</span><span>Téléphone</span><span>Rôle</span><span>Statut</span><span>Action</span>
          </div>
          {users?.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      </div>
    </div>
  )
}
