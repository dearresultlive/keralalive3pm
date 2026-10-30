/**
 * kerala_autopoller.cjs
 * Automated poller and parser for Kerala State Lottery 3:00 PM official results.
 * Fetches official draw gazette PDFs directly from statelottery.kerala.gov.in,
 * parses prize tiers (1st to 8th + consolation), and updates src/data/kerala_draws.json.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const DATA_FILE = path.join(__dirname, '..', 'src', 'data', 'kerala_draws.json');

// Insecure TLS agent to handle government server's expired SSL certificate
const agent = new https.Agent({ rejectUnauthorized: false });

const SCHEME_MAP = {
  'WIN-WIN': { id: 'win-win', name: 'WIN-WIN', nameMl: 'വിൻ-വിൻ', code: 'W' },
  'STHREE-SAKTHI': { id: 'sthree-sakthi', name: 'STHREE SAKTHI', nameMl: 'സ്ത്രീ ശക്തി', code: 'SS' },
  'FIFTY-FIFTY': { id: 'fifty-fifty', name: 'FIFTY-FIFTY', nameMl: 'ഫിഫ്റ്റി-ഫിഫ്റ്റി', code: 'FF' },
  'KARUNYA PLUS': { id: 'karunya-plus', name: 'KARUNYA PLUS', nameMl: 'കാരുണ്യ പ്ലസ്', code: 'KN' },
  'NIRMAL': { id: 'nirmal', name: 'NIRMAL', nameMl: 'നിർമ്മൽ', code: 'NR' },
  'KARUNYA': { id: 'karunya', name: 'KARUNYA', nameMl: 'കാരുണ്യ', code: 'KR' },
  'AKSHAYA': { id: 'akshaya', name: 'AKSHAYA', nameMl: 'അക്ഷയ', code: 'AK' },
  'BHAGYATHARA': { id: 'bhagyathara', name: 'BHAGYATHARA', nameMl: 'ഭാഗ്യതാര', code: 'BT' },
  'SAMRUDHI': { id: 'samrudhi', name: 'SAMRUDHI', nameMl: 'സമൃദ്ധി', code: 'SM' },
  'SUVARNA KERALAM': { id: 'suvarna-keralam', name: 'SUVARNA KERALAM', nameMl: 'സുവർണ്ണ കേരളം', code: 'SK' },
  'DHANALEKSHMI': { id: 'dhanalekshmi', name: 'DHANALEKSHMI', nameMl: 'ധനലക്ഷ്മി', code: 'DL' },
  'THIRUVONAM BUMPER': { id: 'thiruvonam-bumper', name: 'THIRUVONAM BUMPER', nameMl: 'തിരുവോണം ബമ്പർ', code: 'BR' },
  'POOJA BUMPER': { id: 'pooja-bumper', name: 'POOJA BUMPER', nameMl: 'പൂജ ബമ്പർ', code: 'BR' },
  'XMAS NEW YEAR BUMPER': { id: 'xmas-new-year-bumper', name: 'XMAS NEW YEAR BUMPER', nameMl: 'ക്രിസ്മസ് ന്യൂ ഇയർ ബമ്പർ', code: 'BR' },
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        agent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/json,application/pdf,*/*',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    ).on('error', reject);
  });
}

function extractPdfLines(pdfBuffer) {
  let idx = 0;
  const lines = [];
  while ((idx = pdfBuffer.indexOf('stream', idx)) !== -1) {
    const start = idx + 6 + (pdfBuffer[idx + 6] === 13 ? 2 : 1);
    const end = pdfBuffer.indexOf('endstream', start);
    if (end !== -1) {
      const slice = pdfBuffer.subarray(start, end);
      try {
        const dec = zlib.inflateSync(slice).toString('latin1');
        const regex = /\((.*?)\)\s*Tj/g;
        let m;
        while ((m = regex.exec(dec)) !== null) {
          const clean = m[1].replace(/\u0000/g, '').replace(/\\([()\\])/g, '$1').trim();
          if (clean) lines.push(clean);
        }
      } catch (e) {
        // Not a zlib stream or font stream, ignore
      }
    }
    idx = end !== -1 ? end + 9 : idx + 6;
  }
  return lines;
}

