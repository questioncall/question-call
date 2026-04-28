import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com", // ← plain string, no markdown
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ['http://[IP_ADDRESS]', 'http://[IP_ADDRESS]', 'http://192.168.1.69'],
};

export default nextConfig;