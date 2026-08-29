'use client';

import { useState, useEffect } from 'react';

type NotificationItem = {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data);
        setLoading(false);
        // Mark all as read when opening page
        fetch('/api/notifications', { method: 'POST' });
      })
      .catch((err) => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto', padding: '0 1.25rem' }}>
      <h1 style={{ color: 'var(--accent)', marginBottom: '1.5rem' }}>Notifications</h1>
      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No notifications yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderLeft: n.isRead ? '4px solid var(--line)' : '4px solid var(--accent)',
                padding: '1rem',
                borderRadius: '4px',
              }}
            >
              <p style={{ margin: 0, fontWeight: n.isRead ? 'normal' : 'bold' }}>{n.message}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
