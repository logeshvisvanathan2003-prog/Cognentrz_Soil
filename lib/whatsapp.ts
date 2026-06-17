// ─────────────────────────────────────────────────────────────────────────────
// Cognentrz WhatsApp — sends professional PDF report to every user
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppReportPayload {
  toPhone: string;
  farmName: string;
  userName: string;
  soilHealthScore: number;
  trend: string;
  analysisId: string;
  lang?: string;
}

// ── Get public app base URL ────────────────────────────────────────────────
function getAppUrl(): string {
  // Try multiple env vars — Vercel sets VERCEL_URL automatically
  const url =
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    '';
  return url.replace(/\/$/, '');
}

// ── Format caption text ────────────────────────────────────────────────────
function buildCaption(p: WhatsAppReportPayload): string {
  const score = p.soilHealthScore;
  const emoji = score >= 70 ? '✅' : score >= 50 ? '⚠️' : '🚨';
  const label = score >= 70 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs Attention';

  return [
    `🌾 *COGNENTRZ SOIL REPORT*`,
    `━━━━━━━━━━━━━━━━━`,
    `Hi *${p.userName}*! Analysis for *${p.farmName}* is ready.`,
    ``,
    `${emoji} *Soil Health: ${score}/100* — _${label}_`,
    `${score >= 70 ? '📈' : '➡️'} Trend: ${p.trend}`,
    ``,
    `📄 Your full PDF report is attached.`,
    `It includes satellite data, nutrients & AI recommendations.`,
    ``,
    `_Powered by Cognentrz · Google Earth Engine_`,
  ].join('\n');
}

// ── Normalize phone number ─────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/[^\d+]/g, '');
  if (!phone.startsWith('+')) {
    if (phone.length === 10) phone = `+91${phone}`;
    else if (phone.length === 12 && phone.startsWith('91')) phone = `+${phone}`;
    else phone = `+${phone}`;
  }
  return phone;
}

// ── Main send function ─────────────────────────────────────────────────────
export async function sendWhatsAppReport(
  payload: WhatsAppReportPayload
): Promise<{ ok: boolean; provider?: string; error?: string }> {

  if (!payload.toPhone) return { ok: false, error: 'no phone number' };
  const phone = normalizePhone(payload.toPhone);

  const sid    = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM  || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY      || '').trim();

  const appUrl = getAppUrl();
  const pdfUrl = appUrl ? `${appUrl}/api/reports/pdf/${payload.analysisId}` : null;

  console.log('[whatsapp] sending to:', phone, '| pdf:', pdfUrl || 'none');

  try {
    // ── Twilio ──────────────────────────────────────────────────────────────
    if (sid && token && from) {
      const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const caption  = buildCaption(payload);

      const bodyParams: Record<string, string> = {
        To:   `whatsapp:${phone}`,
        From: fromAddr,
        Body: caption,
      };

      // Attach PDF if public URL is available
      if (pdfUrl) bodyParams['MediaUrl0'] = pdfUrl;

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(bodyParams).toString(),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error('[whatsapp] Twilio error:', data);
        return { ok: false, error: data.message || 'Twilio send failed' };
      }

      console.log('[whatsapp] ✅ Sent via Twilio', pdfUrl ? '(with PDF)' : '(text only)', '→', phone);
      return { ok: true, provider: pdfUrl ? 'twilio-pdf' : 'twilio-text' };
    }

    // ── CallMeBot (text only fallback) ───────────────────────────────────────
    if (cmbKey) {
      const message = buildCaption(payload);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`;
      const r   = await fetch(url);
      const txt = await r.text();
      if (r.ok && /queued|sent|Message/i.test(txt)) return { ok: true, provider: 'callmebot' };
      return { ok: false, error: txt.slice(0, 120) };
    }

    console.warn('[whatsapp] No provider configured');
    return { ok: false, error: 'no provider configured' };

  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Legacy plain text sender (backward compat) ─────────────────────────────
export async function sendWhatsApp(
  toRaw: string,
  message: string
): Promise<{ ok: boolean; provider?: string; error?: string }> {
  if (!toRaw) return { ok: false, error: 'no number' };
  const phone = normalizePhone(toRaw);

  const sid    = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM  || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY      || '').trim();

  try {
    if (sid && token && from) {
      const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization:  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: `whatsapp:${phone}`, From: fromAddr, Body: message }).toString(),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.message };
      return { ok: true, provider: 'twilio' };
    }
    if (cmbKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`;
      const r   = await fetch(url);
      const txt = await r.text();
      if (r.ok && /queued|sent|Message/i.test(txt)) return { ok: true, provider: 'callmebot' };
      return { ok: false, error: txt.slice(0, 120) };
    }
    return { ok: false, error: 'no provider' };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function translateText(text: string, target: string): Promise<string> {
  if (!target || target === 'en') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const r   = await fetch(url);
    const j   = await r.json();
    return j[0].map((s: any) => s[0]).join('');
  } catch { return text; }
}

export function buildRichReport(data: any): string {
  return buildCaption({
    toPhone: '', farmName: data.farmName, userName: 'Farmer',
    soilHealthScore: data.soilHealthScore, trend: data.trend, analysisId: '',
  });
}