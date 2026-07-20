import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin requests to the dev server by default (HMR /
  // asset protection). The ngrok tunnel presents a Host header the dev server
  // doesn't recognize as itself, so it must be allow-listed explicitly.
  allowedDevOrigins: ["nightcap.ngrok.app", "*.ngrok.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "staticmap.openstreetmap.de" },
    ],
  },
};

export default nextConfig;
