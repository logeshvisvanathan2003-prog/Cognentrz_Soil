// ─────────────────────────────────────────────────────────────────────────────
// Cognentrz SMS Alerts — Fast2SMS (Indian provider)
// Works for ALL Indian mobile numbers, no activation needed.
// Free credits on signup at fast2sms.com
// ─────────────────────────────────────────────────────────────────────────────

export interface SMSReportPayload {
  toPhone: string;
  farmName: string;
  userName: string;
  soilHealthScore: number;
  trend: string;
  analysisId: string;
}

// Strip to 10-digit Indian number for Fast2SMS
function toTenDigit(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return null;
}

export async function sendSMSReport(payload: SMSReportPayload): Promise<{ ok: boolean; error?: string }> {
  const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
  if (!apiKey) return { ok: false, error: 'FAST2SMS_API_KEY not set' };

  const number = toTenDigit(payload.toPhone);
  if (!number) return { ok: false, error: 'invalid phone number' };

  const score = payload.soilHealthScore;
  const status = score >= 70 ? 'HEALTHY' : score >= 50 ? 'FAIR' : 'NEEDS ATTENTION';

  const appUrl = (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  ).replace(/\/$/, '');

  const pdfLink = appUrl ? `${appUrl}/api/reports/pdf/${payload.analysisId}` : '';

  // Keep SMS under 160 chars for single SMS
  const message = `Cognentrz: ${payload.farmName} soil health ${score}/100 (${status}). Trend: ${payload.trend}. ${pdfLink ? `Report: ${pdfLink}` : ''}`.slice(0, 500);

  console.log('[sms] Sending to', number, '| msg length:', message.length);

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',              // Quick SMS route (transactional)
        message,
        language: 'english',
        flash: 0,
        numbers: number,
      }),
    });

    const data = await res.json();
    console.log('[sms] Fast2SMS response:', data);

    if (data.return === true) {
      console.log('[sms] ✅ SMS sent to', number);
      return { ok: true };
    }
    return { ok: false, error: data.message || 'SMS failed' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function sendWelcomeSMS(phone: string, name: string): Promise<void> {
  const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
  if (!apiKey) return;

  const number = toTenDigit(phone);
  if (!number) return;

  const message = `Welcome to Cognentrz, ${name}! You will receive soil analysis reports on this number after each field scan. - Cognentrz Soil Intelligence`;

  try {
    await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: 'q', message, language: 'english', flash: 0, numbers: number }),
    });
    console.log('[sms] Welcome SMS sent to', number);
  } catch (e) {
    console.warn('[sms] Welcome SMS failed:', e);
  }
}