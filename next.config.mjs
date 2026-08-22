/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_API_URL ?? "").trim().replace(/\/$/, "");
const explicitApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
const apiUrl = explicitApiUrl || backendUrl;
const explicitSocket = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "").trim().replace(/\/$/, "");
const socketUrl = explicitSocket || backendUrl;

const nextConfig = {
  reactStrictMode: true,
  /** Static HTML/JS for CDNs (e.g. Render Static Site). Requires `NEXT_PUBLIC_API_URL` at build time. */
  output: "export",
  transpilePackages: ["pdfjs-dist"],
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mokanco.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  /**
   * Browser `fetch("/api/...")` uses NEXT_PUBLIC_API_URL via `resolveApiUrl`. If unset,
   * reuse BACKEND_API_URL so login and API calls work when only the backend origin is in .env.local.
   * Socket.IO: NEXT_PUBLIC_SOCKET_URL, else BACKEND_API_URL.
   */
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
  },
  /** Legacy approval emails used `/onboarding/track/:token`; static export uses `?token=`. */
  async redirects() {
    return [
      {
        source: "/onboarding/track/:token",
        destination: "/onboarding/track?token=:token",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
