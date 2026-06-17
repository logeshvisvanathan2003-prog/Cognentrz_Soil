// ─────────────────────────────────────────────────────────────────────────────
// Cognentrz WhatsApp sender
// Sends a professional PDF report as a WhatsApp document via Twilio.
// Falls back to a rich text message when no public URL is available (local dev).
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppReportPayload {
  toPhone: string;
  farmName: string;
  userName: string;
  soilHealthScore: number;
  trend: string;
  analysisId: string;     // used to build the public PDF URL
  lang?: string;
}

// ── Build the accompanying text caption ──────────────────────────────────────
function buildCaption(p: WhatsAppReportPayload): string {
  const score = p.soilHealthScore;
  const emoji = score >= 70 ? '✅' : score >= 50 ? '⚠️' : '🚨';
  const label = score >= 70 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs Attention';

  return [
    `🌾 *COGNENTRZ SOIL REPORT*`,
    `━━━━━━━━━━━━━━━━━`,
    `Hi *${p.userName}*! Your soil analysis for *${p.farmName}* is ready.`,
    ``,
    `${emoji} *Soil Health: ${score}/100* — _${label}_`,
    `${score >= 70 ? '📈' : score >= 50 ? '➡️' : '📉'} Trend: ${p.trend}`,
    ``,
    `📄 Your full professional PDF report is attached above.`,
    `It includes satellite readings, nutrient data, and AI recommendations.`,
    ``,
    `_Powered by Cognentrz · Google Earth Engine_`,
    `_Reply STOP to disable alerts_`,
  ].join('\n');
}

// ── Build rich text fallback (when PDF URL not available in local dev) ────────
function buildTextFallback(p: WhatsAppReportPayload): string {
  const score = p.soilHealthScore;
  const emoji = score >= 70 ? '✅' : score >= 50 ? '⚠️' : '🚨';
  const label = score >= 70 ? 'Healthy' : score >= 50 ? 'Fair' : 'Needs Attention';

  return [
    `🌾 *COGNENTRZ SOIL ANALYSIS*`,
    `━━━━━━━━━━━━━━━━━`,
    `Hi *${p.userName}*, analysis complete for *${p.farmName}*!`,
    ``,
    `${emoji} *Soil Health: ${score}/100* — _${label}_`,
    `${score >= 70 ? '📈' : '➡️'} Trend: ${p.trend}`,
    ``,
    `_PDF report available in the Cognentrz app._`,
    `_Powered by Google Earth Engine_`,
    `_Reply STOP to disable_`,
  ].join('\n');
}

// ── Get public app URL (for PDF link) ────────────────────────────────────────
function getAppUrl(): string | null {
  const url =
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL   ||
    process.env.APP_URL      ||
    '';
  if (!url) return null;
  const base = url.startsWith('http') ? url : `https://${url}`;
  return base.replace(/\/$/, '');
}

// ── Main send function ────────────────────────────────────────────────────────
export async function sendWhatsAppReport(
  payload: WhatsAppReportPayload
): Promise<{ ok: boolean; provider?: string; error?: string }> {
  let phone = (payload.toPhone || '').trim().replace(/[^\d+]/g, '');
  if (!phone) return { ok: false, error: 'no phone number' };
  if (!phone.startsWith('+')) phone = '+' + phone;

  const sid    = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM  || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY      || '').trim();

  const appUrl  = getAppUrl();
  const pdfUrl  = appUrl
    ? `${appUrl}/api/reports/pdf/${payload.analysisId}`
    : null;

  console.log('[whatsapp] providers =', { twilio: !!(sid && token && from), callmebot: !!cmbKey, pdfUrl, to: phone });

  try {
    // ── Twilio (sends PDF as document) ───────────────────────────────────────
    if (sid && token && from) {
      const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const caption  = buildCaption(payload);

      const bodyParams: Record<string, string> = {
        To:   `whatsapp:${phone}`,
        From: fromAddr,
        Body: caption,
      };

      // Attach PDF if we have a public URL
      if (pdfUrl) {
        bodyParams['MediaUrl0'] = pdfUrl;
      }

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
        return { ok: false, error: data.message || 'Twilio error' };
      }

      console.log('[whatsapp] ✅ Sent via Twilio, SID:', data.sid, pdfUrl ? '(with PDF)' : '(text only)');
      return { ok: true, provider: pdfUrl ? 'twilio-pdf' : 'twilio-text' };
    }

    // ── CallMeBot fallback (text only — no media support) ────────────────────
    if (cmbKey) {
      const message = buildTextFallback(payload);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`;
      const r   = await fetch(url);
      const txt = await r.text();
      if (r.ok && /queued|sent|Message to/i.test(txt)) return { ok: true, provider: 'callmebot' };
      return { ok: false, error: txt.slice(0, 120) };
    }

    console.warn('[whatsapp] No provider configured → demo mode');
    return { ok: false, error: 'no provider configured' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Legacy plain text sender (kept for compatibility) ────────────────────────
export async function sendWhatsApp(
  toRaw: string,
  message: string
): Promise<{ ok: boolean; provider?: string; error?: string }> {
  let phone = (toRaw || '').trim().replace(/[^\d+]/g, '');
  if (!phone) return { ok: false, error: 'no number' };
  if (!phone.startsWith('+')) phone = '+' + phone;

  const sid    = (process.env.TWILIO_ACCOUNT_SID  || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN    || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY     || '').trim();

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
      if (!res.ok) return { ok: false, error: data.message || 'Twilio error' };
      return { ok: true, provider: 'twilio' };
    }
    if (cmbKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`;
      const r   = await fetch(url);
      const txt = await r.text();
      if (r.ok && /queued|sent|Message to/i.test(txt)) return { ok: true, provider: 'callmebot' };
      return { ok: false, error: txt.slice(0, 120) };
    }
    return { ok: false, error: 'no provider configured' };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// ── Translate helper ─────────────────────────────────────────────────────────
export async function translateText(text: string, target: string): Promise<string> {
  if (!target || target === 'en') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const r   = await fetch(url);
    const j   = await r.json();
    return j[0].map((s: any) => s[0]).join('');
  } catch { return text; }
}

// Keep buildRichReport for legacy use
export function buildRichReport(data: any): string {
  return buildTextFallback({
    toPhone:         '',
    farmName:        data.farmName,
    userName:        'Farmer',
    soilHealthScore: data.soilHealthScore,
    trend:           data.trend,
    analysisId:      '',
  });
}
