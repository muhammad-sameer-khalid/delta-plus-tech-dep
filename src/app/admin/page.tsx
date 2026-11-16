'use client';

import { useState, useEffect } from 'react';

type User = {
  id: number;
  email: string;
  name: string;
  roles: string;
};

const ROLES = ['Director', 'Supervisor', 'Co-Supervisor', 'Executant'];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Role Form state
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Name Update Form state
  const [nameEmail, setNameEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [nameSubmitting, setNameSubmitting] = useState(false);

  // Password Form state
  const [passEmail, setPassEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  const fetchUsers = async (retries = 2) => {
    setLoading(true);
    setError('');
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          setLoading(false);
          return;
        } else if (attempt === retries) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to fetch accounts. Service may be temporarily reconnecting.');
        }
      } catch (err) {
        if (attempt === retries) {
          setError('Network or database connection issue. Please click "Retry" below.');
        }
      }
      // Brief wait before retrying transient failed request
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');
    if (!accountEmail || !selectedRole) return;

    setRoleSubmitting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          name: accountName,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setAccountEmail('');
        setAccountName('');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update roles');
      }
    } catch (err) {
      setError('Connection interrupted while updating role. Please try again.');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');
    if (!nameEmail || !newName) return;

    setNameSubmitting(true);
    try {
      const res = await fetch('/api/admin/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: nameEmail,
          newName: newName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setNameEmail('');
        setNewName('');
        fetchUsers();
      } else {
        setError(data.error || 'Failed to update account name');
      }
    } catch (err) {
      setError('Connection interrupted while updating name. Please try again.');
    } finally {
      setNameSubmitting(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setError('');
    if (!passEmail || !newPassword) return;

    setPassSubmitting(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: passEmail,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setPassEmail('');
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Connection interrupted while updating password. Please try again.');
    } finally {
      setPassSubmitting(false);
    }
  };

  // Helper to pre-populate name or password form from table
  const selectUserForNameEdit = (u: User) => {
    setNameEmail(u.email);
    setNewName(u.name);
    setError('');
    setSuccessMsg('');
    // Scroll to name form smoothly
    const el = document.getElementById('update-name-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.25rem' }}>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Admin Panel</h1>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(255, 0, 0, 0.15)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            borderRadius: '4px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderColor: '#ff4444', color: '#ff4444' }}
            onClick={() => fetchUsers()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#00ff0022', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Table 1: Accounts Table */}
      <section className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Accounts &amp; Roles</h2>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => fetchUsers()}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '↻ Refresh Accounts'}
          </button>
        </div>

        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Account (Gmail)</th>
                  <th>Roles</th>
                  <th>Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No accounts found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.roles}</td>
                      <td><strong>{user.name}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', marginRight: '0.5rem' }}
                          onClick={() => selectUserForNameEdit(user)}
                          title="Click to edit name"
                        >
                          ✎ Edit Name
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setPassEmail(user.email);
                            const el = document.getElementById('update-password-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          title="Set password for this user"
                        >
                          🔑 Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Form: Update Account Name */}
      <section id="update-name-section" className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Update Account Name</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Change the full name of an existing account based on their registered Gmail address.
        </p>

        <form onSubmit={handleNameSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Gmail / Email</label>
            <input
              type="email"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. user@gmail.com"
              value={nameEmail}
              onChange={(e) => setNameEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>New Full Name</label>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. Muhammad Sameer"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div>
            <button type="submit" className="btn" disabled={nameSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
              {nameSubmitting ? 'Updating Name...' : 'Update Name'}
            </button>
          </div>
        </form>
      </section>

      {/* Form 1: Add / Toggle Roles */}
      <section className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Add / Remove Role for Account</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Entering an existing role for an account will <strong>remove</strong> it (if it is the only role, the account is removed). Entering a new role will <strong>add</strong> it.
        </p>

        <form onSubmit={handleRoleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Email</label>
            <input
              type="email"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. user@example.com"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Name (Optional for existing)</label>
            <input
              type="text"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="User Full Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Select Role</label>
            <select
              className="input"
              style={{ marginBottom: 0 }}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={{ background: '#111', color: '#fff' }}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button type="submit" className="btn" disabled={roleSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
              {roleSubmitting ? 'Saving Role...' : 'Save Role'}
            </button>
          </div>
        </form>
      </section>

      {/* Form 2: Update Password */}
      <section id="update-password-section" className="panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Update Account Password</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Update the password for any registered account email.
        </p>
        <form onSubmit={handlePasswordSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Account Email</label>
            <input
              type="email"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="user@example.com"
              value={passEmail}
              onChange={(e) => setPassEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>New Password</label>
            <input
              type="password"
              className="input"
              style={{ marginBottom: 0 }}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <button type="submit" className="btn" disabled={passSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
              {passSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
