import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const farmId = req.nextUrl.searchParams.get('farmId');
  if (!farmId) return NextResponse.json({ error: 'farmId required' }, { status: 400 });

  try {
    const result = await query(
      `SELECT p.* FROM predictions p
       JOIN farms f ON f.id = p.farm_id
       WHERE p.farm_id = $1 AND f.user_id = $2
       ORDER BY p.predicted_for ASC`,
      [farmId, user.userId]
    );
    return NextResponse.json({ predictions: result.rows });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
  }
}
