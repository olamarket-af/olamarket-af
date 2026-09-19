// Transforme un nom de boutique en slug utilisable dans l'URL
// (/market/store/[slug]). Ex: "Chez Adjoa & Fils" -> "chez-adjoa-fils".
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Ajoute un court suffixe aléatoire pour désambiguïser un slug déjà pris.
export function withRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${slug}-${suffix}`
}
