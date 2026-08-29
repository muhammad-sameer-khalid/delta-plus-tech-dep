import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import DashboardClient from './components/DashboardClient';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  let user = null;
  if (token) {
    user = await verifyToken(token);
  }

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.25rem' }}>
      <section className="hero" style={{ padding: '2rem 0', textAlign: 'left', maxWidth: '100%' }}>
        <p className="eyebrow">Technical Department Operations</p>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Project Control Center</h1>
        <p className="lede">
          {user ? `Welcome back, ${user.email} (${user.roles})` : 'Please login to access department tasks.'}
        </p>
      </section>

      {user ? (
        <DashboardClient user={user} />
      ) : (
        <div className="panel" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p>You must be logged in to view projects.</p>
          <a href="/login" className="btn" style={{ marginTop: '1rem' }}>
            Go to Login
          </a>
        </div>
      )}
    </div>
  );
}
