'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setLoading(false)
      setError(
        signInError.message.includes('Invalid login credentials')
          ? 'E-mail ou mot de passe incorrect.'
          : 'Connexion impossible. Réessayez.'
      )
      return
    }

    // Compte suspendu ? on bloque même si l'authentification a réussi.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profile?.status === 'suspended') {
      await supabase.auth.signOut()
      setError('Ce compte a été suspendu. Contactez le support O\'LA Market.')
      return
    }

    const next = searchParams.get('next')
    if (next) {
      router.push(next)
    } else if (profile?.role === 'admin') {
      router.push('/admin')
    } else if (profile?.role === 'vendeur') {
      router.push('/seller/dashboard')
    } else {
      router.push('/account')
    }
    router.refresh()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Se connecter</h1>

        <form onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-switch">
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        </p>
        <p className="auth-switch">
          Pas encore de compte ? <Link href="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  )
}
