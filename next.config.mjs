/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle Solana SDK build issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle bigint serialization issues
    config.externals = [...(config.externals || []), 'bigint'];
    
    return config;
  },
  
  // Disable static optimization for pages that use Solana SDKs
  experimental: {
    serverComponentsExternalPackages: ['@solana/web3.js', '@orca-so/whirlpools-sdk'],
  },
  
  // Handle environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
