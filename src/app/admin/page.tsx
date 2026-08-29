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

  // Password Form state
  const [passEmail, setPassEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Failed to fetch accounts');
      }
    } catch (err) {
      setError('An error occurred loading users');
    } finally {
      setLoading(false);
    }
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
      setError('Error processing role update');
    } finally {
      setRoleSubmitting(false);
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
      setError('Error processing password update');
    } finally {
      setPassSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.25rem' }}>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Admin Panel</h1>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#ff000022', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#00ff0022', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Table 1: Accounts Table */}
      <section className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Accounts & Roles</h2>
        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Accounts</th>
                  <th>Roles</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>No accounts found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.roles}</td>
                      <td>{user.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Form 1: Add / Toggle Roles */}
      <section className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Add / Remove Role for Account</h2>
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
              {roleSubmitting ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </section>

      {/* Form 2: Update Password */}
      <section className="panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Update Account Password</h2>
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
              {passSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
