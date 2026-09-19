import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rafraîchit la session Supabase à chaque requête et protège les zones
// privées : /account (client connecté), /seller (rôle vendeur),
// /admin (rôle admin). Adapter la liste selon les routes réellement créées.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPrivate = path.startsWith('/account') || path.startsWith('/seller') || path.startsWith('/admin')

  if (isPrivate && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', path)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (path.startsWith('/seller') || path.startsWith('/admin'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (path.startsWith('/seller') && profile?.role !== 'vendeur' && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/account', request.url))
    }
    if (path.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/account/:path*', '/seller/:path*', '/admin/:path*'],
}
