'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Atteint uniquement via le lien reçu par e-mail (voir /auth/callback), qui a
// déjà établi une session temporaire permettant de changer le mot de passe.
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 1500)
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Mot de passe mis à jour</h1>
          <p>Redirection vers la connexion…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Choisir un nouveau mot de passe</h1>

        <form onSubmit={handleSubmit}>
          <label>
            Nouveau mot de passe
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
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
