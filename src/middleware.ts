import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const pathname = context.url.pathname;

  // Protect admin & API endpoints from indexing while allowing main portal indexing
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // Baseline Security & Performance Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 1. Static Assets (Immutable hashed files)
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  }

  // 2. High-traffic Live Result Pages: 30s Cloudflare Edge Cache, 15s Browser Cache
  // Offloads 99%+ requests to Cloudflare edge nodes during 3:00 PM peak rush
  if (
    pathname === '/' ||
    pathname === '/yesterday' ||
    pathname === '/checker' ||
    pathname === '/chart'
  ) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=15, s-maxage=30, stale-while-revalidate=60'
    );
  }
  // 3. Live Poll / API Endpoint
  else if (pathname.startsWith('/api/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=10, s-maxage=15, stale-while-revalidate=30'
    );
  }
  // 4. Feeds and Sitemaps
  else if (pathname === '/rss.xml') {
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, s-maxage=120, stale-while-revalidate=300'
    );
  } else if (pathname === '/sitemap.xml') {
    response.headers.set(
      'Cache-Control',
      'no-cache, no-store, must-revalidate'
    );
  } else if (pathname === '/robots.txt') {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  // 5. Static Content / Legal Pages (Privacy, Terms, Disclaimer, Contact)
  else if (
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/disclaimer' ||
    pathname === '/contact'
  ) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600'
    );
  }

  return response;
});
