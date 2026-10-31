/**
 * ==============================================================================
 * KERALALIVE3PM — GOOGLE APPS SCRIPT FAST LIVE AUTO-POLLER & TELEGRAM BROADCASTER
 * ==============================================================================
 * 
 * Runs on Google's trusted infrastructure (Google Cloud IP ranges).
 * Immune to Indian government firewalls, Cloudflare WAF, and IP rate limits.
 * 
 * HOW TO USE:
 * 1. Open your project on https://script.google.com/
 * 2. Select All (Ctrl+A), Delete, and Paste this entire script.
 * 3. Save (Ctrl+S).
 * 4. Run `setupAutoTrigger()` once from toolbar to activate the 3:00 PM scheduler.
 * ==============================================================================
 */

// Configuration
const CONFIG = {
  WEBSITE_API: 'https://keralalive3pm.com/api/admin/publish',
  ADMIN_PIN: '3000',
  GITHUB_TOKEN: 'YOUR_GITHUB_TOKEN',
  FEED_URL: 'https://www.keralalotteries.net/feeds/posts/default?alt=json&max-results=3',
  TELEGRAM_BOT_TOKEN: 'YOUR_TELEGRAM_BOT_TOKEN',
  TELEGRAM_CHAT_ID: 'YOUR_TELEGRAM_CHAT_ID'
};

/**
 * Main Scraper & Broadcaster Function
 * Runs every minute between 2:50 PM and 5:00 PM IST.
 */
function runKeralaFastPoller() {
  const istDateStr = getISTDateString();
  Logger.log(`[Poller] Starting check for ${istDateStr}...`);

  // SAFETY 1: Only run during live draw window (2:50 PM to 5:00 PM IST)
  const ist = getISTDate();
  const currentMinutes = ist.getHours() * 60 + ist.getMinutes();
  const DRAW_START_MIN = 14 * 60 + 50; // 2:50 PM IST
  const DRAW_END_MIN = 17 * 60;        // 5:00 PM IST

  if (currentMinutes < DRAW_START_MIN || currentMinutes > DRAW_END_MIN) {
    Logger.log(`[Poller] Outside 3:00 PM draw window (2:50 PM - 5:00 PM IST). Current IST: ${ist.toLocaleTimeString()}. Skipping.`);
    return;
  }

  // SAFETY 2: Skip if today's result was already published
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('LAST_PUBLISHED_DATE') === istDateStr) {
    Logger.log(`[Poller] Result for ${istDateStr} is already published. Skipping.`);
    return;
  }

  try {
    // 1. Fetch fast Blogger JSON feed from Google CDN
    const response = UrlFetchApp.fetch(CONFIG.FEED_URL, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Google Apps Script; KeralaLive3PM)' }
    });

    if (response.getResponseCode() !== 200) {
      Logger.log(`[Poller] Feed returned HTTP ${response.getResponseCode()}`);
      return;
    }

    const data = JSON.parse(response.getContentText());
    const entries = data.feed?.entry || [];

    // Date regex for today (e.g. "01-11-2026", "1-11-2026", "01.11.2026", "01/11/2026")
    const [y, m, d] = istDateStr.split('-');
    const dInt = parseInt(d, 10);
    const mInt = parseInt(m, 10);
    const dateRegex = new RegExp(`(?:0?${dInt}[-./]0?${mInt}[-./]${y})`, 'i');

    for (const entry of entries) {
      const title = entry.title?.['$t'] || '';
      const content = entry.content?.['$t'] || '';

      // SAFETY 3: Post must explicitly belong to TODAY's date
      const textToSearch = title + ' ' + content;
      if (!dateRegex.test(textToSearch)) {
        Logger.log(`[Poller] Post "${title}" does not match today's date ${istDateStr}. Skipping.`);
        continue;
      }

      // Regex looks for: 1st Prize followed by Series (2 uppercase letters) and 6 digits
      const match = content.match(/(?:1st\s*Prize|First\s*Prize)[\s\S]{1,400}?([A-Z]{2})\s*([0-9]{6})/i);

      if (match) {
        const series = match[1].toUpperCase();
        const number = match[2];

        // Sanity check: Ensure not dummy / placeholder number
        if (number === '000000' || number === '123456') {
          Logger.log(`[Poller] Detected dummy placeholder number: ${series} ${number}`);
          continue;
        }

        Logger.log(`[Poller] 🎉 FOUND 1ST PRIZE WINNER: ${series} ${number}! Publishing...`);

        // 2. Publish to Website API (Commits to GitHub & Cloudflare)
        const payload = {
          pin: CONFIG.ADMIN_PIN,
          github_token: CONFIG.GITHUB_TOKEN,
          date: istDateStr,
          series: series,
          number: number,
          source: 'google_apps_script'
        };

        const postRes = UrlFetchApp.fetch(CONFIG.WEBSITE_API, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

        Logger.log(`[Poller] API Response (${postRes.getResponseCode()}): ${postRes.getContentText()}`);

        if (postRes.getResponseCode() === 200) {
          props.setProperty('LAST_PUBLISHED_DATE', istDateStr);
          Logger.log(`[Poller] Successfully marked ${istDateStr} as published.`);

          // 3. Broadcast to Telegram Channel directly
          if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
            sendTelegramAlert(istDateStr, series, number);
          }

          return;
        }
      }
    }

    Logger.log('[Poller] Live draw still in progress or 1st prize not typed yet.');

  } catch (err) {
    Logger.log(`[Poller] Error during scrape: ${err.message}`);
  }
}

/**
 * Returns current Date in IST as Date object
 */
function getISTDate() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

/**
 * Returns current Date in IST (Asia/Kolkata) as YYYY-MM-DD
 */
function getISTDateString() {
  const ist = getISTDate();
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Setup Function: Run this once to install daily triggers.
 * Sets up a recurring check every 1 minute.
 */
function setupAutoTrigger() {
  deleteExistingTriggers();

  ScriptApp.newTrigger('runKeralaFastPoller')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Success! Trigger installed. Script will run every 1 minute.');
}

/**
 * Cleanup helper: removes all triggers
 */
function deleteExistingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    ScriptApp.deleteTrigger(t);
  }
  Logger.log('Cleared existing triggers.');
}

/**
 * Sends Instant Broadcast to Telegram Channel
 */
function sendTelegramAlert(date, series, number) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    Logger.log('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in CONFIG');
    return;
  }
  try {
    const text = '🎯 <b>KERALA STATE LOTTERY RESULT (3:00 PM)</b>\n' +
      '📅 Date: <b>' + date.split('-').reverse().join('/') + '</b> • 3:00 PM IST\n\n' +
      '🥇 <b>1ST PRIZE WINNER:</b>\n' +
      '👉 <code>' + series + ' ' + number + '</code>\n\n' +
      '🎁 <b>CONSOLATION:</b> <code>' + number + '</code> (All other series)\n\n' +
      '⚡ <b>Check all prizes & instant ticket checker:</b>\n' +
      'https://keralalive3pm.com/';

    const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      }),
      muteHttpExceptions: true
    });
    Logger.log('[Telegram] Response (' + res.getResponseCode() + '): ' + res.getContentText());
  } catch (err) {
    Logger.log('[Telegram] Error: ' + err.message);
  }
}

/**
 * Test function: sends a test winning ticket to your channel
 */
function testTelegramPost() {
  Logger.log('[Telegram Test] Sending test message to ' + CONFIG.TELEGRAM_CHAT_ID + '...');
  sendTelegramAlert('31-10-2026', 'KG', '501790');
}
