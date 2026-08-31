import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* config options here */

  output: "standalone",
  images: {
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
    ],
    // qualities: [75],
  },
};

export default nextConfig;
