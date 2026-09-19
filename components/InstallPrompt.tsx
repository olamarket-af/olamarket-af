'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'ola-market-install-dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Déjà installée (mode standalone) ou déjà refusée par l'utilisateur :
    // ne jamais afficher la bannière.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (isStandalone || dismissed) return

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setVisible(false))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="install-banner">
      <span className="install-banner-text">
        📲 <strong>Installez O'LA Market</strong> — achetez et vendez plus vite depuis votre téléphone.
      </span>
      <div className="install-banner-actions">
        <button className="btn-primary" onClick={handleInstall}>Installer</button>
        <button className="btn-ghost" onClick={handleDismiss}>Plus tard</button>
      </div>
    </div>
  )
}
