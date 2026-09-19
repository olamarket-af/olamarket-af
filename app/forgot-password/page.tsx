'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('Impossible d\'envoyer le lien. Vérifiez l\'adresse e-mail.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Lien envoyé</h1>
          <p>Si un compte existe pour {email}, un e-mail de réinitialisation vient de lui être envoyé.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Mot de passe oublié</h1>
        <p>Indiquez votre e-mail pour recevoir un lien de réinitialisation.</p>

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

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      </div>
    </div>
  )
}
