'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Setting = { key: string; value: any }

export default function SettingsManager({ initialSettings }: { initialSettings: Setting[] }) {
  const supabase = createClient()
  const byKey = Object.fromEntries(initialSettings.map((s) => [s.key, s.value]))

  const [siteName, setSiteName] = useState(byKey.site_name ?? "O'LA Market")
  const [slogan, setSlogan] = useState(byKey.slogan ?? 'Vendez en ligne. Achetez simplement.')
  const [pwa, setPwa] = useState(
    byKey.pwa ?? {
      name: "O'LA Market",
      short_name: "O'LA Market",
      theme_color: '#1B2A4A',
      background_color: '#FBF6EC',
      install_prompt_enabled: true,
    }
  )
  const [manualPayment, setManualPayment] = useState(
    byKey.manual_payment ?? { mtn_number: '', moov_number: '', owner_name: '' }
  )
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function saveAll() {
    setLoading(true)
    await Promise.all([
      supabase.from('app_settings').upsert({ key: 'site_name', value: siteName }),
      supabase.from('app_settings').upsert({ key: 'slogan', value: slogan }),
      supabase.from('app_settings').upsert({ key: 'pwa', value: pwa }),
      supabase.from('app_settings').upsert({ key: 'manual_payment', value: manualPayment }),
    ])
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="product-form" style={{ maxWidth: 520 }}>
      <label>
        Nom du site
        <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
      </label>

      <label>
        Slogan
        <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} />
      </label>

      <div className="panel" style={{ background: 'var(--paper-dim, #F3ECDC)', padding: 16, borderRadius: 12 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Commission sur les ventes : 0 %</p>
        <p className="panel-sub" style={{ margin: 0 }}>
          Verrouillée par choix de modèle économique — O'LA Market ne prélève jamais de pourcentage
          sur les ventes des vendeurs. Non modifiable depuis cet écran.
        </p>
      </div>

      <h3 className="admin-section-title">Progressive Web App</h3>
      <div className="field-row">
        <label>
          Nom (PWA)
          <input type="text" value={pwa.name} onChange={(e) => setPwa({ ...pwa, name: e.target.value })} />
        </label>
        <label>
          Nom court
          <input type="text" value={pwa.short_name} onChange={(e) => setPwa({ ...pwa, short_name: e.target.value })} />
        </label>
      </div>
      <div className="field-row">
        <label>
          Couleur du thème
          <input type="color" value={pwa.theme_color} onChange={(e) => setPwa({ ...pwa, theme_color: e.target.value })} />
        </label>
        <label>
          Couleur de fond
          <input type="color" value={pwa.background_color} onChange={(e) => setPwa({ ...pwa, background_color: e.target.value })} />
        </label>
      </div>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={pwa.install_prompt_enabled}
          onChange={(e) => setPwa({ ...pwa, install_prompt_enabled: e.target.checked })}
        />
        Afficher l'invite d'installation sur Android
      </label>

      <h3 className="admin-section-title">Paiement manuel Mobile Money</h3>
      <p className="panel-sub" style={{ marginTop: -6 }}>
        Affiché aux vendeurs tant qu'aucun compte marchand FedaPay n'est actif (registre de
        commerce en cours). Ils déclarent leur envoi, vous confirmez dans /admin/payments.
      </p>
      <div className="field-row">
        <label>
          Numéro MTN Mobile Money
          <input
            type="tel"
            placeholder="+229 XX XX XX XX"
            value={manualPayment.mtn_number}
            onChange={(e) => setManualPayment({ ...manualPayment, mtn_number: e.target.value })}
          />
        </label>
        <label>
          Numéro Moov Money
          <input
            type="tel"
            placeholder="+229 XX XX XX XX"
            value={manualPayment.moov_number}
            onChange={(e) => setManualPayment({ ...manualPayment, moov_number: e.target.value })}
          />
        </label>
      </div>
      <label>
        Nom du bénéficiaire affiché
        <input
          type="text"
          value={manualPayment.owner_name}
          onChange={(e) => setManualPayment({ ...manualPayment, owner_name: e.target.value })}
        />
      </label>

      <button className="btn-primary" onClick={saveAll} disabled={loading}>
        {loading ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
      </button>
    </div>
  )
}
