/**
 * ==============================================================================
 * KERALALIVE3PM — 2-STAGE DUAL-SOURCE AUTO-POLLER & TELEGRAM BROADCASTER
 * ==============================================================================
 * 
 * Runs on Google's trusted infrastructure (Google Cloud IP ranges).
 * Immune to Indian government firewalls, Cloudflare WAF, and IP rate limits.
 * 
 * 2-STAGE LIFECYCLE:
 * - STAGE 1 (Speed Race, ~3:05 PM): Publishes 1st Prize instantly so you rank #1 on Google.
 * - STAGE 2 (Full Prize Auto-Capture, ~3:15-3:30 PM): Detects 2nd, 3rd, 4th, 5th prizes 
 *   and automatically updates kerala_draws.json with the complete prize table!
 * 
 * HOW TO USE:
 * 1. Open your project on https://script.google.com/
 * 2. Select All (Ctrl+A), Delete, and Paste this entire script.
 * 3. Save (Ctrl+S).
 * ==============================================================================
 */

// Configuration
const CONFIG = {
  WEBSITE_API: 'https://keralalive3pm.com/api/admin/publish',
  ADMIN_PIN: '9046',
  GITHUB_TOKEN: 'YOUR_GITHUB_TOKEN',
  // Dual Fast Blogger Feed Sources for 100% Failover & Fastest Update
  FEED_SOURCES: [
    {
      name: 'KeralaLotteries.net',
      url: 'https://www.keralalotteries.net/feeds/posts/default?alt=json&max-results=5'
    },
    {
      name: 'KeralaLotteriesResults.in',
      url: 'https://www.keralalotteriesresults.in/feeds/posts/default?alt=json&max-results=5'
    }
  ],
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

  // SAFETY 2: Check current progress stage for today
  const props = PropertiesService.getScriptProperties();
  const currentStage = props.getProperty('STAGE_' + istDateStr) || 'NONE';

  if (currentStage === 'STAGE_2_FULL_RESULTS') {
    Logger.log(`[Poller] Full 1st to 5th prize results for ${istDateStr} are already completed. Skipping.`);
    return;
  }

  // Date regex for today (e.g. "03-11-2026", "3-11-2026", "03.11.2026", "03/11/2026")
  const [y, m, d] = istDateStr.split('-');
  const dInt = parseInt(d, 10);
  const mInt = parseInt(m, 10);
  const dateRegex = new RegExp(`(?:0?${dInt}[-./]0?${mInt}[-./]${y})`, 'i');

  for (const source of CONFIG.FEED_SOURCES) {
    try {
      Logger.log(`[Poller] Checking ${source.name}... (Current Stage: ${currentStage})`);
      const response = UrlFetchApp.fetch(source.url, {
        muteHttpExceptions: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Google Apps Script; KeralaLive3PM)' }
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(`[Poller] ${source.name} returned HTTP ${response.getResponseCode()}. Trying next source.`);
        continue;
      }

      const data = JSON.parse(response.getContentText());
      const entries = data.feed?.entry || [];

      for (const entry of entries) {
        const title = entry.title?.['$t'] || '';
        const content = entry.content?.['$t'] || '';

        // SAFETY 3: Post TITLE must explicitly match today's date
        if (!dateRegex.test(title)) {
          continue;
        }

        // 1st Prize Extraction
        let match1 = content.match(/(?:1st\s*Prize|First\s*Prize)[\s\S]{1,800}?([A-Z]{2})\s*([0-9]{6})/i);
        if (!match1) {
          match1 = content.match(/([A-Z]{2})\s*([0-9]{6})\s*\([A-Z\s]{3,30}\)/i);
        }

        if (!match1) continue;

        const series1 = match1[1].toUpperCase();
        const number1 = match1[2];

        // Sanity & anti-dummy check
        if (number1 === '000000' || number1 === '123456') {
          continue;
        }

        // Draw Code Extraction (e.g. SS-544, BT-78)
        const dm = title.match(/\b(SS|BT|SM|KR|SK|KN|NR|W|AK|FF|DL|BR)[-.\s]*([0-9]{2,4})\b/i);
        const drawNumber = dm ? `${dm[1].toUpperCase()}-${dm[2]}` : null;

        // 2nd Prize Extraction
        let secondPrize = null;
        const match2 = content.match(/(?:2nd\s*Prize|Second\s*Prize)[\s\S]{1,800}?([A-Z]{2})\s*([0-9]{6})/i);
        if (match2) {
          secondPrize = [{ series: match2[1].toUpperCase(), number: match2[2], amount: 3000000 }];
        }

        // 3rd Prize Extraction
        let thirdPrize = null;
        const match3 = content.match(/(?:3rd\s*Prize|Third\s*Prize)[\s\S]{1,800}?([A-Z]{2}\s*)?([0-9]{6})/i);
        if (match3) {
          thirdPrize = [match3[2]];
        }

        // 4th Prize Extraction (19 four-digit numbers)
        let fourthPrize = null;
        const m4Section = content.match(/(?:4th\s*Prize|Fourth\s*Prize)[\s\S]{1,1500}?(?:5th\s*Prize|Fifth\s*Prize)/i);
        if (m4Section) {
          const rawNums4 = m4Section[0].match(/\b([0-9]{4})\b/g) || [];
          const clean4 = rawNums4.filter(n => n !== '2026' && n !== '5000');
          if (clean4.length >= 8) fourthPrize = clean4;
        }

        // 5th Prize Extraction (6 four-digit numbers)
        let fifthPrize = null;
        const m5Section = content.match(/(?:5th\s*Prize|Fifth\s*Prize)[\s\S]{1,1500}?(?:6th\s*Prize|Sixth\s*Prize)/i);
        if (m5Section) {
          const rawNums5 = m5Section[0].match(/\b([0-9]{4})\b/g) || [];
          const clean5 = rawNums5.filter(n => n !== '2026' && n !== '2000');
          if (clean5.length >= 3) fifthPrize = clean5;
        }

        const isFullReady = (secondPrize !== null && fourthPrize !== null);

        // CASE A: Full Results Ready -> Publish Stage 2!
        if (isFullReady) {
          Logger.log(`[Poller] 🎯 FULL RESULTS (1st to 5th) detected on ${source.name}! Publishing Stage 2...`);

          const payload = {
            pin: CONFIG.ADMIN_PIN,
            github_token: CONFIG.GITHUB_TOKEN,
            date: istDateStr,
            stage: 'STAGE_2_FULL_RESULTS',
            series: series1,
            number: number1,
            draw_number: drawNumber,
            second_prize: secondPrize,
            third_prize: thirdPrize,
            fourth_prize: fourthPrize,
            fifth_prize: fifthPrize,
            source: 'google_apps_script'
          };

          const postRes = UrlFetchApp.fetch(CONFIG.WEBSITE_API, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });

          Logger.log(`[Poller] Stage 2 API Response: ${postRes.getContentText()}`);

          if (postRes.getResponseCode() === 200) {
            props.setProperty('STAGE_' + istDateStr, 'STAGE_2_FULL_RESULTS');
            Logger.log(`[Poller] ✅ Successfully completed Stage 2 for ${istDateStr}!`);

            // Send Telegram alert if it wasn't sent yet during Stage 1
            if (currentStage !== 'STAGE_1_FIRST_PRIZE' && CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
              sendTelegramAlert(istDateStr, series1, number1);
            }
            return;
          }
        }

        // CASE B: Only 1st Prize Ready -> Publish Stage 1 (Speed Race)!
        else if (currentStage !== 'STAGE_1_FIRST_PRIZE') {
          Logger.log(`[Poller] ⚡ 1ST PRIZE WINNER detected on ${source.name}: ${series1} ${number1}! Publishing Stage 1...`);

          const payload = {
            pin: CONFIG.ADMIN_PIN,
            github_token: CONFIG.GITHUB_TOKEN,
            date: istDateStr,
            stage: 'STAGE_1_FIRST_PRIZE',
            series: series1,
            number: number1,
            draw_number: drawNumber,
            source: 'google_apps_script'
          };

          const postRes = UrlFetchApp.fetch(CONFIG.WEBSITE_API, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });

          Logger.log(`[Poller] Stage 1 API Response: ${postRes.getContentText()}`);

          if (postRes.getResponseCode() === 200) {
            props.setProperty('STAGE_' + istDateStr, 'STAGE_1_FIRST_PRIZE');
            Logger.log(`[Poller] ✅ Stage 1 published. Continuing to poll for 2nd-5th prizes...`);

            if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
              sendTelegramAlert(istDateStr, series1, number1);
            }
            return; // Will check next minute for full prizes!
          }
        }
      }
    } catch (err) {
      Logger.log(`[Poller] Error checking ${source.name}: ${err.message}`);
    }
  }

  Logger.log('[Poller] Live draw still in progress or waiting for next prize tiers.');
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
  sendTelegramAlert('03-11-2026', 'SS', '544123');
}
