import type { APIRoute } from 'astro';

const REPO_OWNER = 'dearresultlive';
const REPO_NAME = 'keralalive3pm';
const FILE_PATH = 'src/data/kerala_draws.json';
const DEFAULT_PIN = '9046'; // Primary editorial security PIN (9046 or 3000 accepted)

function base64ToUtf8(base64: string): string {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      pin,
      date,
      scheme_id = 'kerala-lottery',
      draw_number,
      draw_name,
      draw_name_ml,
      series,
      number,
      amount = 10000000,
      second_series,
      second_number,
      second_prize,
      third_prize,
      fourth_prize,
      fifth_prize,
      stage = 'STAGE_1_FIRST_PRIZE',
      source = 'admin',
      github_token
    } = body;

    // Verify PIN / Authentication
    const env = ((globalThis as any).process?.env || import.meta.env || {}) as Record<string, string | undefined>;
    const validPin = env.ADMIN_PIN || DEFAULT_PIN;
    if (!pin || (String(pin) !== String(validPin) && String(pin) !== '9046' && String(pin) !== '3000')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!date || !number) {
      return new Response(JSON.stringify({ error: 'Date and ticket number are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanSeries = (series || '').trim().toUpperCase();
    const cleanNumber = String(number).trim().padStart(6, '0');

    // Token resolution: check request body first, then server environment
    const token = github_token || env.GITHUB_TOKEN || env.GH_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({
        error: 'GitHub Personal Access Token is required to commit to repository. Please provide it in the input field or set GITHUB_TOKEN environment variable.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch current file from GitHub API
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'KeralaLive3PM-Admin'
      }
    });

    if (!getRes.ok) {
      const errText = await getRes.text();
      return new Response(JSON.stringify({ error: `GitHub API error fetching file: ${getRes.status} ${errText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileData = (await getRes.json()) as { sha: string; content: string };
    const currentSha = fileData.sha;
    const currentContentStr = base64ToUtf8(fileData.content);
    const db = JSON.parse(currentContentStr) as Record<string, any>;

    // Safety: If incoming source is auto-poller, prevent stale repeats of previous draw's 1st prize
    const previousDrawDate = Object.keys(db).find(k => k !== date);
    const previousDraw = previousDrawDate ? db[previousDrawDate] : null;
    if (
      source === 'google_apps_script' &&
      previousDraw?.first_prize?.number === cleanNumber &&
      previousDraw?.first_prize?.series === cleanSeries
    ) {
      return new Response(JSON.stringify({
        error: `Stale result detected: ${cleanSeries} ${cleanNumber} is identical to previous draw (${previousDrawDate}). Skipped.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Prepare or update draw entry
    const existing = db[date] || {};

    // Don't overwrite if official signed PDF is already locked unless forced
    if (existing.status === 'DECLARED' && source !== 'admin_force') {
      return new Response(JSON.stringify({
        warning: 'This draw is already finalized with official government signed PDF.',
        draw: existing
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedEntry = {
      ...existing,
      scheme_id: scheme_id || existing.scheme_id || 'kerala-lottery',
      draw_number: draw_number || existing.draw_number || '3PM-LIVE',
      draw_name: draw_name || existing.draw_name || 'KERALA LOTTERY',
      draw_name_ml: draw_name_ml || existing.draw_name_ml || 'കേരള ലോട്ടറി',
      draw_date: date,
      draw_time: '3:00 PM',
      status: source === 'admin' ? 'ADMIN_OVERRIDE' : 'LIVE_PRELIMINARY',
      source: source,
      updated_at: new Date().toISOString(),
      first_prize: {
        series: cleanSeries,
        number: cleanNumber,
        amount: Number(amount) || 10000000
      },
      consolation_prize: existing.consolation_prize || {
        number: cleanNumber,
        amount: 5000
      }
    };

    if (second_prize && Array.isArray(second_prize) && second_prize.length > 0) {
      updatedEntry.second_prize = second_prize;
    } else if (second_number) {
      updatedEntry.second_prize = [
        {
          series: (second_series || '').trim().toUpperCase(),
          number: String(second_number).trim().padStart(6, '0'),
          amount: 3000000
        }
      ];
    } else if (existing.second_prize) {
      updatedEntry.second_prize = existing.second_prize;
    }

    if (third_prize && Array.isArray(third_prize) && third_prize.length > 0) {
      updatedEntry.third_prize = third_prize;
    } else if (existing.third_prize) {
      updatedEntry.third_prize = existing.third_prize;
    }

    if (fourth_prize && Array.isArray(fourth_prize) && fourth_prize.length > 0) {
      updatedEntry.fourth_prize = fourth_prize;
    } else if (existing.fourth_prize) {
      updatedEntry.fourth_prize = existing.fourth_prize;
    }

    if (fifth_prize && Array.isArray(fifth_prize) && fifth_prize.length > 0) {
      updatedEntry.fifth_prize = fifth_prize;
    } else if (existing.fifth_prize) {
      updatedEntry.fifth_prize = existing.fifth_prize;
    }
    if (existing.sixth_prize) updatedEntry.sixth_prize = existing.sixth_prize;
    if (existing.seventh_prize) updatedEntry.seventh_prize = existing.seventh_prize;
    if (existing.eighth_prize) updatedEntry.eighth_prize = existing.eighth_prize;
    if (existing.official_pdf_url) updatedEntry.official_pdf_url = existing.official_pdf_url;

    // Put updated entry at the top of the map
    const newDb: Record<string, any> = { [date]: updatedEntry };
    for (const [k, v] of Object.entries(db)) {
      if (k !== date) newDb[k] = v;
    }

    // 3. Commit back to GitHub
    const newContentBase64 = utf8ToBase64(JSON.stringify(newDb, null, 2));
    const commitMsg = source === 'admin'
      ? `feat(live): admin override 1st prize ${cleanSeries} ${cleanNumber} for ${date}`
      : stage === 'STAGE_2_FULL_RESULTS'
        ? `feat(live): auto-scrape full 1st to 5th prize tiers for ${date} (${draw_number || cleanSeries})`
        : `feat(live): auto-scrape 1st prize ${cleanSeries} ${cleanNumber} for ${date}`;

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'KeralaLive3PM-Admin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMsg,
        content: newContentBase64,
        sha: currentSha,
        branch: 'main'
      })
    });

    if (!putRes.ok) {
      const putErr = await putRes.text();
      return new Response(JSON.stringify({ error: `Failed to commit to GitHub: ${putErr}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const putResult = (await putRes.json()) as { commit?: { sha?: string } };

    // 4. Ping IndexNow for instant search engine re-crawl
    try {
      fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: 'keralalive3pm.com',
          key: 'kerala3pmliveindexnowkey',
          keyLocation: 'https://keralalive3pm.com/kerala3pmliveindexnowkey.txt',
          urlList: [
            'https://keralalive3pm.com/',
            'https://keralalive3pm.com/yesterday',
            'https://keralalive3pm.com/sitemap.xml',
            'https://keralalive3pm.com/rss.xml'
          ]
        })
      }).catch(() => {});
    } catch (_) {}

    // 5. Auto-Broadcast to Telegram Channel (if configured)
    let telegramSent = false;
    const tgToken = body.telegram_bot_token || env.TELEGRAM_BOT_TOKEN;
    const tgChatId = body.telegram_chat_id || env.TELEGRAM_CHAT_ID || '@keralallive3pm';

    if (tgToken && tgChatId && stage !== 'STAGE_2_FULL_RESULTS') {
      try {
        const formattedAmount = (Number(amount) >= 10000000)
          ? `₹${(Number(amount) / 10000000).toFixed(0)} Crore`
          : `₹${(Number(amount) / 100000).toFixed(0)} Lakh`;

        const tgText = `🎯 <b>KERALA STATE LOTTERY RESULT (3:00 PM)</b>\n` +
          `📅 Date: <b>${date.split('-').reverse().join('/')}</b> • 3:00 PM IST\n` +
          `🏆 Draw: <b>${updatedEntry.draw_name} (${updatedEntry.draw_number})</b>\n\n` +
          `🥇 <b>1ST PRIZE (${formattedAmount}):</b>\n` +
          `👉 <code>${cleanSeries} ${cleanNumber}</code>\n\n` +
          (updatedEntry.second_prize?.[0] ? `🥈 <b>2ND PRIZE:</b>\n👉 <code>${updatedEntry.second_prize[0].series ? updatedEntry.second_prize[0].series + ' ' : ''}${updatedEntry.second_prize[0].number}</code>\n\n` : '') +
          `🎁 <b>CONSOLATION:</b> <code>${cleanNumber}</code> (All other series)\n\n` +
          `⚡ <b>Check all prizes & instant ticket checker:</b>\n` +
          `https://keralalive3pm.com/`;

        const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text: tgText,
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        });

        if (tgRes.ok) {
          telegramSent = true;
        }
      } catch (tgError) {
        console.error('Telegram broadcast failed:', tgError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully published 1st Prize: ${cleanSeries} ${cleanNumber} for ${date}`,
      commit_sha: putResult.commit?.sha,
      telegram_sent: telegramSent,
      draw: updatedEntry
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
