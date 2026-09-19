'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, withRandomSuffix } from '@/lib/slugify'

type Category = { id: string; name: string; subcategories: { id: string; name: string; category_id: string }[] }

export default function NewProductForm({
  storeId,
  categories,
  hasActiveSubscription,
  maxProducts,
  currentProductCount,
}: {
  storeId: string
  categories: Category[]
  hasActiveSubscription: boolean
  maxProducts: number | null
  currentProductCount: number
}) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [stock, setStock] = useState('1')
  const [unit, setUnit] = useState('')
  const [city, setCity] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [galleryImages, setGalleryImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId]
  )

  const limitReached = !hasActiveSubscription
    ? currentProductCount > 0 // sans abonnement actif, on bloque toute nouvelle publication
    : maxProducts !== null && currentProductCount >= maxProducts

  async function uploadImage(file: File, userId: string) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
    if (uploadError) throw uploadError
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (limitReached) {
      setError(
        !hasActiveSubscription
          ? "Votre abonnement n'est plus actif. Renouvelez-le pour publier de nouveaux produits."
          : `Limite de ${maxProducts} produits atteinte pour votre plan. Passez à un plan supérieur.`
      )
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const mainImageUrl = mainImage ? await uploadImage(mainImage, user.id) : null
      const galleryUrls = await Promise.all(galleryImages.map((f) => uploadImage(f, user.id)))

      let slug = slugify(name)
      let productId: string | null = null
      let attempts = 0

      while (!productId && attempts < 5) {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            seller_id: user.id,
            store_id: storeId,
            category_id: categoryId || null,
            subcategory_id: subcategoryId || null,
            name,
            slug,
            description,
            price: Number(price),
            old_price: oldPrice ? Number(oldPrice) : null,
            stock: Number(stock),
            unit,
            city,
            image_url: mainImageUrl,
            status: 'active',
          })
          .select('id')
          .single()

        if (!insertError) {
          productId = data.id
        } else if (insertError.code === '23505') {
          slug = withRandomSuffix(slugify(name))
          attempts++
        } else {
          throw insertError
        }
      }

      if (!productId) throw new Error('slug_conflict')

      if (galleryUrls.length > 0) {
        await supabase.from('product_images').insert(
          galleryUrls.map((url, i) => ({ product_id: productId, image_url: url, position: i }))
        )
      }

      router.push('/seller/products')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Impossible de créer le produit. Vérifiez les informations et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="seller-page">
      <h1>Ajouter un produit</h1>

      {limitReached && (
        <p className="form-error">
          {!hasActiveSubscription
            ? "Votre abonnement n'est plus actif : renouvelez-le pour publier de nouveaux produits."
            : `Limite de ${maxProducts} produits atteinte pour votre plan.`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        <label>
          Nom du produit
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Description
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="field-row">
          <label>
            Catégorie
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId('') }}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Sous-catégorie
            <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
              <option value="">—</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Prix (FCFA)
            <input type="number" required min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Ancien prix (optionnel)
            <input type="number" min={0} value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
          </label>
        </div>

        <div className="field-row">
          <label>
            Stock
            <input type="number" required min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          </label>
          <label>
            Unité (optionnel)
            <input type="text" placeholder="pièce, kg, sac..." value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
        </div>

        <label>
          Ville
          <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
        </label>

        <label>
          Image principale
          <input type="file" accept="image/*" onChange={(e) => setMainImage(e.target.files?.[0] ?? null)} />
        </label>

        <label>
          Photos supplémentaires
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setGalleryImages(Array.from(e.target.files ?? []))}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading || limitReached}>
          {loading ? 'Publication…' : 'Publier le produit'}
        </button>
      </form>
    </div>
  )
}