function parseDrawLines(lines, pdfUrl) {
  if (!lines || lines.length === 0) return null;

  // Find header line: e.g. "STHREE-SAKTHI LOTTERY NO.SS-543rd DRAW held on:- 27/10/2026,3:00 PM"
  let headerLine = lines.find((l) => /LOTTERY\s*NO\./i.test(l) && /DRAW/i.test(l));
  if (!headerLine) {
    headerLine = lines.find((l) => /DRAW\s*held\s*on/i.test(l));
  }
  if (!headerLine) return null;

  // Extract date: DD/MM/YYYY
  const dateMatch = headerLine.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dateMatch) return null;
  const isoDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

  // Extract draw number: e.g. SS-543
  const drawNumMatch = headerLine.match(/([A-Z]{1,3}-\d+)/i) || headerLine.match(/NO\.?\s*([A-Z0-9-]+)/i);
  const drawNumber = drawNumMatch ? drawNumMatch[1].replace(/rd|th|st|nd/i, '').trim() : 'DRAW';

  // Extract scheme name
  let rawSchemeName = headerLine.split(/LOTTERY/i)[0].replace(/\s+/g, ' ').trim().toUpperCase();
  let matchedScheme = SCHEME_MAP[rawSchemeName] || null;
  if (!matchedScheme) {
    for (const [key, val] of Object.entries(SCHEME_MAP)) {
      if (rawSchemeName.includes(key) || key.includes(rawSchemeName)) {
        matchedScheme = val;
        break;
      }
    }
  }
  if (!matchedScheme) {
    matchedScheme = {
      id: rawSchemeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: rawSchemeName,
      nameMl: rawSchemeName,
      code: drawNumber.split('-')[0] || 'KL',
    };
  }

  // Parse prize tiers into groups
  const prizeBlocks = {};
  let currentPrizeKey = null;

  for (const line of lines) {
    if (/([0-9]+(st|nd|rd|th)\s*Prize|Cons\s*Prize)/i.test(line)) {
      currentPrizeKey = line.trim();
      prizeBlocks[currentPrizeKey] = [];
    } else if (currentPrizeKey) {
      prizeBlocks[currentPrizeKey].push(line.trim());
    }
  }

  // Helper to extract amount from string "1st Prize Rs :10000000/-"
  const parseAmount = (str, fallback) => {
    const m = (str || '').match(/:\s*([0-9]+)/);
    return m ? parseInt(m[1], 10) : fallback;
  };

  // 1st Prize
  let firstPrize = null;
  const fpKey = Object.keys(prizeBlocks).find((k) => /1st\s*Prize/i.test(k));
  if (fpKey && prizeBlocks[fpKey].length > 0) {
    const rawFp = prizeBlocks[fpKey][0]; // e.g. "1 SP 760709 KOLLAM"
    const m = rawFp.match(/([A-Z]{1,3})\s*(\d{6})/i) || rawFp.match(/(\d{6})/);
    if (m) {
      firstPrize = {
        series: m[1] && m[1].length <= 3 ? m[1].toUpperCase() : 'KL',
        number: m[2] || m[1],
        amount: parseAmount(fpKey, 7500000),
      };
    }
  }

  // Consolation Prize
  let consolationPrize = null;
  const consKey = Object.keys(prizeBlocks).find((k) => /Cons/i.test(k));
  if (consKey && prizeBlocks[consKey].length > 0) {
    const firstCons = prizeBlocks[consKey][0];
    const m = firstCons.match(/(\d{6})/);
    if (m) {
      consolationPrize = {
        number: m[1],
        amount: parseAmount(consKey, 8000),
      };
    }
  }

  // 2nd Prize
  const secondPrize = [];
  const spKey = Object.keys(prizeBlocks).find((k) => /2nd\s*Prize/i.test(k));
  if (spKey) {
    const spAmount = parseAmount(spKey, 500000);
    for (const item of prizeBlocks[spKey]) {
      const m = item.match(/([A-Z]{1,3})\s*(\d{6})/i) || item.match(/(\d{6})/);
      if (m) {
        secondPrize.push({
          series: m[1] && m[1].length <= 3 ? m[1].toUpperCase() : '',
          number: m[2] || m[1],
          amount: spAmount,
        });
      }
    }
  }

  // Helper for numeric lists
  const extractNumbers = (keyRegex) => {
    const key = Object.keys(prizeBlocks).find((k) => keyRegex.test(k));
    if (!key) return [];
    const list = [];
    for (const item of prizeBlocks[key]) {
      // Find 4-digit or 6-digit number tokens
      const nums = item.match(/\b\d{4,6}\b/g);
      if (nums) {
        for (const n of nums) {
          if (!list.includes(n)) list.push(n);
        }
      }
    }
    return list;
  };

  const thirdPrize = extractNumbers(/3rd\s*Prize/i);
  const fourthPrize = extractNumbers(/4th\s*Prize/i);
  const fifthPrize = extractNumbers(/5th\s*Prize/i);
  const sixthPrize = extractNumbers(/6th\s*Prize/i);
  const seventhPrize = extractNumbers(/7th\s*Prize/i);
  let eighthPrize = extractNumbers(/8th\s*Prize/i);
  const ninthPrize = extractNumbers(/9th\s*Prize/i);

  // Combine 8th and 9th prizes if 9th prize exists
  if (ninthPrize.length > 0) {
    eighthPrize = [...new Set([...eighthPrize, ...ninthPrize])];
  }

  if (!firstPrize) return null;

  return {
    scheme_id: matchedScheme.id,
    draw_number: drawNumber,
    draw_name: matchedScheme.name,
    draw_name_ml: matchedScheme.nameMl,
    draw_date: isoDate,
    draw_time: '3:00 PM',
    status: 'DECLARED',
    first_prize: firstPrize,
    consolation_prize: consolationPrize || (firstPrize ? { number: firstPrize.number, amount: 8000 } : undefined),
    second_prize: secondPrize,
    third_prize: thirdPrize,
    fourth_prize: fourthPrize,
    fifth_prize: fifthPrize,
    sixth_prize: sixthPrize,
    seventh_prize: seventhPrize,
    eighth_prize: eighthPrize,
    official_pdf_url: pdfUrl,
  };
}

