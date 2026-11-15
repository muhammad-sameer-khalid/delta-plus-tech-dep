'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export default function NavbarClient({
  user,
  initialUnreadCount,
}: {
  user: any;
  initialUnreadCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    window.location.href = '/login';
  };

  const handleHomeClick = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nav-home-click'));
      if (window.location.pathname === '/') {
        window.history.pushState(null, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="navbar">
      <Link className="brand" href="/" onClick={handleHomeClick}>
        <img className="brand-logo" src="/logo.png" alt="Delta Plus logo" />
        <span className="brand-text">
          <span className="brand-name">Delta Plus</span>
          <span className="brand-sub">Technical Department</span>
        </span>
      </Link>

      <button className="nav-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle navigation">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`nav-links ${isOpen ? 'open' : ''}`}>
        <Link href="/" onClick={handleHomeClick}>Home</Link>
        {user && (user.roles.includes('Supervisor') || user.roles.includes('Co-Supervisor')) && (
          <Link href="/admin" onClick={() => setIsOpen(false)}>Admin</Link>
        )}

        {user ? (
          <>
            <Link href="/notifications" className="notification-bell" onClick={() => setIsOpen(false)}>
              <Bell size={20} />
              {initialUnreadCount > 0 && (
                <span className="notification-dot">{initialUnreadCount}</span>
              )}
            </Link>
            <a href="/api/auth/logout" onClick={handleLogout}>
              Logout
            </a>
          </>
        ) : (
          <Link href="/login" onClick={() => setIsOpen(false)}>Login</Link>
        )}
      </nav>
    </header>
  );
}
