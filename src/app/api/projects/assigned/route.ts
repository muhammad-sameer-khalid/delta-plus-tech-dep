import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const reqRoles = headersList.get('x-user-roles') || '';

    if (
      !reqRoles.includes('Supervisor') &&
      !reqRoles.includes('Co-Supervisor') &&
      !reqRoles.includes('Director')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all projects that are assigned and not completed yet
    const assignedTasks = await db.project.findMany({
      where: {
        NOT: {
          status: 'Completed',
        },
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const formatted = assignedTasks.map((p) => ({
      id: p.id,
      contractNo: p.contractNo,
      partNo: p.partNo,
      partDescription: p.partDescription,
      estimatedDate: p.estimatedDate,
      remarks: p.remarks,
      status: p.status,
      assignedTo: p.assignedTo ? p.assignedTo.name : 'Unassigned',
      assignedToEmail: p.assignedTo ? p.assignedTo.email : '',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
