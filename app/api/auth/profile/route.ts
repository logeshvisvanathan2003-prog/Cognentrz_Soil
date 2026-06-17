import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email, phone } = await req.json();
    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, phone`,
      [name || null, email || null, phone || null, user.userId]
    );
    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
