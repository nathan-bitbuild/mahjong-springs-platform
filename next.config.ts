import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/shop", destination: "/", statusCode: 301 },
      { source: "/shop/", destination: "/", statusCode: 301 },
      { source: "/cart", destination: "/leagues/", statusCode: 301 },
      { source: "/cart/", destination: "/leagues/", statusCode: 301 },
      { source: "/checkout", destination: "/leagues/", statusCode: 301 },
      { source: "/checkout/", destination: "/leagues/", statusCode: 301 },
      { source: "/my-account", destination: "/account/", statusCode: 301 },
      { source: "/my-account/", destination: "/account/", statusCode: 301 },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.stripe.com https://www.googletagmanager.com",
      "frame-src https://js.stripe.com https://*.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
      "img-src 'self' data: blob: https://*.stripe.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
