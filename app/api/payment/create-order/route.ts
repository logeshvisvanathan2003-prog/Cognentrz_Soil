import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import crypto from 'crypto';
import { PLANS, ADMIN_EMAIL } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { plan } = await req.json();
    const selected = PLANS[plan];
    if (!selected) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    // ── Admin bypass: the admin account is upgraded for free, no payment. ──
    if (user.email?.toLowerCase() === ADMIN_EMAIL) {
      await query('UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2', ['pro', user.userId]);
      return NextResponse.json({ adminFree: true, tier: 'pro' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Demo fallback if no keys configured (testable without live Razorpay)
    if (!keyId || !keySecret) {
      return NextResponse.json({
        demo: true,
        orderId: 'order_demo_' + crypto.randomBytes(6).toString('hex'),
        amount: selected.amount, currency: 'INR', keyId: 'rzp_test_demo',
        plan, label: selected.label, tier: selected.tier,
      });
    }

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: selected.amount, currency: 'INR',
        receipt: `rcpt_${user.userId.slice(0, 8)}_${Date.now()}`,
        notes: { userId: user.userId, plan },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: 'Razorpay order failed: ' + t.slice(0, 200) }, { status: 502 });
    }
    const order = await res.json();
    return NextResponse.json({
      demo: false, orderId: order.id, amount: order.amount, currency: order.currency,
      keyId, plan, label: selected.label, tier: selected.tier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
