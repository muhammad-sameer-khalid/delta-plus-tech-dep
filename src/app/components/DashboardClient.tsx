'use client';

import { useState, useEffect } from 'react';

type User = {
  id: number;
  email: string;
  roles: string;
};

type ExecutantUser = {
  id: number;
  name: string;
  email: string;
  roles: string;
};

type Project = {
  id: number;
  contractNo: string;
  partNo: string;
  partDescription: string;
  estimatedDate: string;
  remarks: string;
  status: string;
};

type Completion = {
  id: number;
  contractNo: string;
  partNo: string;
  partDescription: string;
  submittedBy: string;
  estimatedDate: string;
  remarks: string;
  completionDate: string;
  isFinal: boolean;
};

type AbandonedProject = {
  id: number;
  contractNo: string;
  partNo: string;
  partDescription: string;
  estimatedDate: string;
  remarks: string;
  status: string;
  assignedTo: string;
  assignedToEmail: string;
};

// Helper to calculate delay between submission date and estimated date
function calculateDelay(submissionDateStr: string, estimatedDateStr: string) {
  if (!submissionDateStr || !estimatedDateStr) return { text: 'N/A', isDelayed: false };
  const subDate = new Date(submissionDateStr);
  const estDate = new Date(estimatedDateStr);

  if (isNaN(subDate.getTime()) || isNaN(estDate.getTime())) {
    return { text: 'N/A', isDelayed: false };
  }

  // Compare calendar days using UTC to avoid timezone offset discrepancies
  const subUTC = Date.UTC(subDate.getUTCFullYear(), subDate.getUTCMonth(), subDate.getUTCDate());
  const estUTC = Date.UTC(estDate.getUTCFullYear(), estDate.getUTCMonth(), estDate.getUTCDate());

  const diffMs = subUTC - estUTC;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { text: 'On Time', isDelayed: false };
  } else {
    return { text: `${diffDays} day${diffDays === 1 ? '' : 's'} delay`, isDelayed: true };
  }
}

