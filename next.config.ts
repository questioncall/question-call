import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ['http://[IP_ADDRESS]', 'http://[IP_ADDRESS]', 'http://192.168.1.69'],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.questioncall.com" }],
        destination: "https://questioncall.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;