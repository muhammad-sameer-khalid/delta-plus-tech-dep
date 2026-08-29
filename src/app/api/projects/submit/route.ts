import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, remarks, isFinal } = await request.json();

    if (!projectId || !remarks) {
      return NextResponse.json({ error: 'Project and remarks are required' }, { status: 400 });
    }

    const submission = await db.submission.create({
      data: {
        projectId: Number(projectId),
        submittedById: Number(userId),
        remarks,
        isFinal: Boolean(isFinal),
      },
    });

    if (isFinal) {
      await db.project.update({
        where: { id: Number(projectId) },
        data: { status: 'Completed' },
      });
    }

    return NextResponse.json({ message: 'Task submitted successfully', submission });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
