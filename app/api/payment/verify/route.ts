import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { PLANS } from '@/lib/plans';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, demo, plan } = await req.json();
    const tier = PLANS[plan]?.tier || 'pro';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (demo || !keySecret) {
      await query('UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2', [tier, user.userId]);
      return NextResponse.json({ success: true, demo: true, tier });
    }

    const expected = crypto.createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
    }

    await query('UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2', [tier, user.userId]);
    return NextResponse.json({ success: true, tier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
