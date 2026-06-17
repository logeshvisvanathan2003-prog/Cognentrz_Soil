import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

// Normalize Indian phone numbers:
// 9876543210    → +919876543210
// 919876543210  → +919876543210
// +919876543210 → +919876543210
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, ''); // strip non-digits
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (raw.startsWith('+')) return raw.trim();
  return `+${digits}`;
}

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
    const normalizedPhone = normalizePhone(phone);

    console.log(`[register] ${email} phone: ${phone} → ${normalizedPhone}`);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, location, whatsapp_number, whatsapp_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, name, email, created_at`,
      [name, email, passwordHash, normalizedPhone, location || null, normalizedPhone]
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