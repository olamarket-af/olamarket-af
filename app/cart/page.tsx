import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CartClient, { type CartItemData } from './CartClient'

// Le panier n'existe côté base que pour un utilisateur connecté (voir schéma
// SQL : cart.user_id). Le panier "invité" reste en localStorage côté client
// et doit être fusionné ici après connexion (non couvert par ce fichier).
export default async function CartPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/cart')
  }

  const { data: cart } = await supabase
    .from('cart')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let items: CartItemData[] = []

  if (cart) {
    const { data } = await supabase
      .from('cart_items')
      .select(
        `id, quantity,
         product:products(id, name, slug, price, stock, image_url, store_id, seller_id,
           store:stores(name, slug))`
      )
      .eq('cart_id', cart.id)

    items = (data as unknown as CartItemData[]) ?? []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, address, city')
    .eq('id', user.id)
    .single()

  return (
    <CartClient
      initialItems={items}
      defaultAddress={profile?.address ?? profile?.city ?? ''}
      defaultPhone={profile?.phone ?? ''}
    />
  )
}
