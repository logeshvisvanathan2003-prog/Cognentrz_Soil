import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const farmId = req.nextUrl.searchParams.get('farmId');

  try {
    let sql = `
      SELECT r.*, f.name as farm_name 
      FROM recommendations r 
      JOIN farms f ON f.id = r.farm_id 
      WHERE f.user_id = $1
    `;
    const params: any[] = [user.userId];

    if (farmId) {
      sql += ' AND r.farm_id = $2';
      params.push(farmId);
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 50';

    const result = await query(sql, params);
    return NextResponse.json({ recommendations: result.rows });
  } catch (err) {
    console.error('Get recommendations error:', err);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  
  try {
    await query(
      `UPDATE recommendations r SET is_read = true 
       FROM farms f WHERE r.id = $1 AND r.farm_id = f.id AND f.user_id = $2`,
      [id, user.userId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
