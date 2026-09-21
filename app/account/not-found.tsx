export default function NotFound() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '10px' }}>404</h1>
      <h2>Page introuvable</h2>
      <p>Désolé, la page que vous cherchez n'existe pas.</p>
      <a href="/" style={{ color: '#1B2A4A', marginTop: '20px', display: 'inline-block' }}>
        Retour à l'accueil
      </a>
    </div>
  )
}