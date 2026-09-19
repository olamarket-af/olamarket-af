'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Plan = { id: string; name: string; price: number; max_products: number | null; active: boolean }
type AdPlan = { id: string; label: string; duration_days: number; price: number; active: boolean }

export default function PlansManager({
  initialPlans,
  initialAdPlans,
}: {
  initialPlans: Plan[]
  initialAdPlans: AdPlan[]
}) {
  const supabase = createClient()
  const [plans, setPlans] = useState(initialPlans)
  const [adPlans, setAdPlans] = useState(initialAdPlans)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function savePlan(plan: Plan) {
    setSavingId(plan.id)
    await supabase
      .from('subscription_plans')
      .update({ price: plan.price, max_products: plan.max_products, active: plan.active })
      .eq('id', plan.id)
    setSavingId(null)
  }

  async function saveAdPlan(plan: AdPlan) {
    setSavingId(plan.id)
    await supabase
      .from('advertising_plans')
      .update({ price: plan.price, duration_days: plan.duration_days, active: plan.active })
      .eq('id', plan.id)
    setSavingId(null)
  }

  return (
    <>
      <h3 className="admin-section-title">Plans d'abonnement vendeurs</h3>
      <div className="admin-table">
        <div className="admin-table-head" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto' }}>
          <span>Plan</span><span>Prix (FCFA/mois)</span><span>Max produits (vide = illimité)</span><span>Actif</span><span></span>
        </div>
        {plans.map((plan, i) => (
          <div className="admin-table-row" key={plan.id} style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto' }}>
            <span style={{ textTransform: 'capitalize' }}>{plan.name}</span>
            <input
              type="number"
              value={plan.price}
              onChange={(e) => {
                const v = Number(e.target.value)
                setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, price: v } : p)))
              }}
            />
            <input
              type="number"
              value={plan.max_products ?? ''}
              placeholder="illimité"
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, max_products: v } : p)))
              }}
            />
            <input
              type="checkbox"
              checked={plan.active}
              onChange={(e) => {
                const v = e.target.checked
                setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, active: v } : p)))
              }}
            />
            <button className="btn-primary" onClick={() => savePlan(plan)} disabled={savingId === plan.id}>
              {savingId === plan.id ? '…' : 'Enregistrer'}
            </button>
          </div>
        ))}
      </div>

      <h3 className="admin-section-title" style={{ marginTop: 32 }}>Formules de publicité</h3>
      <div className="admin-table">
        <div className="admin-table-head" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto' }}>
          <span>Formule</span><span>Durée (jours)</span><span>Prix (FCFA)</span><span>Active</span><span></span>
        </div>
        {adPlans.map((plan, i) => (
          <div className="admin-table-row" key={plan.id} style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto' }}>
            <span>{plan.label}</span>
            <input
              type="number"
              value={plan.duration_days}
              onChange={(e) => {
                const v = Number(e.target.value)
                setAdPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, duration_days: v } : p)))
              }}
            />
            <input
              type="number"
              value={plan.price}
              onChange={(e) => {
                const v = Number(e.target.value)
                setAdPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, price: v } : p)))
              }}
            />
            <input
              type="checkbox"
              checked={plan.active}
              onChange={(e) => {
                const v = e.target.checked
                setAdPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, active: v } : p)))
              }}
            />
            <button className="btn-primary" onClick={() => saveAdPlan(plan)} disabled={savingId === plan.id}>
              {savingId === plan.id ? '…' : 'Enregistrer'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
