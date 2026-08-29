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

    const submissions = await db.submission.findMany({
      include: {
        project: true,
        submittedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format output
    const formatted = submissions.map((sub) => ({
      id: sub.id,
      contractNo: sub.project ? sub.project.contractNo : 'N/A',
      partNo: sub.project ? sub.project.partNo : 'N/A',
      partDescription: sub.project ? sub.project.partDescription : 'N/A',
      submittedBy: sub.submittedBy ? sub.submittedBy.name : 'Unknown',
      estimatedDate: sub.project ? sub.project.estimatedDate : sub.createdAt,
      remarks: sub.remarks,
      completionDate: sub.createdAt,
      isFinal: sub.isFinal,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const sub = await db.submission.findUnique({
      where: { id: Number(id) },
    });

    if (!sub) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    await db.submission.delete({
      where: { id: Number(id) },
    });

    if (sub.isFinal) {
      await db.project.delete({
        where: { id: sub.projectId },
      }).catch(() => {});
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
