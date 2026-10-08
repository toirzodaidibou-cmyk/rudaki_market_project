import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Решаи лоиҳа — ҳамин папка (дар C:\Users\HP package-lock.json-и бегона ҳаст).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
