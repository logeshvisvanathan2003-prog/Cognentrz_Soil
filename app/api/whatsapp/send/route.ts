import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { to, message } = await req.json();
    if (!to || !message) return NextResponse.json({ error: 'to and message required' }, { status: 400 });

    // normalise number: keep leading +, strip spaces/dashes
    let phone = to.trim().replace(/[^\d+]/g, '');
    if (!phone.startsWith('+')) phone = '+' + phone;

    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const from = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
    const cmbKey = (process.env.CALLMEBOT_APIKEY || '').trim();

    console.log('[whatsapp] providers →', { twilio: !!(sid && token && from), callmebot: !!cmbKey, to: phone });

    // ── Provider 1: Twilio (preferred when configured) ──
    if (sid && token && from) {
      const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
      const body = new URLSearchParams({ To: `whatsapp:${phone}`, From: fromAddr, Body: message });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await res.json();
      console.log('[whatsapp][twilio] →', JSON.stringify({ http: res.status, status: data.status, sid: data.sid, code: data.code, error: data.message }));
      if (!res.ok) {
        return NextResponse.json({ error: data.message || 'Twilio error', code: data.code, moreInfo: data.more_info }, { status: 502 });
      }
      return NextResponse.json({ success: true, provider: 'twilio', sid: data.sid, status: data.status });
    }

    // ── Provider 2: CallMeBot ──
    if (cmbKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${cmbKey}`;
      const r = await fetch(url);
      const txt = await r.text();
      console.log('[whatsapp][callmebot] →', txt.slice(0, 160));
      if (r.ok && /queued|sent|Message to/i.test(txt)) return NextResponse.json({ success: true, provider: 'callmebot' });
      return NextResponse.json({ error: 'CallMeBot: ' + txt.slice(0, 160) }, { status: 502 });
    }

    // ── Demo fallback ──
    console.log('[whatsapp] no provider configured → demo mode');
    return NextResponse.json({ demo: true, queued: true, to: phone, preview: message });
  } catch (err: any) {
    console.error('[whatsapp] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
