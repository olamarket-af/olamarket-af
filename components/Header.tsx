import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="site-header">
      <Link href="/" className="site-logo">
        <Image src="/logo-icon.png" alt="" width={30} height={30} className="site-logo-mark" priority />
        O'LA Market
      </Link>

      <nav className="site-nav">
        <Link href="/market">Acheter</Link>
        <Link href="/cart">Panier</Link>
        {profile?.role === 'vendeur' && <Link href="/seller/dashboard">Ma boutique</Link>}
        {profile?.role === 'admin' && <Link href="/admin">Admin</Link>}
        {user ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Se déconnecter
            </button>
          </form>
        ) : (
          <Link href="/login">Connexion</Link>
        )}
      </nav>
    </header>
  )
}