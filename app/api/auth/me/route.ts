import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      'SELECT id, name, email, phone, location, avatar_url, subscription_tier FROM users WHERE id = $1',
      [user.userId]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const u = result.rows[0];
    return NextResponse.json({
      id: u.id, name: u.name, email: u.email, phone: u.phone,
      location: u.location, avatarUrl: u.avatar_url, subscriptionTier: u.subscription_tier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
