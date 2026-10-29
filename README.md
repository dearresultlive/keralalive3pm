# 🌴 keralalive3pm.com - Kerala State Lottery Result Live 3:00 PM

Official repository for **https://keralalive3pm.com**, the ultra-fast real-time portal for Kerala State Lottery draws conducted daily at 3:00 PM IST at Gorky Bhavan, Thiruvananthapuram.

---

## ⚡ Highlights & Key Features

- **Blazing Fast Performance**: Built with **Astro 4 Server Mode** on Cloudflare Pages edge. Sub-50ms TTFB worldwide.
- **Dual Language Support (EN + മലയാളം)**: Instant 1-tap language toggle remembering user preference.
- **Live 3:00 PM Countdown & Drawing Alert**: Auto-detects IST time. Displays real-time countdown before 2:55 PM, live draw spinner from 2:55 PM to 3:30 PM, and declared results thereafter.
- **Complete 1st to 8th Prize Breakdown**: Full tables with prize values (1st Prize ₹75L–₹1Cr, Consolation ₹8K, 2nd ₹5L–₹10L, 3rd to 8th prizes).
- **Interactive 6-Digit Ticket Checker**: Enter 2-letter series code and 6-digit number with instant confetti celebration and winning tier calculation.
- **Kerala 3D Guessing & A/B/C Board Chart**: Historical frequency analytics, single board isolates, and 1-tap Lucky 3D combination generator.
- **SEO & Google Search Dominance**: Full OpenGraph, Twitter Cards, NewsArticle schema, FAQ schema, and IndexNow instant indexing integration.
- **Mobile First & PWA Ready**: Floating bottom navigation bar, WhatsApp and Telegram community shortcuts, and installable web app manifest.

---

## 🗓️ Kerala Weekly Lottery Schedule

| Day | Lottery Scheme | Code | 1st Prize | Ticket Price |
| :--- | :--- | :--- | :--- | :--- |
| **Monday** | Win-Win (വിൻ-വിൻ) | `W` | ₹75 Lakhs | ₹40 |
| **Tuesday** | Sthree Sakthi (സ്ത്രീ ശക്തി) | `SS` | ₹75 Lakhs | ₹40 |
| **Wednesday** | Fifty-Fifty (ഫിഫ്റ്റി-ഫിഫ്റ്റി) | `FF` | ₹1 Crore | ₹50 |
| **Thursday** | Karunya Plus (കാരുണ്യ പ്ലസ്) | `KN` | ₹80 Lakhs | ₹40 |
| **Friday** | Nirmal (നിർമ്മൽ) | `NR` | ₹70 Lakhs | ₹40 |
| **Saturday** | Karunya (കാരുണ്യ) | `KR` | ₹80 Lakhs | ₹40 |
| **Sunday** | Akshaya (അക്ഷയ) | `AK` | ₹70 Lakhs | ₹40 |

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run automated lottery poller
npm run poll

# Production build
npm run build
```

---

## 🌐 Cloudflare Pages Deployment Setup

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for keralalive3pm.com"
   git remote add origin https://github.com/<your-username>/keralalive3pm.git
   git branch -M main
   git push -u origin main
   ```

2. **In Cloudflare Dashboard**:
   - Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   - Select the repository: `keralalive3pm`.
   - **Framework Preset**: `Astro`.
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - In **Environment Variables**:
     - `NODE_VERSION`: `20` (or `22`)
   - Click **Save and Deploy**.

3. **Custom Domain**:
   - In Cloudflare Pages project settings > **Custom domains** > Add `keralalive3pm.com` and `www.keralalive3pm.com`.
   - Cloudflare will automatically provision SSL certificates.
