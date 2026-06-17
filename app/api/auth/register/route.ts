import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, location } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, location, whatsapp_number, whatsapp_enabled) 
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, name, email, created_at`,
      [name, email, passwordHash, phone || null, location || null, phone || null]
    );

    const user = result.rows[0];
    const token = generateToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
