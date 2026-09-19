'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Role = 'client' | 'vendeur'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<Role>('client')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Repris par le trigger handle_new_user() côté base pour créer la ligne
        // dans "profiles" avec le bon rôle.
        data: { full_name: fullName, phone, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(traduireErreur(signUpError.message))
      return
    }

    // Si la confirmation par e-mail est activée dans Supabase Auth, il n'y a
    // pas encore de session à ce stade.
    if (!data.session) {
      setCheckEmail(true)
      return
    }

    router.push(role === 'vendeur' ? '/seller/register' : '/account')
  }

  if (checkEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Vérifiez votre e-mail</h1>
          <p>
            Nous avons envoyé un lien de confirmation à <strong>{email}</strong>.
            Cliquez dessus pour activer votre compte O'LA Market.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Créer un compte</h1>

        <div className="role-toggle" role="tablist" aria-label="Type de compte">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'client'}
            className={role === 'client' ? 'active' : ''}
            onClick={() => setRole('client')}
          >
            J'achète
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'vendeur'}
            className={role === 'vendeur' ? 'active' : ''}
            onClick={() => setRole('vendeur')}
          >
            Je vends
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Nom complet
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label>
            Téléphone
            <input
              type="tel"
              required
              placeholder="+229 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Création du compte…' : role === 'vendeur' ? 'Créer mon compte vendeur' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-switch">
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

function traduireErreur(message: string) {
  if (message.includes('already registered')) return 'Un compte existe déjà avec cet e-mail.'
  if (message.includes('Password should be')) return 'Le mot de passe doit contenir au moins 8 caractères.'
  return "Impossible de créer le compte. Vérifiez vos informations et réessayez."
}
