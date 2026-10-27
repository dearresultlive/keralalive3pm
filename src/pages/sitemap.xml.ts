import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  const pages = [
    { url: 'https://keralalive3pm.in/', priority: '1.0', changefreq: 'always', lastmod: today },
    { url: 'https://keralalive3pm.in/yesterday', priority: '0.9', changefreq: 'daily', lastmod: today },
    { url: 'https://keralalive3pm.in/checker', priority: '0.8', changefreq: 'weekly', lastmod: today },
    { url: 'https://keralalive3pm.in/chart', priority: '0.8', changefreq: 'daily', lastmod: today },
    { url: 'https://keralalive3pm.in/disclaimer', priority: '0.3', changefreq: 'monthly', lastmod: '2026-10-01' },
    { url: 'https://keralalive3pm.in/privacy', priority: '0.3', changefreq: 'monthly', lastmod: '2026-10-01' },
    { url: 'https://keralalive3pm.in/terms', priority: '0.3', changefreq: 'monthly', lastmod: '2026-10-01' },
    { url: 'https://keralalive3pm.in/contact', priority: '0.3', changefreq: 'monthly', lastmod: '2026-10-01' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
