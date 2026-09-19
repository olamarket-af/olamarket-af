'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = { id: string; name: string; subcategories: { id: string; name: string; category_id: string }[] }
type ProductImage = { id: string; image_url: string; position: number }
type Product = {
  id: string
  name: string
  description: string | null
  price: number
  old_price: number | null
  stock: number
  unit: string | null
  city: string | null
  status: string
  category_id: string | null
  subcategory_id: string | null
  image_url: string | null
  product_images: ProductImage[]
}

export default function EditProductForm({
  product,
  categories,
}: {
  product: Product
  categories: Category[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [price, setPrice] = useState(String(product.price))
  const [oldPrice, setOldPrice] = useState(product.old_price ? String(product.old_price) : '')
  const [stock, setStock] = useState(String(product.stock))
  const [unit, setUnit] = useState(product.unit ?? '')
  const [city, setCity] = useState(product.city ?? '')
  const [status, setStatus] = useState(product.status)
  const [categoryId, setCategoryId] = useState(product.category_id ?? '')
  const [subcategoryId, setSubcategoryId] = useState(product.subcategory_id ?? '')
  const [newImages, setNewImages] = useState<File[]>([])
  const [gallery, setGallery] = useState(product.product_images)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subcategories = useMemo(
    () => categories.find((c) => c.id === categoryId)?.subcategories ?? [],
    [categories, categoryId]
  )

  async function removeGalleryImage(imageId: string) {
    setGallery((prev) => prev.filter((img) => img.id !== imageId))
    await supabase.from('product_images').delete().eq('id', imageId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name,
          description,
          price: Number(price),
          old_price: oldPrice ? Number(oldPrice) : null,
          stock: Number(stock),
          unit,
          city,
          status,
          category_id: categoryId || null,
          subcategory_id: subcategoryId || null,
        })
        .eq('id', product.id)

      if (updateError) throw updateError

      if (newImages.length > 0) {
        const uploaded = await Promise.all(
          newImages.map(async (file, i) => {
            const ext = file.name.split('.').pop()
            const path = `${user.id}/${Date.now()}-${i}.${ext}`
            const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
            if (uploadError) throw uploadError
            return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
          })
        )

        await supabase.from('product_images').insert(
          uploaded.map((url, i) => ({
            product_id: product.id,
            image_url: url,
            position: gallery.length + i,
          }))
        )
      }

      router.push('/seller/products')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Impossible d\'enregistrer les modifications.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="seller-page">
      <h1>Modifier le produit</h1>

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
            Statut
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">En ligne</option>
              <option value="draft">Brouillon</option>
              <option value="out_of_stock">Rupture de stock</option>
              <option value="suspended">Suspendu</option>
            </select>
          </label>
        </div>

        <label>
          Ville
          <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
        </label>

        {gallery.length > 0 && (
          <div className="edit-gallery">
            {gallery.map((img) => (
              <div className="edit-gallery-item" key={img.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" />
                <button type="button" onClick={() => removeGalleryImage(img.id)}>Retirer</button>
              </div>
            ))}
          </div>
        )}

        <label>
          Ajouter des photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
