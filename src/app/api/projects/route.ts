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

    const projects = await db.project.findMany({
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

    const formatted = projects.map((p) => ({
      id: p.id,
      contractNo: p.contractNo,
      partNo: p.partNo,
      partDescription: p.partDescription,
      estimatedDate: p.estimatedDate,
      remarks: p.remarks,
      status: p.status,
      assignedToId: p.assignedToId,
      assignedTo: p.assignedTo ? p.assignedTo.name : 'Unassigned',
      assignedToEmail: p.assignedTo ? p.assignedTo.email : '',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching all projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const targetDate = new Date(estimatedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      return NextResponse.json({ error: 'Estimated date cannot be before today' }, { status: 400 });
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

export async function PUT(request: Request) {
  try {
    const headersList = await headers();
    const reqRoles = headersList.get('x-user-roles') || '';

    if (!reqRoles.includes('Supervisor') && !reqRoles.includes('Co-Supervisor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, contractNo, partNo, partDescription, estimatedDate, remarks, assignedToId, status } =
      await request.json();

    if (!id || !contractNo || !partNo || !partDescription || !estimatedDate || !assignedToId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await db.project.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updated = await db.project.update({
      where: { id: Number(id) },
      data: {
        contractNo,
        partNo,
        partDescription,
        estimatedDate: new Date(estimatedDate),
        remarks: remarks || '',
        assignedToId: Number(assignedToId),
        status: status || existing.status,
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
    });

    // If assigned user changed, send notification to new assignee
    if (existing.assignedToId !== Number(assignedToId)) {
      await db.notification.create({
        data: {
          userId: Number(assignedToId),
          message: `Project (Contract No: ${contractNo}) has been reassigned to you`,
        },
      });
    }

    return NextResponse.json({ message: 'Project updated successfully', project: updated });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
