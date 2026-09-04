import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* config options here */

  images: {
    // The dev-server's image optimizer fetches remote images server-side and
    // times out in this environment (504 on /_next/image), while the browser
    // can reach the hosts fine. Serve remote images unoptimized so the
    // browser loads them directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.henge07.com",
      },
      {
        protocol: "https",
        hostname: "dummyimage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
        port: "",
        pathname: "/**",
      },
    ],
    // qualities: [75],
  },
};

export default nextConfig;
