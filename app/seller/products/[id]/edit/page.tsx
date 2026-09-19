import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditProductForm from './EditProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/seller/products/${id}/edit`)

  const { data: product } = await supabase
    .from('products')
    .select('*, product_images(id, image_url, position)')
    .eq('id', id)
    .eq('seller_id', user.id) // un vendeur ne modifie que ses propres produits
    .single()

  if (!product) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, subcategories(id, name, category_id)')
    .order('position')

  return <EditProductForm product={product} categories={categories ?? []} />
}
