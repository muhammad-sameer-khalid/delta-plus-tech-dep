import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET(request: Request) {
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
    const action = searchParams.get('action');
    const userIdParam = searchParams.get('userId');

    // Return list of all users if action === 'users' or userId not provided
    if (action === 'users' || !userIdParam) {
      const users = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ users });
    }

    const userId = parseInt(userIdParam, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, roles: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fromParam = searchParams.get('from');
    const tillParam = searchParams.get('till');

    // Fetch submissions submitted by this user or for projects assigned to this user
    const submissions = await db.submission.findMany({
      where: {
        OR: [
          { submittedById: userId },
          { project: { assignedToId: userId } },
        ],
      },
      include: {
        project: true,
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Date filtering (by submission date createdAt)
    let filtered = submissions;
    if (fromParam) {
      const fromTime = new Date(fromParam).getTime();
      if (!isNaN(fromTime)) {
        filtered = filtered.filter((s) => new Date(s.createdAt).getTime() >= fromTime);
      }
    }
    if (tillParam) {
      const tillDate = new Date(tillParam);
      tillDate.setHours(23, 59, 59, 999);
      const tillTime = tillDate.getTime();
      if (!isNaN(tillTime)) {
        filtered = filtered.filter((s) => new Date(s.createdAt).getTime() <= tillTime);
      }
    }

    let onTimeCount = 0;
    let delayedCount = 0;

    const tasks = filtered.map((sub) => {
      const subDate = new Date(sub.createdAt);
      const estDate = new Date(sub.project ? sub.project.estimatedDate : sub.createdAt);

      let isDelayed = false;
      let diffDays = 0;

      if (!isNaN(subDate.getTime()) && !isNaN(estDate.getTime())) {
        const subUTC = Date.UTC(subDate.getUTCFullYear(), subDate.getUTCMonth(), subDate.getUTCDate());
        const estUTC = Date.UTC(estDate.getUTCFullYear(), estDate.getUTCMonth(), estDate.getUTCDate());
        const diffMs = subUTC - estUTC;
        diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        isDelayed = diffDays > 0;
      }

      if (isDelayed) {
        delayedCount++;
      } else {
        onTimeCount++;
      }

      return {
        id: sub.id,
        contractNo: sub.project ? sub.project.contractNo : 'N/A',
        partNo: sub.project ? sub.project.partNo : 'N/A',
        partDescription: sub.project ? sub.project.partDescription : 'N/A',
        submittedBy: sub.submittedBy ? sub.submittedBy.name : 'Unknown',
        submittedByEmail: sub.submittedBy ? sub.submittedBy.email : '',
        estimatedDate: sub.project ? sub.project.estimatedDate : sub.createdAt,
        submissionDate: sub.createdAt,
        isFinal: sub.isFinal,
        remarks: sub.remarks,
        isDelayed,
        delayDays: isDelayed ? diffDays : 0,
        delayText: isDelayed ? `${diffDays} day${diffDays === 1 ? '' : 's'} delay` : 'On Time',
      };
    });

    const totalCount = onTimeCount + delayedCount;
    const onTimeRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;
    const delayedRate = totalCount > 0 ? Math.round((delayedCount / totalCount) * 100) : 0;

    return NextResponse.json({
      user: targetUser,
      onTimeCount,
      delayedCount,
      totalCount,
      onTimeRate,
      delayedRate,
      tasks,
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
