# Cognentrz — Soil Intelligence Platform

AI-powered soil health monitoring for Tamil Nadu farmers using satellite imagery, NDVI analysis, and Gemini AI recommendations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + API routes | Next.js 14 (deployed on **Vercel**) |
| Database | PostgreSQL on **Neon** |
| Satellite data | Google Earth Engine REST API |
| AI recommendations | Google Gemini |
| Weather | OpenWeatherMap |
| Soil data | SoilGrids (ISRIC) |
| WhatsApp alerts | Twilio / CallMeBot |
| Payments | Razorpay |

> **Note**: This is a Next.js full-stack monolith. Vercel handles both the frontend pages AND the API routes (serverless functions). No separate backend server is needed.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local
# Fill in your keys in .env.local

# 3. Run database migration (point DATABASE_URL at your local or Neon DB)
npm run db:migrate

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Deploy to Vercel + Neon

### Step 1 — Create Neon Database

1. Go to [console.neon.tech](https://console.neon.tech) → New Project
2. Name it `cognentrz` → Create
3. Copy the **Connection string** (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### Step 2 — Run Migrations on Neon

```bash
DATABASE_URL="<your_neon_connection_string>" node scripts/migrate.js
```

### Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect your GitHub repo at vercel.com → New Project → Import Git Repo
```

### Step 4 — Add Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | Any long random string (32+ chars) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `GEE_PROJECT_ID` | `cognentrz-499116` |
| `GEE_CREDENTIALS_JSON` | Full contents of `earth-engine-key.json` (as a single JSON string) |
| `OPENWEATHER_API_KEY` | From openweathermap.org |
| `GEMINI_API_KEY` | From aistudio.google.com |
| `RAZORPAY_KEY_ID` | (optional — payment demo works without it) |
| `RAZORPAY_KEY_SECRET` | (optional) |
| `TWILIO_ACCOUNT_SID` | (optional — WhatsApp alerts) |
| `TWILIO_AUTH_TOKEN` | (optional) |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` |

> **GEE_CREDENTIALS_JSON tip**: Open `backend/credentials/earth-engine-key.json`, copy ALL the text, and paste it as the value (Vercel handles multiline/JSON values correctly).

### Step 5 — Redeploy

After adding env vars, click **Redeploy** in Vercel dashboard.

---

## Admin Account

The email `logesh.visvanathan2003@gmail.com` has a free bypass for all Pro features.  
Create an account with this email → instant Pro access, no payment needed.

---

## App Routes

| Route | Description |
|-------|-------------|
| `/login` | Login / Register |
| `/dashboard` | Main dashboard with farms and weather |
| `/farms` | Farm list |
| `/farms/new` | Draw farm boundary on map |
| `/farms/[id]` | Farm detail + soil analysis |
| `/map` | Satellite / NDVI map |
| `/reports` | AI-generated reports |
| `/alerts` | Smart alerts |
| `/regional` | District-wide crop intelligence |
| `/whatsapp` | WhatsApp alert settings |
| `/settings` | Profile, theme, language |
| `/pro` | Upgrade to Pro |

---

## Languages Supported

English · Tamil · Hindi · Telugu · Kannada · Malayalam

---

## WhatsApp Alerts Setup

- **Twilio** (recommended): Create free sandbox at twilio.com → Messaging → WhatsApp Sandbox
- **CallMeBot** (free): Visit callmebot.com/blog/free-whatsapp-api and activate your number first
