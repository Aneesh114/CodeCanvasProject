/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
      domains: ['localhost'],
    },
    async headers() {
      return [
        {
          // matching all API routes
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" }
          ]
        }
      ]
    },
    webpack: (config) => {
      config.externals = [...config.externals, { canvas: "canvas" }];  // required for yjs
      return config;
    },
  };
  
  export default nextConfig;