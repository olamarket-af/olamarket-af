import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import SettingsManager from './SettingsManager'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase.from('app_settings').select('key, value')

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/settings" />
      <div className="admin-content">
        <h1>Paramètres généraux</h1>
        <SettingsManager initialSettings={settings ?? []} />
      </div>
    </div>
  )
}
