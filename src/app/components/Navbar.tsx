import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import NavbarClient from './NavbarClient';
import { db } from '@/lib/db';

export default async function Navbar() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let user = null;
  let unreadNotificationsCount = 0;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      user = payload;
      try {
        unreadNotificationsCount = await db.notification.count({
          where: { userId: user.id, isRead: false },
        });
      } catch (e) {
        console.error("DB error in navbar:", e);
      }
    }
  }

  return <NavbarClient user={user} initialUnreadCount={unreadNotificationsCount} />;
}