async function scrapeOfficialKeralaDraws() {
  console.log('[Poller] Connecting to statelottery.kerala.gov.in...');
  const htmlBuffer = await fetchUrl('https://statelottery.kerala.gov.in/index.php/lottery-result-view');
  const html = htmlBuffer.toString('utf-8');

  // Match table rows: <td class='text-left'>NAME(CODE-NO)</td><td >DD/MM/YYYY</td><td ><a href='URL'
  const rowRegex = /<tr><td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><td[^>]*><a href=['"]([^'"]+)['"]/gi;
  let match;
  const recentRows = [];
  while ((match = rowRegex.exec(html)) !== null) {
    recentRows.push({
      lottery: match[1].trim(),
      dateStr: match[2].trim(),
      pdfUrl: match[3].trim(),
    });
  }

  console.log(`[Poller] Found ${recentRows.length} recent official draws in government directory.`);
  return recentRows;
}

async function scrapeFastLive1stPrize() {
  try {
    const url = 'https://www.keralalotteries.net/feeds/posts/default?alt=json&max-results=3';
    const jsonBuf = await fetchUrl(url);
    const data = JSON.parse(jsonBuf.toString('utf-8'));
    const entries = data.feed?.entry || [];

    for (const entry of entries) {
      const content = entry.content?.['$t'] || '';
      const match = content.match(/(?:1st\s*Prize|First\s*Prize)[\s\S]{1,400}?([A-Z]{2})\s*([0-9]{6})/i);
      if (match) {
        const series = match[1].toUpperCase();
        const number = match[2];
        if (number !== '000000' && number !== '123456') {
          return { series, number };
        }
      }
    }
  } catch (e) {
    // Ignore network error on fast fallback
  }
  return null;
}

