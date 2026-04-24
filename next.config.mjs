/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_API_URL ?? "").trim().replace(/\/$/, "");
const explicitSocket = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "").trim().replace(/\/$/, "");
const socketUrl = explicitSocket || backendUrl;

const nextConfig = {
  reactStrictMode: true,
  /** Static HTML/JS for CDNs (e.g. Render Static Site). Requires `NEXT_PUBLIC_API_URL` at build time. */
  output: "export",
  /**
   * Browser Socket.IO uses NEXT_PUBLIC_SOCKET_URL. If unset, reuse BACKEND_API_URL
   * so inbox + ticket sockets work when only the API URL is configured in .env.local.
   */
  env: {
    NEXT_PUBLIC_SOCKET_URL: socketUrl,
  },
};

export default nextConfig;
