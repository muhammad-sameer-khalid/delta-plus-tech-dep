import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const reqRoles = headersList.get('x-user-roles') || '';
    
    if (!reqRoles.includes('Supervisor') && !reqRoles.includes('Co-Supervisor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { email: cleanEmail },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