async function main() {
  console.log('=== Kerala 3:00 PM Lottery Result Autopoller ===');
  console.log(`Execution Time: ${new Date().toISOString()}`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found at ${DATA_FILE}`);
    process.exit(1);
  }

  const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  let updatedCount = 0;

  // Calculate IST Date (YYYY-MM-DD)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istNow = new Date(utc + 5.5 * 3600000);
  const todayIso = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`;

  // Stage 1: Check fast live feed if today is not declared and not overridden by admin
  const todayEntry = existingData[todayIso] || {};
  if (todayEntry.status !== 'DECLARED' && todayEntry.status !== 'ADMIN_OVERRIDE') {
    const fastPrize = await scrapeFastLive1stPrize();
    if (fastPrize && fastPrize.number !== todayEntry.first_prize?.number) {
      console.log(`[Poller:FastLive] Found 1st prize flash: ${fastPrize.series} ${fastPrize.number}`);
      existingData[todayIso] = {
        ...todayEntry,
        draw_date: todayIso,
        draw_time: '3:00 PM',
        status: 'LIVE_PRELIMINARY',
        source: 'fast_scraper',
        updated_at: new Date().toISOString(),
        first_prize: {
          series: fastPrize.series,
          number: fastPrize.number,
          amount: todayEntry.first_prize?.amount || 10000000
        },
        consolation_prize: {
          number: fastPrize.number,
          amount: 5000
        }
      };
      updatedCount++;
    }
  }

  try {
    const officialDraws = await scrapeOfficialKeralaDraws();

    // Check the latest 5 draws
    for (const drawEntry of officialDraws.slice(0, 5)) {
      const [day, month, year] = drawEntry.dateStr.split('/');
      const isoDate = `${year}-${month}-${day}`;

      // Check if we already have complete declared data for this date
      const existing = existingData[isoDate];
      if (existing && existing.first_prize?.number && existing.eighth_prize?.length > 0) {
        console.log(`[Poller] ${isoDate} (${drawEntry.lottery}) already up to date.`);
        continue;
      }

      console.log(`[Poller] Fetching & parsing official PDF for ${isoDate} (${drawEntry.lottery})...`);
      try {
        const pdfBuf = await fetchUrl(drawEntry.pdfUrl);
        const lines = extractPdfLines(pdfBuf);
        const parsed = parseDrawLines(lines, drawEntry.pdfUrl);

        if (parsed && parsed.first_prize) {
          existingData[isoDate] = parsed;
          updatedCount++;
          console.log(`[Poller] Successfully parsed ${parsed.draw_number} (${parsed.draw_name})! 1st Prize: ${parsed.first_prize.series} ${parsed.first_prize.number}`);
        } else {
          console.warn(`[Poller] Could not extract 1st prize from ${drawEntry.pdfUrl}`);
        }
      } catch (err) {
        console.warn(`[Poller] Failed parsing ${drawEntry.pdfUrl}:`, err.message);
      }
    }

    if (updatedCount > 0) {
      // Sort keys descending by date
      const sortedKeys = Object.keys(existingData).sort((a, b) => b.localeCompare(a));
      const sortedData = {};
      for (const k of sortedKeys) {
        sortedData[k] = existingData[k];
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(sortedData, null, 2), 'utf-8');
      console.log(`[Poller] Updated ${updatedCount} draw(s) in src/data/kerala_draws.json.`);
    } else {
      console.log('[Poller] All draws are already up to date. No changes required.');
    }
  } catch (err) {
    console.error('[Poller] Error during scrape execution:', err.message);
  }

  console.log('Done.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
