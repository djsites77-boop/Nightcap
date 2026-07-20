import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin requests to the dev server by default (HMR/
  // asset protection). The ngrok tunnel (nightcap.ngrok.app) presents a Host
  // header the dev server doesn't recognize as itself, so it has to be
  // allow-listed explicitly or every asset/RSC request 403s.
  allowedDevOrigins: ["nightcap.ngrok.app"],
};

export default nextConfig;
