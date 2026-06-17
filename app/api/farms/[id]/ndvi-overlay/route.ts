import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';
import { getNDVIMapOverlay } from '@/lib/earth-engine';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const farmResult = await query(
      'SELECT boundary FROM farms WHERE id = $1 AND user_id = $2',
      [params.id, user.userId]
    );

    if (farmResult.rows.length === 0) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const boundary = typeof farmResult.rows[0].boundary === 'string'
      ? JSON.parse(farmResult.rows[0].boundary)
      : farmResult.rows[0].boundary;

    const overlay = await getNDVIMapOverlay(boundary);

    if (!overlay) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true, ...overlay });
  } catch (err: any) {
    console.error('NDVI overlay error:', err);
    return NextResponse.json({ available: false, error: err.message }, { status: 500 });
  }
}
