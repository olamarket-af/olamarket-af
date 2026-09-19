import type { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/Header'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import InstallPrompt from '@/components/InstallPrompt'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: "O'LA Market — Vendez en ligne. Achetez simplement.",
    template: "%s | O'LA Market",
  },
  description:
    "Marketplace béninoise sans commission sur les ventes. Créez votre boutique ou trouvez le produit qu'il vous faut.",
  themeColor: '#1B2A4A',
  openGraph: {
    siteName: "O'LA Market",
    locale: 'fr_BJ',
    type: 'website',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: "O'LA Market",
  slogan: 'Vendez en ligne. Achetez simplement.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/logo-icon.png`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        {children}
        <footer className="site-footer">
          <Image src="/logo-icon.png" alt="" width={20} height={20} style={{ borderRadius: '50%', display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
          © {new Date().getFullYear()} O'LA Market — Votre marché en ligne, à portée de main.
        </footer>
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
