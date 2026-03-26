import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only allow cross-origin HMR from local network during development
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: ["192.168.1.77"],
  }),

  images: {
    remotePatterns: [
      {
        // Supabase Storage — thumbnails, course images, audio covers
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Silence the x-powered-by header in production
  poweredByHeader: false,
};

export default nextConfig;
