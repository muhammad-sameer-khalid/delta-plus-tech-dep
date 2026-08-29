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
      contractNo: sub.project.contractNo,
      partNo: sub.project.partNo,
      partDescription: sub.project.partDescription,
      submittedBy: sub.submittedBy.name,
      estimatedDate: sub.project.estimatedDate,
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
