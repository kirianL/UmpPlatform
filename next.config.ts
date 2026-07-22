import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.50.203", "localhost:3000"],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
