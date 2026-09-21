import Image from 'next/image'
import Link from 'next/link'
import { createClient, getCurrentProfile } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'
export default async function Header() {
  let user = null
  let profile = null

  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      profile = profileData
    }
  } catch (error) {
    console.error('Header: Supabase not available', error)
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