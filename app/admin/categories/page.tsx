import { createClient } from '@/lib/supabase/server'
import AdminNav from '../AdminNav'
import CategoriesManager from './CategoriesManager'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, position')
    .order('position')

  return (
    <div className="admin-layout">
      <AdminNav active="/admin/categories" />
      <div className="admin-content">
        <h1>Catégories</h1>
        <CategoriesManager initialCategories={categories ?? []} />
      </div>
    </div>
  )
}
