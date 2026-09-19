import Link from 'next/link'

const LINKS = [
  { href: '/admin', label: 'Vue d’ensemble' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/sellers', label: 'Vendeurs' },
  { href: '/admin/products', label: 'Produits' },
  { href: '/admin/orders', label: 'Commandes' },
  { href: '/admin/payments', label: 'Paiements' },
  { href: '/admin/categories', label: 'Catégories' },
  { href: '/admin/subscriptions', label: 'Abonnements & pub' },
  { href: '/admin/advertisements', label: 'Publicités' },
  { href: '/admin/reports', label: 'Signalements' },
  { href: '/admin/settings', label: 'Paramètres' },
]

export default function AdminNav({ active }: { active: string }) {
  return (
    <nav className="admin-nav">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={active === link.href ? 'active' : ''}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
