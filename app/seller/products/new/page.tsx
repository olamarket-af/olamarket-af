import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewProductForm from './NewProductForm'

export default async function NewProductPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/seller/products/new')

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('seller_id', user.id)
    .maybeSingle()

  if (!store) redirect('/seller/register')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, subcategories(id, name, category_id)')
    .order('position')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan:subscription_plans(max_products)')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const { count: currentProductCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', user.id)

  // @ts-expect-error -- relation renvoyée comme objet unique
  const maxProducts = subscription?.plan?.max_products as number | null | undefined

  return (
    <NewProductForm
      storeId={store.id}
      categories={categories ?? []}
      hasActiveSubscription={!!subscription}
      maxProducts={maxProducts ?? null}
      currentProductCount={currentProductCount ?? 0}
    />
  )
}
