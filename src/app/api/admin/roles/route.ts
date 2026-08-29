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

    const { email, name, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.trim();

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      // Split existing roles
      let currentRoles = existingUser.roles
        ? existingUser.roles.split(',').map((r) => r.trim()).filter(Boolean)
        : [];

      if (currentRoles.includes(cleanRole)) {
        // Remove role
        currentRoles = currentRoles.filter((r) => r !== cleanRole);

        if (currentRoles.length === 0) {
          // If no roles left, delete account
          await db.user.delete({
            where: { email: cleanEmail },
          });
          return NextResponse.json({ message: 'Role removed and account deleted because no roles remain' });
        } else {
          // Update roles
          const updatedUser = await db.user.update({
            where: { email: cleanEmail },
            data: {
              roles: currentRoles.join(','),
              name: name ? name.trim() : existingUser.name,
            },
          });
          return NextResponse.json({ message: 'Role removed from account', user: updatedUser });
        }
      } else {
        // Add role
        currentRoles.push(cleanRole);
        const updatedUser = await db.user.update({
          where: { email: cleanEmail },
          data: {
            roles: currentRoles.join(','),
            name: name ? name.trim() : existingUser.name,
          },
        });
        return NextResponse.json({ message: 'Role added to account', user: updatedUser });
      }
    } else {
      // New account creation with default password 'password1122'
      const defaultPasswordHash = await hashPassword('password1122');
      const newUser = await db.user.create({
        data: {
          email: cleanEmail,
          name: name ? name.trim() : cleanEmail.split('@')[0],
          roles: cleanRole,
          password: defaultPasswordHash,
        },
      });
      return NextResponse.json({ message: 'New account created with role', user: newUser });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