export default function DashboardClient({ user }: { user: User }) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // User roles parsing
  const rolesList = user.roles.split(',').map((r) => r.trim());
  const isSupervisor = rolesList.includes('Supervisor');
  const isCoSupervisor = rolesList.includes('Co-Supervisor');
  const isDirector = rolesList.includes('Director');
  const isExecutant = rolesList.includes('Executant');

  // Permissions for cards
  const canAssign = isSupervisor || isCoSupervisor;
  const canDue = isCoSupervisor || isExecutant;
  const canSubmit = isCoSupervisor || isExecutant;
  const canSubmitted = isSupervisor || isCoSupervisor || isDirector;
  const canCompletedProjects = isSupervisor || isCoSupervisor || isDirector;
  const canAbandoned = isSupervisor || isCoSupervisor || isDirector;

  // --- Assign Project State ---
  const [executants, setExecutants] = useState<ExecutantUser[]>([]);
  const [executantSearch, setExecutantSearch] = useState('');
  const [selectedExecutant, setSelectedExecutant] = useState<ExecutantUser | null>(null);
  const [assignForm, setAssignForm] = useState({
    contractNo: '',
    partNo: '',
    partDescription: '',
    estimatedDate: '',
    remarks: '',
  });
  const [assignStatus, setAssignStatus] = useState({ loading: false, msg: '', error: '' });

  // --- Due Projects State ---
  const [dueProjects, setDueProjects] = useState<Project[]>([]);
  const [dueSearch, setDueSearch] = useState('');
  const [dueLoading, setDueLoading] = useState(false);

  // --- Submit Task State ---
  const [submitProjects, setSubmitProjects] = useState<Project[]>([]);
  const [submitSearch, setSubmitSearch] = useState('');
  const [selectedSubmitProject, setSelectedSubmitProject] = useState<Project | null>(null);
  const [submitForm, setSubmitForm] = useState({
    remarks: '',
    isFinal: false,
  });
  const [submitStatus, setSubmitStatus] = useState({ loading: false, msg: '', error: '' });

  // --- Submissions State (shared between Submitted Tasks & Completed Projects) ---
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);

  // Search state for Submitted Tasks
  const [submittedNameSearch, setSubmittedNameSearch] = useState('');
  const [submittedProjectSearch, setSubmittedProjectSearch] = useState('');
  const [submittedSinceDate, setSubmittedSinceDate] = useState('');
  const [submittedTillDate, setSubmittedTillDate] = useState('');

  // Search state for Completed Projects
  const [completedNameSearch, setCompletedNameSearch] = useState('');
  const [completedProjectSearch, setCompletedProjectSearch] = useState('');
  const [completedSinceDate, setCompletedSinceDate] = useState('');
  const [completedTillDate, setCompletedTillDate] = useState('');

  // --- Abandoned Projects State ---
  const [abandonedProjects, setAbandonedProjects] = useState<AbandonedProject[]>([]);
  const [abandonedLoading, setAbandonedLoading] = useState(false);
  const [abandonedNameSearch, setAbandonedNameSearch] = useState('');
  const [abandonedProjectSearch, setAbandonedProjectSearch] = useState('');
  const [abandonedSinceDate, setAbandonedSinceDate] = useState('');
  const [abandonedTillDate, setAbandonedTillDate] = useState('');

  // Fetch data on card open
  useEffect(() => {
    if (activeCard === 'assign') {
      fetch('/api/users/executants')
        .then((res) => res.json())
        .then((data) => setExecutants(data))
        .catch(console.error);
    } else if (activeCard === 'due') {
      setDueLoading(true);
      fetch('/api/projects/due')
        .then((res) => res.json())
        .then((data) => {
          setDueProjects(data);
          setDueLoading(false);
        })
        .catch(console.error);
    } else if (activeCard === 'submit') {
      fetch('/api/projects/due')
        .then((res) => res.json())
        .then((data) => setSubmitProjects(data))
        .catch(console.error);
    } else if (activeCard === 'submitted' || activeCard === 'completed_projects') {
      setCompletionsLoading(true);
      fetch('/api/submissions/completed')
        .then((res) => res.json())
        .then((data) => {
          setCompletions(data);
          setCompletionsLoading(false);
        })
        .catch(console.error);
    } else if (activeCard === 'abandoned') {
      setAbandonedLoading(true);
      fetch('/api/projects/abandoned')
        .then((res) => res.json())
        .then((data) => {
          setAbandonedProjects(data);
          setAbandonedLoading(false);
        })
        .catch(console.error);
    }
  }, [activeCard]);

  // Handlers
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutant) return;
    setAssignStatus({ loading: true, msg: '', error: '' });

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assignForm,
          assignedToId: selectedExecutant.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignStatus({ loading: false, msg: 'Project assigned and notification sent!', error: '' });
        setAssignForm({ contractNo: '', partNo: '', partDescription: '', estimatedDate: '', remarks: '' });
        setSelectedExecutant(null);
      } else {
        setAssignStatus({ loading: false, msg: '', error: data.error || 'Failed to assign project' });
      }
    } catch (err) {
      setAssignStatus({ loading: false, msg: '', error: 'Server error' });
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmitProject) return;
    setSubmitStatus({ loading: true, msg: '', error: '' });

    try {
      const res = await fetch('/api/projects/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedSubmitProject.id,
          remarks: submitForm.remarks,
          isFinal: submitForm.isFinal,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitStatus({ loading: false, msg: 'Task submitted successfully!', error: '' });
        setSubmitForm({ remarks: '', isFinal: false });
        setSelectedSubmitProject(null);
        // Refresh list
        fetch('/api/projects/due')
          .then((res) => res.json())
          .then((data) => setSubmitProjects(data));
      } else {
        setSubmitStatus({ loading: false, msg: '', error: data.error || 'Submission failed' });
      }
    } catch (err) {
      setSubmitStatus({ loading: false, msg: '', error: 'Server error' });
    }
  };

  const handleDeleteCompletion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this submission record?')) return;
    try {
      const res = await fetch(`/api/submissions/completed?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCompletions((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('Failed to delete submission');
      }
    } catch (err) {
      alert('Error deleting submission');
    }
  };

  // Predictive search filters
  const filteredExecutants = executants.filter((u) =>
    u.name.toLowerCase().includes(executantSearch.toLowerCase())
  );

  const filteredDueProjects = dueProjects.filter(
    (p) =>
      p.contractNo.toLowerCase().includes(dueSearch.toLowerCase()) ||
      p.partNo.toLowerCase().includes(dueSearch.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(dueSearch.toLowerCase())
  );

  const filteredSubmitProjects = submitProjects.filter(
    (p) =>
      p.contractNo.toLowerCase().includes(submitSearch.toLowerCase()) ||
      p.partNo.toLowerCase().includes(submitSearch.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(submitSearch.toLowerCase())
  );

  // Submitted Tasks Filter
  const filteredSubmittedTasks = completions.filter((c) => {
    const matchesName = c.submittedBy.toLowerCase().includes(submittedNameSearch.toLowerCase());
    const matchesProject =
      c.contractNo.toLowerCase().includes(submittedProjectSearch.toLowerCase()) ||
      c.partNo.toLowerCase().includes(submittedProjectSearch.toLowerCase()) ||
      c.partDescription.toLowerCase().includes(submittedProjectSearch.toLowerCase());

    let matchesDate = true;
    const compTime = new Date(c.completionDate).getTime();
    if (submittedSinceDate) {
      matchesDate = matchesDate && compTime >= new Date(submittedSinceDate).getTime();
    }
    if (submittedTillDate) {
      const tillTime = new Date(submittedTillDate).setHours(23, 59, 59, 999);
      matchesDate = matchesDate && compTime <= tillTime;
    }

    return matchesName && matchesProject && matchesDate;
  });

  // Completed Projects Filter (Only isFinal === true)
  const filteredCompletedProjects = completions
    .filter((c) => c.isFinal)
    .filter((c) => {
      const matchesName = c.submittedBy.toLowerCase().includes(completedNameSearch.toLowerCase());
      const matchesProject =
        c.contractNo.toLowerCase().includes(completedProjectSearch.toLowerCase()) ||
        c.partNo.toLowerCase().includes(completedProjectSearch.toLowerCase()) ||
        c.partDescription.toLowerCase().includes(completedProjectSearch.toLowerCase());

      let matchesDate = true;
      const compTime = new Date(c.completionDate).getTime();
      if (completedSinceDate) {
        matchesDate = matchesDate && compTime >= new Date(completedSinceDate).getTime();
      }
      if (completedTillDate) {
        const tillTime = new Date(completedTillDate).setHours(23, 59, 59, 999);
        matchesDate = matchesDate && compTime <= tillTime;
      }

      return matchesName && matchesProject && matchesDate;
    });

  // Abandoned Projects Filter (Default search feature)
  const filteredAbandonedProjects = abandonedProjects.filter((p) => {
    const matchesName = p.assignedTo.toLowerCase().includes(abandonedNameSearch.toLowerCase());
    const matchesProject =
      p.contractNo.toLowerCase().includes(abandonedProjectSearch.toLowerCase()) ||
      p.partNo.toLowerCase().includes(abandonedProjectSearch.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(abandonedProjectSearch.toLowerCase());

    let matchesDate = true;
    const estTime = new Date(p.estimatedDate).getTime();
    if (abandonedSinceDate) {
      matchesDate = matchesDate && estTime >= new Date(abandonedSinceDate).getTime();
    }
    if (abandonedTillDate) {
      const tillTime = new Date(abandonedTillDate).setHours(23, 59, 59, 999);
      matchesDate = matchesDate && estTime <= tillTime;
    }

    return matchesName && matchesProject && matchesDate;
  });

  return (
    <div>
      {activeCard && (
        <button
          onClick={() => setActiveCard(null)}
          className="btn btn-outline"
          style={{ marginBottom: '1.5rem' }}
        >
          &larr; Back to Dashboard Cards
        </button>
      )}

      {/* Main Dashboard Cards View */}
      {!activeCard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {canAssign && (
            <div className="dash-card" onClick={() => setActiveCard('assign')}>
              <h3>Assign Project</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Assign new tasks to executants & co-supervisors.
              </p>
            </div>
          )}

          {canDue && (
            <div className="dash-card" onClick={() => setActiveCard('due')}>
              <h3>Due Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View your active assigned projects.
              </p>
            </div>
          )}

          {canSubmit && (
            <div className="dash-card" onClick={() => setActiveCard('submit')}>
              <h3>Submit Task</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Submit task progress or mark complete.
              </p>
            </div>
          )}

          {canSubmitted && (
            <div className="dash-card" onClick={() => setActiveCard('submitted')}>
              <h3>Submitted Tasks</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View all submitted progress and final task reports.
              </p>
            </div>
          )}

          {canCompletedProjects && (
            <div className="dash-card" onClick={() => setActiveCard('completed_projects')}>
              <h3>Completed Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View finalized projects where completion was confirmed.
              </p>
            </div>
          )}

          {canAbandoned && (
            <div className="dash-card" onClick={() => setActiveCard('abandoned')}>
              <h3>Abandoned Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View projects with no task submissions recorded.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CARD 1: ASSIGN PROJECT */}
      {activeCard === 'assign' && canAssign && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Assign Project</h2>

          {assignStatus.msg && (
            <div style={{ padding: '0.75rem', background: '#00ff0022', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', marginBottom: '1rem' }}>
              {assignStatus.msg}
            </div>
          )}
          {assignStatus.error && (
            <div style={{ padding: '0.75rem', background: '#ff000022', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', marginBottom: '1rem' }}>
              {assignStatus.error}
            </div>
          )}

          {!selectedExecutant ? (
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Select an Executant or Co-Supervisor to assign a task:
              </p>
              <input
                type="text"
                className="input"
                placeholder="Predictive search by name..."
                value={executantSearch}
                onChange={(e) => setExecutantSearch(e.target.value)}
              />

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExecutants.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          No matching team members found
                        </td>
                      </tr>
                    ) : (
                      filteredExecutants.map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>{member.roles}</td>
                          <td>
                            <button
                              className="btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              onClick={() => setSelectedExecutant(member)}
                            >
                              Assign Task
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAssignSubmit} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Assigning to: <span style={{ color: 'var(--accent)' }}>{selectedExecutant.name}</span></h3>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setSelectedExecutant(null)}
                >
                  Change User
                </button>
              </div>

              <div className="form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Contract No.</label>
                  <input
                    type="text"
                    className="input"
                    value={assignForm.contractNo}
                    onChange={(e) => setAssignForm({ ...assignForm, contractNo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Part No.</label>
                  <input
                    type="text"
                    className="input"
                    value={assignForm.partNo}
                    onChange={(e) => setAssignForm({ ...assignForm, partNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Part Description</label>
                <input
                  type="text"
                  className="input"
                  value={assignForm.partDescription}
                  onChange={(e) => setAssignForm({ ...assignForm, partDescription: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Estimated Date</label>
                <input
                  type="date"
                  className="input"
                  value={assignForm.estimatedDate}
                  onChange={(e) => setAssignForm({ ...assignForm, estimatedDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Remarks / Detailed Task</label>
                <textarea
                  className="input"
                  rows={4}
                  value={assignForm.remarks}
                  onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn" disabled={assignStatus.loading}>
                {assignStatus.loading ? 'Saving & Sending...' : 'Save & Send'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* CARD 2: DUE PROJECTS */}
      {activeCard === 'due' && canDue && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Due Projects</h2>

          <input
            type="text"
            className="input"
            placeholder="Predictive search by Contract No, Part No, or Part Description..."
            value={dueSearch}
            onChange={(e) => setDueSearch(e.target.value)}
          />

          {dueLoading ? (
            <p>Loading projects...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Contract No</th>
                    <th>Part No</th>
                    <th>Part Description</th>
                    <th>Est. Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDueProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No due projects found
                      </td>
                    </tr>
                  ) : (
                    filteredDueProjects.map((p) => (
                      <tr key={p.id}>
                        <td>{p.contractNo}</td>
                        <td>{p.partNo}</td>
                        <td>{p.partDescription}</td>
                        <td>{new Date(p.estimatedDate).toLocaleDateString()}</td>
                        <td>{p.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CARD 3: SUBMIT TASK */}
      {activeCard === 'submit' && canSubmit && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Submit Task</h2>

          {submitStatus.msg && (
            <div style={{ padding: '0.75rem', background: '#00ff0022', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', marginBottom: '1rem' }}>
              {submitStatus.msg}
            </div>
          )}
          {submitStatus.error && (
            <div style={{ padding: '0.75rem', background: '#ff000022', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', marginBottom: '1rem' }}>
              {submitStatus.error}
            </div>
          )}

          {!selectedSubmitProject ? (
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Select an assigned project to submit work on:
              </p>
              <input
                type="text"
                className="input"
                placeholder="Predictive search by Contract No, Part No, or Part Description..."
                value={submitSearch}
                onChange={(e) => setSubmitSearch(e.target.value)}
              />

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Contract No</th>
                      <th>Part No</th>
                      <th>Part Description</th>
                      <th>Est. Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmitProjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          No assigned projects available for submission
                        </td>
                      </tr>
                    ) : (
                      filteredSubmitProjects.map((p) => (
                        <tr key={p.id}>
                          <td>{p.contractNo}</td>
                          <td>{p.partNo}</td>
                          <td>{p.partDescription}</td>
                          <td>{new Date(p.estimatedDate).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                              onClick={() => setSelectedSubmitProject(p)}
                            >
                              Select Project
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTaskSubmit} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>
                  Submitting for: <span style={{ color: 'var(--accent)' }}>{selectedSubmitProject.contractNo} ({selectedSubmitProject.partNo})</span>
                </h3>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setSelectedSubmitProject(null)}
                >
                  Change Project
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Your Progress Remarks</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Detail what you have completed so far..."
                  value={submitForm.remarks}
                  onChange={(e) => setSubmitForm({ ...submitForm, remarks: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="projectComplete"
                  checked={submitForm.isFinal}
                  onChange={(e) => setSubmitForm({ ...submitForm, isFinal: e.target.checked })}
                  style={{ accentColor: 'var(--accent)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="projectComplete" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  <strong>Complete Project</strong> (checking this marks project as complete and removes it from Due Projects)
                </label>
              </div>

              <button type="submit" className="btn" disabled={submitStatus.loading}>
                {submitStatus.loading ? 'Submitting...' : 'Submit Task'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* CARD 4: SUBMITTED TASKS (formerly Completed Tasks) */}
      {activeCard === 'submitted' && canSubmitted && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Submitted Tasks</h2>

          {/* Default Predictive Search Feature */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Name</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Submitted by name..."
                value={submittedNameSearch}
                onChange={(e) => setSubmittedNameSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={submittedProjectSearch}
                onChange={(e) => setSubmittedProjectSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={submittedSinceDate}
                  onChange={(e) => setSubmittedSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={submittedTillDate}
                  onChange={(e) => setSubmittedTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {completionsLoading ? (
            <p>Loading submissions...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Contract No</th>
                    <th>Part No</th>
                    <th>Part Description</th>
                    <th>Submitted By</th>
                    <th>Est. Date</th>
                    <th>Submission Date</th>
                    <th>Delay</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmittedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No submitted tasks match your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredSubmittedTasks.map((c) => {
                      const delayInfo = calculateDelay(c.completionDate, c.estimatedDate);
                      return (
                        <tr key={c.id}>
                          <td>
                            {Boolean(c.isFinal) && (
                              <span style={{ marginRight: '0.4rem', fontSize: '1rem' }} title="Completed Task">
                                ✅
                              </span>
                            )}
                            {c.contractNo}
                          </td>
                          <td>{c.partNo}</td>
                          <td>{c.partDescription}</td>
                          <td>{c.submittedBy}</td>
                          <td>{new Date(c.estimatedDate).toLocaleDateString()}</td>
                          <td>{new Date(c.completionDate).toLocaleDateString()}</td>
                          <td>
                            {delayInfo.isDelayed ? (
                              <span style={{ color: '#ff4444', fontWeight: 600 }}>
                                {delayInfo.text}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                {delayInfo.text}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ maxHeight: '80px', overflowY: 'auto', paddingRight: '4px' }}>
                              {c.remarks}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline"
                              style={{
                                borderColor: '#ff4444',
                                color: '#ff4444',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                              }}
                              onClick={() => handleDeleteCompletion(c.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CARD 5: COMPLETED PROJECTS (Only final tasks) */}
      {activeCard === 'completed_projects' && canCompletedProjects && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Completed Projects</h2>

          {/* Default Predictive Search Feature */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Name</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Submitted by name..."
                value={completedNameSearch}
                onChange={(e) => setCompletedNameSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={completedProjectSearch}
                onChange={(e) => setCompletedProjectSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={completedSinceDate}
                  onChange={(e) => setCompletedSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={completedTillDate}
                  onChange={(e) => setCompletedTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {completionsLoading ? (
            <p>Loading completed projects...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Contract No</th>
                    <th>Part No</th>
                    <th>Part Description</th>
                    <th>Submitted By</th>
                    <th>Est. Date</th>
                    <th>Completion Date</th>
                    <th>Delay</th>
                    <th>Completion Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompletedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No completed projects match your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCompletedProjects.map((c) => {
                      const delayInfo = calculateDelay(c.completionDate, c.estimatedDate);
                      return (
                        <tr key={c.id}>
                          <td>
                            <span style={{ marginRight: '0.4rem', fontSize: '1rem' }} title="Completed Task">
                              ✅
                            </span>
                            {c.contractNo}
                          </td>
                          <td>{c.partNo}</td>
                          <td>{c.partDescription}</td>
                          <td>{c.submittedBy}</td>
                          <td>{new Date(c.estimatedDate).toLocaleDateString()}</td>
                          <td>{new Date(c.completionDate).toLocaleDateString()}</td>
                          <td>
                            {delayInfo.isDelayed ? (
                              <span style={{ color: '#ff4444', fontWeight: 600 }}>
                                {delayInfo.text}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                {delayInfo.text}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ maxHeight: '80px', overflowY: 'auto', paddingRight: '4px' }}>
                              {c.remarks}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline"
                              style={{
                                borderColor: '#ff4444',
                                color: '#ff4444',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                              }}
                              onClick={() => handleDeleteCompletion(c.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* CARD 6: ABANDONED PROJECTS (No submissions) */}
      {activeCard === 'abandoned' && canAbandoned && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Abandoned Projects</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Projects assigned to team members that have received zero progress submissions.
          </p>

          {/* Default Predictive Search Feature */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Name</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Assigned team member..."
                value={abandonedNameSearch}
                onChange={(e) => setAbandonedNameSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={abandonedProjectSearch}
                onChange={(e) => setAbandonedProjectSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={abandonedSinceDate}
                  onChange={(e) => setAbandonedSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={abandonedTillDate}
                  onChange={(e) => setAbandonedTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {abandonedLoading ? (
            <p>Loading abandoned projects...</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Contract No</th>
                    <th>Part No</th>
                    <th>Part Description</th>
                    <th>Assigned To</th>
                    <th>Est. Date</th>
                    <th>Initial Remarks</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbandonedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No abandoned projects found
                      </td>
                    </tr>
                  ) : (
                    filteredAbandonedProjects.map((p) => (
                      <tr key={p.id}>
                        <td>{p.contractNo}</td>
                        <td>{p.partNo}</td>
                        <td>{p.partDescription}</td>
                        <td>
                          {p.assignedTo}
                          {p.assignedToEmail && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {p.assignedToEmail}
                            </span>
                          )}
                        </td>
                        <td>{new Date(p.estimatedDate).toLocaleDateString()}</td>
                        <td>
                          <div style={{ maxHeight: '80px', overflowY: 'auto', paddingRight: '4px' }}>
                            {p.remarks}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: 'rgba(255, 68, 68, 0.15)',
                              color: '#ff6b6b',
                              border: '1px solid rgba(255, 68, 68, 0.3)',
                            }}
                          >
                            No Submissions
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
