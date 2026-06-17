import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      `SELECT a.*, f.name as farm_name
       FROM alerts a
       LEFT JOIN farms f ON f.id = a.farm_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [user.userId]
    );
    return NextResponse.json({ alerts: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, alerts: [] }, { status: 500 });
  }
}
