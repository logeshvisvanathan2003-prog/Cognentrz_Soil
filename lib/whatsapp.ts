// ─────────────────────────────────────────────────────────────────────────────
// Cognentrz WhatsApp — professional PDF report sender
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

// ── Get stable production URL for PDF link ────────────────────────────────
function getAppUrl(): string {
  return (
    process.env.NEXTAUTH_URL                                          ||
    process.env.APP_URL                                               ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')  ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : '')                     ||
    ''
  ).replace(/\/$/, '');
}

// ── Normalize Indian phone → E.164 ───────────────────────────────────────
export function normalizePhone(raw: string): string {
  let p = (raw || '').trim().replace(/[^\d+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.length === 10) return `+91${p}`;
  if (p.length === 12 && p.startsWith('91')) return `+${p}`;
  if (p.length === 11 && p.startsWith('0')) return `+91${p.slice(1)}`;
  return `+${p}`;
}

// ── Build WhatsApp caption ────────────────────────────────────────────────
function buildCaption(p: WhatsAppReportPayload): string {
  const s = p.soilHealthScore;
  const emoji = s >= 70 ? '✅' : s >= 50 ? '⚠️' : '🚨';
  const label = s >= 70 ? 'Healthy' : s >= 50 ? 'Fair' : 'Needs Attention';
  return [
    `🌾 *COGNENTRZ SOIL REPORT*`,
    `━━━━━━━━━━━━━━━━━`,
    `Hi *${p.userName}*! Analysis for *${p.farmName}* is ready.`,
    ``,
    `${emoji} *Soil Health: ${s}/100* — _${label}_`,
    `${s >= 70 ? '📈' : s >= 50 ? '➡️' : '📉'} Trend: ${p.trend}`,
    ``,
    `📄 Your full professional PDF report is attached.`,
    `Includes satellite data, nutrients & AI recommendations.`,
    ``,
    `_Powered by Cognentrz · Google Earth Engine_`,
  ].join('\n');
}

// ── Send report via Twilio or CallMeBot ──────────────────────────────────
export async function sendWhatsAppReport(
  payload: WhatsAppReportPayload
): Promise<{ ok: boolean; provider?: string; error?: string }> {

  if (!payload.toPhone) return { ok: false, error: 'no phone number' };
  const phone  = normalizePhone(payload.toPhone);
  if (!phone)  return { ok: false, error: 'invalid phone number' };

  const sid    = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM  || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY      || '').trim();

  const appUrl = getAppUrl();
  const pdfUrl = appUrl ? `${appUrl}/api/reports/pdf/${payload.analysisId}` : null;

  console.log('[whatsapp] to:', phone, '| appUrl:', appUrl, '| pdfUrl:', pdfUrl);

  try {
    // ── Twilio ──────────────────────────────────────────────────────────
    if (sid && token && from) {
      const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const params: Record<string, string> = {
        To:   `whatsapp:${phone}`,
        From: fromAddr,
        Body: buildCaption(payload),
      };
      if (pdfUrl) params['MediaUrl0'] = pdfUrl;

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(params).toString(),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error('[whatsapp] Twilio error:', data.code, data.message);
        return { ok: false, error: `Twilio: ${data.message}` };
      }
      console.log('[whatsapp] ✅ Twilio sent', pdfUrl ? '(PDF+text)' : '(text only)', '→', phone);
      return { ok: true, provider: pdfUrl ? 'twilio-pdf' : 'twilio-text' };
    }

    // ── CallMeBot ────────────────────────────────────────────────────────
    if (cmbKey) {
      const msg = buildCaption(payload);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(msg)}&apikey=${cmbKey}`;
      const r   = await fetch(url);
      const txt = await r.text();
      if (r.ok && /queued|sent|Message/i.test(txt)) return { ok: true, provider: 'callmebot' };
      return { ok: false, error: txt.slice(0, 120) };
    }

    return { ok: false, error: 'no provider configured' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Send welcome message to new user on registration ─────────────────────
export async function sendWelcomeWhatsApp(
  phone: string,
  name: string
): Promise<void> {
  const sid   = (process.env.TWILIO_ACCOUNT_SID  || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN    || '').trim();
  const from  = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
  if (!sid || !token || !from) return;

  const normalized = normalizePhone(phone);
  if (!normalized) return;

  const message = [
    `🌾 *Welcome to Cognentrz, ${name}!*`,
    ``,
    `You'll receive soil analysis reports here after each scan.`,
    ``,
    `_Cognentrz · Soil Intelligence Platform_`,
  ].join('\n');

  try {
    const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To:   `whatsapp:${normalized}`,
          From: fromAddr,
          Body: message,
        }).toString(),
      }
    );
    console.log('[whatsapp] Welcome sent to', normalized);
  } catch (e) {
    console.warn('[whatsapp] Welcome send failed:', e);
  }
}

// ── Legacy compat ─────────────────────────────────────────────────────────
export async function sendWhatsApp(
  toRaw: string, message: string
): Promise<{ ok: boolean; provider?: string; error?: string }> {
  const phone  = normalizePhone(toRaw);
  const sid    = (process.env.TWILIO_ACCOUNT_SID   || '').trim();
  const token  = (process.env.TWILIO_AUTH_TOKEN     || '').trim();
  const from   = (process.env.TWILIO_WHATSAPP_FROM  || '').trim();
  const cmbKey = (process.env.CALLMEBOT_APIKEY      || '').trim();
  try {
    if (sid && token && from) {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${phone}`,
            From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
            Body: message,
          }).toString(),
        }
      );
      const d = await res.json();
      if (!res.ok) return { ok: false, error: d.message };
      return { ok: true, provider: 'twilio' };
    }
    if (cmbKey) {
      const r = await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`);
      const t = await r.text();
      if (r.ok && /queued|sent|Message/i.test(t)) return { ok: true, provider: 'callmebot' };
    }
    return { ok: false, error: 'no provider' };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export async function translateText(text: string, target: string): Promise<string> {
  if (!target || target === 'en') return text;
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`);
    const j = await r.json();
    return j[0].map((s: any) => s[0]).join('');
  } catch { return text; }
}

export function buildRichReport(data: any): string {
  return buildCaption({ toPhone: '', farmName: data.farmName, userName: 'Farmer', soilHealthScore: data.soilHealthScore, trend: data.trend, analysisId: '' });
}