import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      'SELECT * FROM farms WHERE id = $1 AND user_id = $2',
      [params.id, user.userId]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ farm: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, description, locationName, cropType, soilType, irrigationType } = await req.json();
    const result = await query(
      `UPDATE farms SET name=$1, description=$2, location_name=$3, crop_type=$4, soil_type=$5, irrigation_type=$6, updated_at=NOW()
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, description, locationName, cropType, soilType, irrigationType, params.id, user.userId]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ farm: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = authenticateRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await query('DELETE FROM farms WHERE id=$1 AND user_id=$2', [params.id, user.userId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
