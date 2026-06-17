import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await query('SELECT whatsapp_number, whatsapp_enabled, preferred_language, phone FROM users WHERE id = $1', [user.userId]);
  const u = r.rows[0] || {};
  return NextResponse.json({
    whatsappNumber: u.whatsapp_number || u.phone || '',
    whatsappEnabled: u.whatsapp_enabled !== false,
    language: u.preferred_language || 'en',
  });
}

export async function PUT(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { whatsappNumber, whatsappEnabled, language } = await req.json();
    await query(
      `UPDATE users SET
        whatsapp_number = COALESCE($1, whatsapp_number),
        whatsapp_enabled = COALESCE($2, whatsapp_enabled),
        preferred_language = COALESCE($3, preferred_language),
        updated_at = NOW()
       WHERE id = $4`,
      [whatsappNumber ?? null, whatsappEnabled ?? null, language ?? null, user.userId]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
