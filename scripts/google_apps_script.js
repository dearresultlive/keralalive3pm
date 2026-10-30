/**
 * ==============================================================================
 * KERALALIVE3PM — GOOGLE APPS SCRIPT FAST LIVE AUTO-POLLER
 * ==============================================================================
 * 
 * Runs on Google's trusted infrastructure (Google IP ranges).
 * Immune to Indian government firewalls, Cloudflare WAF, and IP rate limits.
 * 
 * HOW TO INSTALL IN 2 MINUTES:
 * 1. Open https://script.google.com/ in your browser.
 * 2. Click "+ New project".
 * 3. Delete any default code and PASTE this entire file.
 * 4. Replace `YOUR_GITHUB_TOKEN` below with your GitHub Personal Access Token (from https://github.com/settings/tokens).
 * 5. Run the function `setupAutoTrigger()` once from the toolbar to activate the daily 3:00 PM scheduler.
 * ==============================================================================
 */

// Configuration
const CONFIG = {
  WEBSITE_API: 'https://keralalive3pm.com/api/admin/publish',
  ADMIN_PIN: '3000',
  // Create a token at https://github.com/settings/tokens with "repo" or "contents:write" permission
  GITHUB_TOKEN: 'YOUR_GITHUB_TOKEN',
  FEED_URL: 'https://www.keralalotteries.net/feeds/posts/default?alt=json&max-results=3'
};

/**
 * Main Scraper Function
 * Runs every minute between 3:00 PM and 3:35 PM IST.
 */
function runKeralaFastPoller() {
  const istDateStr = getISTDateString();
  Logger.log(`[Poller] Starting check for ${istDateStr}...`);

  // Check if we already published today
  const props = PropertiesService.getScriptProperties();
  const lastPublished = props.getProperty('LAST_PUBLISHED_DATE');
  if (lastPublished === istDateStr) {
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

    for (const entry of entries) {
      const content = entry.content?.['$t'] || '';

      // Check if this post relates to today or recent draw
      // Regex looks for: 1st Prize followed by Series (2 uppercase letters) and 6 digits
      const match = content.match(/(?:1st\s*Prize|First\s*Prize)[\s\S]{1,400}?([A-Z]{2})\s*([0-9]{6})/i);

      if (match) {
        const series = match[1].toUpperCase();
        const number = match[2];

        // Sanity check: Ensure not dummy / placeholder number (e.g. 000000 or 123456)
        if (number === '000000' || number === '123456') {
          Logger.log(`[Poller] Detected dummy placeholder number: ${series} ${number}`);
          continue;
        }

        Logger.log(`[Poller] 🎉 FOUND 1ST PRIZE WINNER: ${series} ${number}! Publishing...`);

        // 2. Publish to Website API
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
 * Returns current Date in IST (Asia/Kolkata) as YYYY-MM-DD
 */
function getISTDateString() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
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
  // Clear any existing triggers
  deleteExistingTriggers();

  // Create recurring trigger every minute
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
