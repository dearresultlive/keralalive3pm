import type { APIRoute } from 'astro';
import keralaDraws from '../../data/kerala_draws.json';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(keralaDraws), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const HEAD: APIRoute = GET;
