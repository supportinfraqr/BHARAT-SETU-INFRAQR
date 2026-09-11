import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  webpack: (config) => {
    // The synced node_modules on this workstation lacks optional transitive
    // deps of jspdf (canvg's svg-pathdata/stackblur-canvas, fast-png). They are
    // only used by jspdf's SVG/PNG codecs which the app never calls, so stub
    // them as empty modules. fflate exists and is aliased explicitly.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fflate: require('path').join(__dirname, 'node_modules/fflate/lib/browser.cjs'), // eslint-disable-line @typescript-eslint/no-require-imports -- next.config.ts is a CommonJS module
      'fast-png': false,
      'svg-pathdata': false,
      'stackblur-canvas': false,
    };
    return config;
  },
  experimental: {
    // The compiler API is deterministic in restricted/container build
    // environments where the CLI's detached child process is unavailable.
    useTypeScriptCli: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bharatshramsetu.com',
      },
      {
        protocol: 'https',
        hostname: 'login.bharatshramsetu.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  async headers() {
    return [{
      source:'/:path*',
      headers:[
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
        {key:'Permissions-Policy',value:'camera=(self), microphone=(self), geolocation=()'},
        {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
        {key:'Cross-Origin-Resource-Policy',value:'same-origin'},
        {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'},
      ],
    }];
  },
};

export default nextConfig;
