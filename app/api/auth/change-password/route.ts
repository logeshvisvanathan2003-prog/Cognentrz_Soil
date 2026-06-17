import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest, comparePassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [user.userId]);
    if (!result.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, user.userId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
