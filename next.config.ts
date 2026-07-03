import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Landing image uploads go through a server action; the default 1MB body
    // limit would reject any photo. Set just above the 5MB file cap so
    // multipart overhead (boundaries/headers) fits, and larger bodies are
    // rejected before buffering. (Next 16: serverActions lives under experimental.)
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
