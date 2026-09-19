'use client'

export default function OfflinePage() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>Vous êtes hors connexion</h1>
        <p>Vérifiez votre connexion internet pour continuer à utiliser O'LA Market.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    </div>
  )
}
