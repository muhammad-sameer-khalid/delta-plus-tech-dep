import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const reqRoles = headersList.get('x-user-roles') || '';

    if (!reqRoles.includes('Supervisor') && !reqRoles.includes('Co-Supervisor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, newName } = await request.json();

    if (!email || !newName) {
      return NextResponse.json(
        { error: 'Both account email and new name are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = newName.trim();

    if (!cleanName) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!existingUser) {
      return NextResponse.json({ error: `Account with email "${cleanEmail}" was not found` }, { status: 404 });
    }

    const oldName = existingUser.name;
    const updatedUser = await db.user.update({
      where: { email: cleanEmail },
      data: { name: cleanName },
    });

    return NextResponse.json({
      message: `Account name for ${cleanEmail} updated from "${oldName}" to "${cleanName}" successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles,
      },
    });
  } catch (error) {
    console.error('Error updating account name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
