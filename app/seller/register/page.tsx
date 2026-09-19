'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify, withRandomSuffix } from '@/lib/slugify'

// Affichée juste après l'inscription d'un vendeur (voir app/register/page.tsx,
// qui redirige ici avec role = 'vendeur'). Si le vendeur a déjà une boutique,
// on le renvoie directement vers son tableau de bord.
export default function SellerRegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkExistingStore() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login?next=/seller/register')
        return
      }

      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('seller_id', user.id)
        .maybeSingle()

      if (existingStore) {
        router.replace('/seller/dashboard')
        return
      }

      setChecking(false)
    }
    checkExistingStore()
  }, [router, supabase])

  async function uploadImage(file: File, userId: string, kind: 'logo' | 'cover') {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${kind}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('store-images')
      .upload(path, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('store-images').getPublicUrl(path)
    return data.publicUrl
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
        router.replace('/login')
        return
      }

      const [logoUrl, coverUrl] = await Promise.all([
        logoFile ? uploadImage(logoFile, user.id, 'logo') : Promise.resolve(null),
        coverFile ? uploadImage(coverFile, user.id, 'cover') : Promise.resolve(null),
      ])

      const socialLinks: Record<string, string> = {}
      if (facebook) socialLinks.facebook = facebook
      if (instagram) socialLinks.instagram = instagram

      let slug = slugify(name)
      let store: { id: string } | null = null
      let attempts = 0

      // Le nom de boutique n'est pas garanti unique : on retente avec un
      // suffixe si le slug généré existe déjà (contrainte unique en base).
      while (!store && attempts < 5) {
        const { data, error: insertError } = await supabase
          .from('stores')
          .insert({
            seller_id: user.id,
            name,
            slug,
            description,
            phone,
            whatsapp,
            city,
            address,
            logo_url: logoUrl,
            cover_url: coverUrl,
            social_links: socialLinks,
            status: 'active',
          })
          .select('id')
          .single()

        if (!insertError) {
          store = data
        } else if (insertError.code === '23505') {
          // slug déjà pris
          slug = withRandomSuffix(slugify(name))
          attempts++
        } else {
          throw insertError
        }
      }

      if (!store) throw new Error('slug_conflict')

      // Fiche vendeur (badge de vérification), créée ou mise à jour.
      await supabase
        .from('seller_profiles')
        .upsert({ user_id: user.id, business_name: name }, { onConflict: 'user_id' })

      router.push('/seller/subscription?onboarding=1')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError("Impossible de créer la boutique. Vérifiez les informations et réessayez.")
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  return (
    <div className="store-setup-page">
      <div className="store-setup-card">
        <h1>Créez votre boutique</h1>
        <p>Ces informations seront visibles par vos clients sur votre page boutique.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Nom de la boutique
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Chez Adjoa"
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ce que vous vendez, ce qui vous distingue..."
            />
          </label>

          <div className="field-row">
            <label>
              Téléphone
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+229 ..."
              />
            </label>
            <label>
              WhatsApp
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+229 ..."
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Ville
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cotonou, Porto-Novo..."
              />
            </label>
            <label>
              Adresse
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Logo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Image de couverture
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Facebook (optionnel)
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </label>
            <label>
              Instagram (optionnel)
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Création…' : 'Créer ma boutique'}
          </button>
        </form>
      </div>
    </div>
  )
}
