import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /* config options here */

  experimental: {
    // Next caps Server Action request bodies at 1 MB by default, but the image
    // validation (lib/admin/image-sniff.ts `MAX_UPLOAD_BYTES`) accepts up to
    // 5 MB. Without this, anything in the 1-5 MB range died at the framework
    // level with an opaque error instead of reaching the "tooLarge" message —
    // i.e. the documented 5 MB limit was never actually reachable.
    //
    // 6 MB, not 5 MB: the limit applies to the RAW request body, which includes
    // the multipart boundaries and part headers (the bundled Next docs suggest
    // leaving 10-20 KB of room for a typical upload). A ceiling of exactly 5 MB
    // would therefore reject a legal 5 MB file before validation could describe
    // the problem.
    //
    // This does NOT raise the accepted image size — `MAX_UPLOAD_BYTES` still
    // rejects anything above 5 MB, and the error message is unchanged. Large
    // video uploads are handled by a later pass using direct-to-Blob uploads.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  images: {
    // The dev server's image optimizer fetches remote images server-side and
    // times out in this environment (504 on /_next/image), while the browser
    // can reach the hosts fine. Keep dev unoptimized so the browser loads
    // remotes directly; production builds serve optimized AVIF/WebP.
    unoptimized: process.env.NODE_ENV !== "production",
    formats: ["image/avif", "image/webp"],
    // Fewer width variants = less optimizer work for remote sources.
    deviceSizes: [640, 750, 1080, 1920],
    remotePatterns: [
      {
        // Admin uploads (lib/admin/actions/upload.ts) land on Vercel Blob, so
        // the public pages render `*.public.blob.vercel-storage.com` URLs. In
        // production the optimizer REJECTS a host that is not listed here
        // (dev is `unoptimized`, so the gap would only show up after deploy).
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
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
