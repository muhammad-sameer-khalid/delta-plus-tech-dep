import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const reqRoles = headersList.get('x-user-roles') || '';
    
    if (!reqRoles.includes('Supervisor') && !reqRoles.includes('Co-Supervisor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
      },
    });

    // Filter users who have Executant or Co-Supervisor role
    const filtered = users.filter(
      (u) => u.roles.includes('Executant') || u.roles.includes('Co-Supervisor')
    );

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
