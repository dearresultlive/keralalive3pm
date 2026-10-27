import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const robots = `User-agent: *
Allow: /

Sitemap: https://keralalive3pm.in/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
