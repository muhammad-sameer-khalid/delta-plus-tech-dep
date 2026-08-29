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

    const { contractNo, partNo, partDescription, estimatedDate, remarks, assignedToId } =
      await request.json();

    if (!contractNo || !partNo || !partDescription || !estimatedDate || !assignedToId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        contractNo,
        partNo,
        partDescription,
        estimatedDate: new Date(estimatedDate),
        remarks: remarks || '',
        assignedToId: Number(assignedToId),
        status: 'Due',
      },
    });

    // Create notification for assigned user
    await db.notification.create({
      data: {
        userId: Number(assignedToId),
        message: `You have been assigned a new project (Contract No: ${contractNo})`,
      },
    });

    return NextResponse.json({ message: 'Project assigned successfully', project });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
