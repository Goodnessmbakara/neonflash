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
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Handle bigint serialization issues
    config.externals = [...(config.externals || []), 'bigint'];
    
    // Optimize chunk splitting for Solana SDKs
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          solana: {
            test: /[\\/]node_modules[\\/](@solana|@orca-so|@coral-xyz)[\\/]/,
            name: 'solana',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };
    
    return config;
  },
  
  // Disable static optimization for pages that use Solana SDKs
  experimental: {
    serverComponentsExternalPackages: [
      '@solana/web3.js', 
      '@orca-so/whirlpools-sdk', 
      '@orca-so/common-sdk',
      '@coral-xyz/anchor',
      '@solana/spl-token',
      'decimal.js'
    ],
  },
  
  // Handle environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
