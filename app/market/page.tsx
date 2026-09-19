import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from './ProductCard'

const PAGE_SIZE = 24

type SearchParams = {
  q?: string
  category?: string
  city?: string
  min?: string
  max?: string
  page?: string
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  if (params.category) {
    const supabase = await createClient()
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('slug', params.category)
      .maybeSingle()
    if (category) {
      return {
        title: category.name,
        description: `Trouvez ${category.name.toLowerCase()} sur O'LA Market, la marketplace béninoise sans commission.`,
      }
    }
  }
  return {
    title: 'Marché',
    description: "Parcourez tous les produits disponibles sur O'LA Market.",
  }
}

// Route publique /market — pas d'authentification requise, RLS autorise la
// lecture des produits/catégories/boutiques "active" pour tout le monde.
export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('position')

  let activeCategory: { id: string; name: string; slug: string } | undefined
  if (params.category) {
    activeCategory = categories?.find((c) => c.slug === params.category)
  }

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select(
      'id, name, slug, price, old_price, image_url, city, featured, store:stores(name, slug)',
      { count: 'exact' }
    )
    .eq('status', 'active')

  if (activeCategory) query = query.eq('category_id', activeCategory.id)
  if (params.city) query = query.ilike('city', `%${params.city}%`)
  if (params.min) query = query.gte('price', Number(params.min))
  if (params.max) query = query.lte('price', Number(params.max))
  if (params.q) query = query.ilike('name', `%${params.q}%`)

  const { data: products, count } = await query
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  function buildPageLink(targetPage: number) {
    const usp = new URLSearchParams()
    if (params.q) usp.set('q', params.q)
    if (params.category) usp.set('category', params.category)
    if (params.city) usp.set('city', params.city)
    if (params.min) usp.set('min', params.min)
    if (params.max) usp.set('max', params.max)
    usp.set('page', String(targetPage))
    return `/market?${usp.toString()}`
  }

  return (
    <div className="market-page">
      <div className="market-wrap">
        <aside className="market-filters">
          <form action="/market" method="get" className="filter-form">
            <label>
              Rechercher
              <input type="text" name="q" defaultValue={params.q} placeholder="Nom du produit" />
            </label>

            <label>
              Ville
              <input type="text" name="city" defaultValue={params.city} placeholder="Cotonou..." />
            </label>

            <div className="field-row">
              <label>
                Prix min
                <input type="number" name="min" defaultValue={params.min} min={0} />
              </label>
              <label>
                Prix max
                <input type="number" name="max" defaultValue={params.max} min={0} />
              </label>
            </div>

            {params.category && <input type="hidden" name="category" value={params.category} />}

            <button type="submit" className="btn-primary">Filtrer</button>
          </form>

          <div className="category-list">
            <p className="category-list-title">Catégories</p>
            <Link href="/market" className={!activeCategory ? 'active' : ''}>
              Toutes
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                href={`/market?category=${cat.slug}`}
                className={activeCategory?.id === cat.id ? 'active' : ''}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </aside>

        <main className="market-results">
          <div className="market-results-header">
            <h1>{activeCategory ? activeCategory.name : 'Tous les produits'}</h1>
            <span>{count ?? 0} produit{(count ?? 0) > 1 ? 's' : ''}</span>
          </div>

          {products && products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                // @ts-expect-error -- store est retourné comme objet unique par la relation
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="market-empty">Aucun produit ne correspond à votre recherche.</p>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {page > 1 && <Link href={buildPageLink(page - 1)}>Précédent</Link>}
              <span>Page {page} / {totalPages}</span>
              {page < totalPages && <Link href={buildPageLink(page + 1)}>Suivant</Link>}
            </nav>
          )}
        </main>
      </div>
    </div>
  )
}
