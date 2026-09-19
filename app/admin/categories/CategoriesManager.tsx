'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/slugify'

type Category = { id: string; name: string; slug: string; position: number }

export default function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [categories, setCategories] = useState(initialCategories)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug: slugify(name), position: categories.length })
      .select('id, name, slug, position')
      .single()

    setLoading(false)
    if (!error && data) {
      setCategories((prev) => [...prev, data])
      setName('')
      router.refresh()
    }
  }

  async function removeCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ? Les produits liés perdront leur catégorie.')) return
    setCategories((prev) => prev.filter((c) => c.id !== id))
    await supabase.from('categories').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <form onSubmit={addCategory} className="inline-form">
        <input
          type="text"
          placeholder="Nouvelle catégorie (ex : Jouets)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary" disabled={loading}>{loading ? '…' : 'Ajouter'}</button>
      </form>

      <div className="admin-table" style={{ marginTop: 20 }}>
        <div className="admin-table-head" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <span>Nom</span><span>Slug</span><span>Action</span>
        </div>
        {categories.map((c) => (
          <div className="admin-table-row" key={c.id} style={{ gridTemplateColumns: '1fr 1fr auto' }}>
            <span>{c.name}</span>
            <span>{c.slug}</span>
            <button className="link-danger" onClick={() => removeCategory(c.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
}
