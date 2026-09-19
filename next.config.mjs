/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Autorise l'affichage des images stockées dans Supabase Storage.
    // Remplacer YOUR-PROJECT par la référence de votre projet Supabase,
    // ou passer par une configuration remotePatterns plus précise en prod.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default nextConfig
