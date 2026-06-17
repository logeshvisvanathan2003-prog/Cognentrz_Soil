# Cognentrz APK Build Guide

## How it works

The APK is a native Android shell (Capacitor) that loads your deployed Vercel app.
All API calls, PDF generation, and WhatsApp alerts run on Vercel — not on the phone.

```
Phone (APK)  →  Opens WebView  →  Loads https://cognentrz.vercel.app
                                   ↓
                              Vercel handles all logic
                                   ↓
                         WhatsApp PDF sent to user's phone
```

---

## Step 1 — Deploy to Vercel FIRST (required)

```bash
npm i -g vercel
vercel
```

Copy your deployment URL (e.g. `https://cognentrz-abc123.vercel.app`)

---

## Step 2 — Update Vercel URL in capacitor.config.ts

Open `capacitor.config.ts` and replace:
```ts
url: 'https://cognentrz.vercel.app',
```
with your actual URL:
```ts
url: 'https://cognentrz-abc123.vercel.app',
```

---

## Step 3 — Build APK (choose one method)

### Method A — GitHub Actions (Easiest, no setup needed) ✅

1. Create a GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/cognentrz.git
   git push -u origin main
   ```
3. Go to GitHub → Actions tab → "Build Cognentrz APK" → it builds automatically
4. Download `Cognentrz-APK` from the artifacts section
5. Or download from the GitHub Release created automatically

### Method B — Build locally with Android Studio

**Requirements:** Android Studio, Java 17, Android SDK

```bash
# 1. Sync Capacitor
npm run cap:sync

# 2. Open in Android Studio
npm run cap:open

# 3. In Android Studio:
#    Build → Build Bundle(s)/APK(s) → Build APK(s)
#    APK saved to: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 4 — Install APK on Android phone

1. Transfer `Cognentrz-v1.0.apk` to your phone (WhatsApp, USB, Google Drive)
2. On phone: **Settings → Security → Install Unknown Apps → Allow**
3. Open the APK file → tap **Install**
4. Open **Cognentrz** from home screen
5. Register/Login → everything works!

---

## Adding Vercel env variable for PDF WhatsApp

In Vercel Dashboard → Settings → Environment Variables:
```
NEXTAUTH_URL = https://cognentrz-abc123.vercel.app
```

This makes the PDF link in WhatsApp work automatically.

---

## App features in APK
- ✅ Full soil analysis with satellite data
- ✅ WhatsApp PDF report (via Twilio)
- ✅ Multi-language (Tamil, Hindi, Telugu, etc.)
- ✅ GPS location for farms
- ✅ Maps (OpenStreetMap)
- ✅ AI recommendations
- ✅ Dark/light theme
- ✅ Works offline (shows cached data)

---

## Admin account
Register with `logesh.visvanathan2003@gmail.com` → free Pro access automatically.
