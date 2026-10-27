import type { APIRoute } from 'astro';
import keralaDraws from '../data/kerala_draws.json';

export const GET: APIRoute = async () => {
  const draws = Object.values(keralaDraws).slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Kerala Lottery Result 3 PM Live</title>
  <link>https://keralalive3pm.in</link>
  <description>Live updates and winning numbers for daily Kerala State Lottery 3:00 PM draws.</description>
  <language>en-in</language>
  <atom:link href="https://keralalive3pm.in/rss.xml" rel="self" type="application/rss+xml" />
  ${draws
    .map(
      (draw) => `
  <item>
    <title>Kerala Lottery Result ${draw.drawNumber} (${draw.schemeName}) - 1st Prize ${draw.prizes.first.ticket}</title>
    <link>https://keralalive3pm.in</link>
    <guid>https://keralalive3pm.in/#${draw.id}</guid>
    <pubDate>${new Date(draw.timestamp).toUTCString()}</pubDate>
    <description><![CDATA[Official Kerala State Lottery result for ${draw.schemeName} (${draw.drawNumber}) drawn on ${draw.date}. 1st Prize ₹${draw.prizes.first.amount} won by ${draw.prizes.first.ticket}. Check 1st to 8th prizes on keralalive3pm.in.]]></description>
  </item>`
    )
    .join('')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};
