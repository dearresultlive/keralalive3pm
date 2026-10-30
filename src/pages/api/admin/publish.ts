import type { APIRoute } from 'astro';

const REPO_OWNER = 'dearresultlive';
const REPO_NAME = 'keralalive3pm';
const FILE_PATH = 'src/data/kerala_draws.json';
const DEFAULT_PIN = '3000'; // Default editorial security PIN

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
      source = 'admin',
      github_token
    } = body;

    // Verify PIN / Authentication
    const env = ((globalThis as any).process?.env || import.meta.env || {}) as Record<string, string | undefined>;
    const validPin = env.ADMIN_PIN || DEFAULT_PIN;
    if (!pin || String(pin) !== String(validPin)) {
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

    if (second_number) {
      updatedEntry.second_prize = [
        {
          series: (second_series || '').trim().toUpperCase(),
          number: String(second_number).trim().padStart(6, '0'),
          amount: 3000000
        }
      ];
    }

    // Preserve existing lower prize tiers if they were already parsed
    if (existing.third_prize) updatedEntry.third_prize = existing.third_prize;
    if (existing.fourth_prize) updatedEntry.fourth_prize = existing.fourth_prize;
    if (existing.fifth_prize) updatedEntry.fifth_prize = existing.fifth_prize;
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
      ? `feat(live): admin override 1st prize ${cleanSeries} ${cleanNumber} for ${date} [skip ci]`
      : `feat(live): auto-scrape 1st prize ${cleanSeries} ${cleanNumber} for ${date} [skip ci]`;

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

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully published 1st Prize: ${cleanSeries} ${cleanNumber} for ${date}`,
      commit_sha: putResult.commit?.sha,
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
