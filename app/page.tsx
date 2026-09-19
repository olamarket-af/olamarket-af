import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <div className="home-wrap hero">
        <div>
          <Image src="/logo-icon.png" alt="O'LA Market" width={72} height={72} className="home-hero-logo" priority />
          <h1>Vendez en ligne. Achetez simplement.</h1>
          <p className="lead">
            O'LA Market rassemble vendeurs et acheteurs du Bénin sur un même marché numérique
            — sans commission sur vos ventes.
          </p>
          <div className="hero-ctas">
            <Link className="btn-primary" href="/register">Ouvrir ma boutique</Link>
            <Link className="btn-ghost" href="/market">Découvrir les produits</Link>
          </div>
          <p className="hero-note">0 % de commission sur les ventes — les vendeurs gardent leurs revenus.</p>
        </div>
        <div className="stall-grid" aria-hidden="true">
          <div className="stall stall-1"><span>Téléphones · Électronique</span>Trouvez le bon produit</div>
          <div className="stall stall-2"><span>Vendeurs</span>Votre boutique</div>
          <div className="stall stall-3"><span>Livraison</span>Suivi de commande</div>
        </div>
      </div>

      <div className="awning" />

      <section className="home-wrap home-section">
        <div className="home-split">
          <div>
            <div className="home-eyebrow"><span className="num">01</span><h2>Pour les acheteurs</h2></div>
            <p>Un marché en ligne pensé pour trouver vite, comparer facilement et commander en confiance.</p>
          </div>
          <ul className="home-feature-list">
            <li><span className="home-dot" />Recherchez par catégorie, ville ou prix</li>
            <li><span className="home-dot" />Consultez les boutiques et leurs avis</li>
            <li><span className="home-dot" />Ajoutez vos favoris et suivez leur disponibilité</li>
            <li><span className="home-dot" />Commandez auprès de plusieurs vendeurs à la fois</li>
          </ul>
        </div>
      </section>

      <section className="home-wrap home-section">
        <div className="home-split">
          <ul className="home-feature-list">
            <li><span className="home-dot green" />Créez votre boutique en quelques minutes</li>
            <li><span className="home-dot green" />Publiez vos produits avec photos et stock</li>
            <li><span className="home-dot green" />Recevez et gérez vos commandes</li>
            <li><span className="home-dot green" />Suivez vos ventes et vos statistiques</li>
          </ul>
          <div>
            <div className="home-eyebrow"><span className="num">02</span><h2>Pour les vendeurs</h2></div>
            <p>Une présence en ligne professionnelle, sans jamais céder un pourcentage de vos ventes.</p>
          </div>
        </div>
      </section>

      <section className="home-wrap home-section">
        <div className="home-commission">
          <div className="big">0 %</div>
          <p>
            de commission prélevée sur vos ventes. O'LA Market se finance par les abonnements
            vendeurs et la publicité — pas sur votre chiffre d'affaires.
          </p>
        </div>
      </section>

      <section className="home-wrap home-section">
        <div className="home-eyebrow"><span className="num">03</span><h2>Abonnements vendeurs</h2></div>
        <div className="home-plans" style={{ marginTop: 28 }}>
          <div className="home-plan">
            <h3>Basic</h3>
            <div className="price">2 000 FCFA <sub>/ mois</sub></div>
            <ul>
              <li>Jusqu'à 20 produits</li>
              <li>Photos produits</li>
              <li>Statistiques simples</li>
            </ul>
            <Link className="btn-ghost" href="/register">Choisir Basic</Link>
          </div>
          <div className="home-plan featured">
            <h3>Standard</h3>
            <div className="price">5 000 FCFA <sub>/ mois</sub></div>
            <ul>
              <li>Jusqu'à 100 produits</li>
              <li>Produits mis en avant</li>
              <li>Statistiques avancées</li>
            </ul>
            <Link className="btn-primary" href="/register">Choisir Standard</Link>
          </div>
          <div className="home-plan">
            <h3>Premium</h3>
            <div className="price">10 000 FCFA <sub>/ mois</sub></div>
            <ul>
              <li>Produits illimités</li>
              <li>Visibilité prioritaire</li>
              <li>Badge vendeur premium</li>
            </ul>
            <Link className="btn-ghost" href="/register">Choisir Premium</Link>
          </div>
        </div>
      </section>

      <section className="home-wrap home-section">
        <div className="home-pwa">
          <div className="home-pwa-icon">📲</div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
              Installez O'LA Market sur votre téléphone
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              Depuis Chrome sur Android, ajoutez O'LA Market à votre écran d'accueil.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
