import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  onDemandEntries: {
    // période de temps en ms pendant laquelle la page sera gardée en mémoire
    maxInactiveAge: 60 * 60 * 1000,
    // nombre de pages à garder en mémoire
    pagesBufferLength: 5,
  },
  experimental: {
    // optimisations pour le chargement des chunks
    optimizePackageImports: ['react', 'react-dom', 'lucide-react'],
    webpackBuildWorker: true,
  },
};

export default nextConfig;
