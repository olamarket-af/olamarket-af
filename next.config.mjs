/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // AJOUTEZ CES LIGNES ICI, À L'INTÉRIEUR DE L'OBJET :
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fin de l'ajout
};

export default nextConfig;