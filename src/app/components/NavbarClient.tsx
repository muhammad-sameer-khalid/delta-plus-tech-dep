'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

export default function NavbarClient({ user, initialUnreadCount }: { user: any, initialUnreadCount: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="navbar">
      <Link className="brand" href="/">
        <img className="brand-logo" src="/logo.png" alt="Delta Plus logo" />
        <span className="brand-text">
          <span className="brand-name">Delta Plus</span>
          <span className="brand-sub">Technical Department</span>
        </span>
      </Link>
      
      <button 
        className="nav-toggle" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span></span><span></span><span></span>
      </button>

      <nav className={`nav-links ${isOpen ? 'open' : ''}`}>
        <Link href="/">Home</Link>
        {user && (user.roles.includes('Supervisor') || user.roles.includes('Co-Supervisor')) && (
          <Link href="/admin">Admin</Link>
        )}
        
        {user ? (
          <>
            <Link href="/notifications" className="notification-bell">
              <Bell size={20} />
              {initialUnreadCount > 0 && (
                <span className="notification-dot">{initialUnreadCount}</span>
              )}
            </Link>
            <a href="/api/auth/logout">Logout</a>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
