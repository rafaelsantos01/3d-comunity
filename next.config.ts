import type { NextConfig } from "next";

// O build do OpenSCAD usado é single-thread: não exige COOP/COEP (ver docs/PLANO.md).
const imutavel = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/openscad/:path*", headers: imutavel },
      { source: "/fontes/:path*", headers: imutavel },
    ];
  },
};

export default nextConfig;
