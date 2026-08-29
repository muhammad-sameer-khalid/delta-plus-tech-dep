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

export default function DashboardClient({ user }: { user: User }) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  // User roles parsing
  const rolesList = user.roles.split(',').map((r) => r.trim());
  const isSupervisor = rolesList.includes('Supervisor');
  const isCoSupervisor = rolesList.includes('Co-Supervisor');
  const isDirector = rolesList.includes('Director');
  const isExecutant = rolesList.includes('Executant');

  // Can access cards
  const canAssign = isSupervisor || isCoSupervisor;
  const canDue = isCoSupervisor || isExecutant;
  const canSubmit = isCoSupervisor || isExecutant;
  const canCompleted = isSupervisor || isCoSupervisor || isDirector;

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

  // --- Completed Tasks State ---
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [sinceDate, setSinceDate] = useState('');
  const [tillDate, setTillDate] = useState('');

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
    } else if (activeCard === 'completed') {
      setCompletedLoading(true);
      fetch('/api/submissions/completed')
        .then((res) => res.json())
        .then((data) => {
          setCompletions(data);
          setCompletedLoading(false);
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

  const filteredCompletions = completions.filter((c) => {
    const matchesName = c.submittedBy.toLowerCase().includes(nameSearch.toLowerCase());
    const matchesProject =
      c.contractNo.toLowerCase().includes(projectSearch.toLowerCase()) ||
      c.partNo.toLowerCase().includes(projectSearch.toLowerCase()) ||
      c.partDescription.toLowerCase().includes(projectSearch.toLowerCase());

    let matchesDate = true;
    const compTime = new Date(c.completionDate).getTime();
    if (sinceDate) {
      matchesDate = matchesDate && compTime >= new Date(sinceDate).getTime();
    }
    if (tillDate) {
      // Set end of day for till date
      const tillTime = new Date(tillDate).setHours(23, 59, 59, 999);
      matchesDate = matchesDate && compTime <= tillTime;
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

          {canCompleted && (
            <div className="dash-card" onClick={() => setActiveCard('completed')}>
              <h3>Completed Tasks</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View completed tasks with advanced search.
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                  style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
                />
                <label htmlFor="projectComplete" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  Project Complete (checking this removes project from Due Projects)
                </label>
              </div>

              <button type="submit" className="btn" disabled={submitStatus.loading}>
                {submitStatus.loading ? 'Submitting...' : 'Submit Task'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* CARD 4: COMPLETED TASKS */}
      {activeCard === 'completed' && canCompleted && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Completed Tasks</h2>

          {/* 3 Predictive Search Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Name</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Submitted by name..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={sinceDate}
                  onChange={(e) => setSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={tillDate}
                  onChange={(e) => setTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {completedLoading ? (
            <p>Loading completions...</p>
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
                    <th>Executant Remarks</th>
                    <th>Completion Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompletions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No completed task records match your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredCompletions.map((c) => (
                      <tr key={c.id}>
                        <td>{c.contractNo}</td>
                        <td>{c.partNo}</td>
                        <td>{c.partDescription}</td>
                        <td>{c.submittedBy}</td>
                        <td>{new Date(c.estimatedDate).toLocaleDateString()}</td>
                        <td>
                          <div style={{ maxHeight: '80px', overflowY: 'auto', paddingRight: '4px' }}>
                            {c.remarks}
                          </div>
                        </td>
                        <td>{new Date(c.completionDate).toLocaleDateString()}</td>
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
