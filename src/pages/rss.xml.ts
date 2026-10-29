import type { APIRoute } from 'astro';
import keralaDraws from '../data/kerala_draws.json';

export const GET: APIRoute = async () => {
  const draws = Object.values(keralaDraws).slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Kerala Lottery Result 3 PM Live</title>
  <link>https://keralalive3pm.com</link>
  <description>Live updates and winning numbers for daily Kerala State Lottery 3:00 PM draws.</description>
  <language>en-in</language>
  <atom:link href="https://keralalive3pm.com/rss.xml" rel="self" type="application/rss+xml" />
  ${draws
    .map((draw) => {
      const ticket = draw.first_prize
        ? `${draw.first_prize.series} ${draw.first_prize.number}`
        : 'Result Declared';
      const amount = draw.first_prize?.amount ? `₹${(draw.first_prize.amount / 100000).toFixed(0)} Lakhs` : '₹75 Lakhs';
      const pubDate = draw.draw_date
        ? new Date(`${draw.draw_date}T15:00:00+05:30`).toUTCString()
        : new Date().toUTCString();

      return `
  <item>
    <title>Kerala Lottery Result ${draw.draw_number} (${draw.draw_name}) - 1st Prize ${ticket}</title>
    <link>https://keralalive3pm.com</link>
    <guid>https://keralalive3pm.com/#${draw.draw_number}</guid>
    <pubDate>${pubDate}</pubDate>
    <description><![CDATA[Official Kerala State Lottery result for ${draw.draw_name} (${draw.draw_number}) drawn on ${draw.draw_date}. 1st Prize ${amount} won by ${ticket}. Check 1st to 8th prizes and download official gazette on keralalive3pm.com.]]></description>
  </item>`;
    })
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
