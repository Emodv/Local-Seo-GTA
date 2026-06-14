

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), "bufferutil", "utf-8-validate"];
    return config;
  },
};

export default nextConfig;
