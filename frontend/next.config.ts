import type { NextConfig } from "next";

// Backend (дар сервер). Браузер ба он мустақим ё тавассути "/backend/..." (як суроға бо сайт) муроҷиат мекунад.
const API_URL = process.env.API_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  // Решаи лоиҳа — ҳамин папка (дар C:\Users\HP package-lock.json-и бегона ҳаст).
  turbopack: {
    root: __dirname,
  },
  // "/backend/api/..." ва "/backend/uploads/..." → backend. Бо NEXT_PUBLIC_API_URL=/backend сайт аз як
  // суроға кор мекунад (телефон, пайванди муваққатӣ, production) — "localhost:5080" дар браузер лозим нест.
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
