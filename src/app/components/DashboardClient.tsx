'use client';

import { useState, useEffect, useRef } from 'react';

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

type AssignedTask = {
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

type DetailedProject = {
  id: number;
  contractNo: string;
  partNo: string;
  partDescription: string;
  estimatedDate: string;
  remarks: string;
  status: string;
  assignedToId: number;
  assignedTo: string;
  assignedToEmail: string;
};

type PerformanceUser = {
  id: number;
  name: string;
  email: string;
  roles: string;
};

type PerformanceTaskItem = {
  id: number;
  contractNo: string;
  partNo: string;
  partDescription: string;
  submittedBy: string;
  submittedByEmail: string;
  estimatedDate: string;
  submissionDate: string;
  isFinal: boolean;
  remarks: string;
  isDelayed: boolean;
  delayDays: number;
  delayText: string;
};

type PerformanceData = {
  user: PerformanceUser;
  onTimeCount: number;
  delayedCount: number;
  totalCount: number;
  onTimeRate: number;
  delayedRate: number;
  tasks: PerformanceTaskItem[];
};

// Helper to format date in YYYY-MM-DD
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get today's date in YYYY-MM-DD format (local timezone)
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Automatically retry fetch requests on transient network or server/DB connection drops
async function fetchWithAutoRetry(url: string, options?: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`Network request failed for ${url}`);
}

// Expandable Remarks Component with scrollbar and expand / show less toggle
function ExpandableRemarks({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current && !isExpanded) {
      setHasOverflow(textRef.current.scrollHeight > 80 || text.length > 70);
    }
  }, [text, isExpanded]);

  return (
    <div style={{ minWidth: '180px', maxWidth: '380px' }}>
      <div
        ref={textRef}
        style={{
          maxHeight: isExpanded ? 'none' : '80px',
          overflowY: isExpanded ? 'visible' : 'auto',
          paddingRight: '4px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: '0.88rem',
          lineHeight: '1.4',
        }}
      >
        {text}
      </div>
      {hasOverflow && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            padding: '2px 0 0 0',
            marginTop: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'underline',
            fontWeight: 600,
          }}
        >
          {isExpanded ? 'Show less' : 'Expand'}
        </button>
      )}
    </div>
  );
}

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
  const [cardError, setCardError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

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
  const canAssignedTasks = isSupervisor || isCoSupervisor || isDirector;
  const canEditProject = isSupervisor || isCoSupervisor;
  const canPerformanceAnalysis = isSupervisor || isCoSupervisor || isDirector;

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

  // --- Assigned Tasks State ---
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedNameSearch, setAssignedNameSearch] = useState('');
  const [assignedProjectSearch, setAssignedProjectSearch] = useState('');
  const [assignedSinceDate, setAssignedSinceDate] = useState('');
  const [assignedTillDate, setAssignedTillDate] = useState('');

  // --- Edit Project State ---
  const [allProjects, setAllProjects] = useState<DetailedProject[]>([]);
  const [allProjectsLoading, setAllProjectsLoading] = useState(false);
  const [editSearchName, setEditSearchName] = useState('');
  const [editSearchProject, setEditSearchProject] = useState('');
  const [editSinceDate, setEditSinceDate] = useState('');
  const [editTillDate, setEditTillDate] = useState('');

  // Modal editing state
  const [editingProject, setEditingProject] = useState<DetailedProject | null>(null);
  const [editForm, setEditForm] = useState({
    contractNo: '',
    partNo: '',
    partDescription: '',
    estimatedDate: '',
    remarks: '',
    assignedToId: 0,
    status: 'Due',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // --- Performance Analysis State ---
  const [perfUsers, setPerfUsers] = useState<PerformanceUser[]>([]);
  const [perfUsersLoading, setPerfUsersLoading] = useState(false);
  const [perfEmployeeSearch, setPerfEmployeeSearch] = useState('');
  const [selectedPerfUser, setSelectedPerfUser] = useState<PerformanceUser | null>(null);
  const [perfDropdownOpen, setPerfDropdownOpen] = useState(false);
  const [perfFromDate, setPerfFromDate] = useState('');
  const [perfTillDate, setPerfTillDate] = useState('');
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [perfDataLoading, setPerfDataLoading] = useState(false);
  const [perfError, setPerfError] = useState('');
  const perfDropdownRef = useRef<HTMLDivElement>(null);

  // Close employee dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (perfDropdownRef.current && !perfDropdownRef.current.contains(event.target as Node)) {
        setPerfDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch data on card open
  useEffect(() => {
    setCardError('');
    if (activeCard === 'assign') {
      fetchWithAutoRetry('/api/users/executants')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load executants');
          return res.json();
        })
        .then((data) => setExecutants(data))
        .catch((err) => {
          console.error(err);
          setCardError('Connection issue: Failed to load executants list. Service may be reconnecting.');
        });
    } else if (activeCard === 'due') {
      setDueLoading(true);
      fetchWithAutoRetry('/api/projects/due')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load due projects');
          return res.json();
        })
        .then((data) => {
          setDueProjects(data);
          setDueLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setDueLoading(false);
          setCardError('Connection interrupted while loading due projects. Please click Retry.');
        });
    } else if (activeCard === 'submit') {
      fetchWithAutoRetry('/api/projects/due')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load projects');
          return res.json();
        })
        .then((data) => setSubmitProjects(data))
        .catch((err) => {
          console.error(err);
          setCardError('Connection interrupted while loading projects. Please click Retry.');
        });
    } else if (activeCard === 'submitted' || activeCard === 'completed_projects') {
      setCompletionsLoading(true);
      fetchWithAutoRetry('/api/submissions/completed')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load submissions');
          return res.json();
        })
        .then((data) => {
          setCompletions(data);
          setCompletionsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setCompletionsLoading(false);
          setCardError('Connection interrupted while loading submitted tasks. Please click Retry.');
        });
    } else if (activeCard === 'abandoned') {
      setAbandonedLoading(true);
      fetchWithAutoRetry('/api/projects/abandoned')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load abandoned projects');
          return res.json();
        })
        .then((data) => {
          setAbandonedProjects(data);
          setAbandonedLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setAbandonedLoading(false);
          setCardError('Connection interrupted while loading abandoned projects. Please click Retry.');
        });
    } else if (activeCard === 'assigned_tasks') {
      setAssignedLoading(true);
      fetchWithAutoRetry('/api/projects/assigned')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load assigned tasks');
          return res.json();
        })
        .then((data) => {
          setAssignedTasks(data);
          setAssignedLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setAssignedLoading(false);
          setCardError('Connection interrupted while loading assigned tasks. Please click Retry.');
        });
    } else if (activeCard === 'edit_project') {
      setAllProjectsLoading(true);
      fetchWithAutoRetry('/api/projects')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load projects');
          return res.json();
        })
        .then((data) => {
          setAllProjects(data);
          setAllProjectsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setAllProjectsLoading(false);
          setCardError('Connection interrupted while loading projects. Please click Retry.');
        });

      if (executants.length === 0) {
        fetchWithAutoRetry('/api/users/executants')
          .then((res) => res.json())
          .then((data) => setExecutants(data))
          .catch(console.error);
      }
    } else if (activeCard === 'performance_analysis') {
      if (perfUsers.length === 0) {
        setPerfUsersLoading(true);
        fetchWithAutoRetry('/api/performance?action=users')
          .then((res) => {
            if (!res.ok) throw new Error('Failed to load users');
            return res.json();
          })
          .then((data) => {
            if (data.users) setPerfUsers(data.users);
            setPerfUsersLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setPerfUsersLoading(false);
            setCardError('Connection interrupted while loading employees list. Please click Retry.');
          });
      }
    }
  }, [activeCard, perfUsers.length, reloadToken]);

  // Fetch performance data when activeCard is performance_analysis and employee/dates change
  useEffect(() => {
    if (activeCard !== 'performance_analysis' || !selectedPerfUser) {
      setPerfData(null);
      return;
    }

    setPerfDataLoading(true);
    setPerfError('');

    const params = new URLSearchParams();
    params.set('userId', selectedPerfUser.id.toString());
    if (perfFromDate) params.set('from', perfFromDate);
    if (perfTillDate) params.set('till', perfTillDate);

    fetchWithAutoRetry(`/api/performance?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch performance analysis');
        return res.json();
      })
      .then((data) => {
        setPerfData(data);
        setPerfDataLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPerfError('Connection interrupted while loading performance metrics. Service may be reconnecting.');
        setPerfDataLoading(false);
      });
  }, [activeCard, selectedPerfUser, perfFromDate, perfTillDate, reloadToken]);

  // Handlers
  const handleOpenCard = (card: string) => {
    setActiveCard(card);
    if (typeof window !== 'undefined') {
      window.history.pushState({ card }, '', `/#${card}`);
    }
  };

  const handleBackToDashboard = () => {
    setActiveCard(null);
    setSelectedExecutant(null);
    setSelectedSubmitProject(null);
    setEditingProject(null);
    setPerfDropdownOpen(false);
    setCardError('');
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  };

  useEffect(() => {
    const handleResetToHome = () => {
      setActiveCard(null);
      setSelectedExecutant(null);
      setSelectedSubmitProject(null);
      setEditingProject(null);
      setPerfDropdownOpen(false);
      setCardError('');
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      setActiveCard(hash || null);
    };

    window.addEventListener('nav-home-click', handleResetToHome);
    window.addEventListener('popstate', handlePopState);

    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveCard(hash);
      }
    }

    return () => {
      window.removeEventListener('nav-home-click', handleResetToHome);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecutant) return;

    const todayStr = getTodayDateString();
    if (assignForm.estimatedDate < todayStr) {
      setAssignStatus({ loading: false, msg: '', error: 'Estimated date cannot be before today.' });
      return;
    }

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

  const openEditModal = (p: DetailedProject) => {
    const d = new Date(p.estimatedDate);
    const dateStr = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : '';

    setEditForm({
      contractNo: p.contractNo,
      partNo: p.partNo,
      partDescription: p.partDescription,
      estimatedDate: dateStr,
      remarks: p.remarks,
      assignedToId: p.assignedToId,
      status: p.status,
    });
    setEditError('');
    setEditingProject(p);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setEditSaving(true);
    setEditError('');

    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProject.id,
          ...editForm,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const updatedAssignee = executants.find((u) => u.id === Number(editForm.assignedToId));
        setAllProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  contractNo: editForm.contractNo,
                  partNo: editForm.partNo,
                  partDescription: editForm.partDescription,
                  estimatedDate: editForm.estimatedDate,
                  remarks: editForm.remarks,
                  assignedToId: Number(editForm.assignedToId),
                  status: editForm.status,
                  assignedTo: updatedAssignee ? updatedAssignee.name : p.assignedTo,
                  assignedToEmail: updatedAssignee ? updatedAssignee.email : p.assignedToEmail,
                }
              : p
          )
        );
        setEditingProject(null);
      } else {
        setEditError(data.error || 'Failed to update project');
      }
    } catch (err) {
      setEditError('Server error while updating project');
    } finally {
      setEditSaving(false);
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

  // Assigned Tasks Filter (Default search feature)
  const filteredAssignedTasks = assignedTasks.filter((p) => {
    const matchesName = p.assignedTo.toLowerCase().includes(assignedNameSearch.toLowerCase());
    const matchesProject =
      p.contractNo.toLowerCase().includes(assignedProjectSearch.toLowerCase()) ||
      p.partNo.toLowerCase().includes(assignedProjectSearch.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(assignedProjectSearch.toLowerCase());

    let matchesDate = true;
    const estTime = new Date(p.estimatedDate).getTime();
    if (assignedSinceDate) {
      matchesDate = matchesDate && estTime >= new Date(assignedSinceDate).getTime();
    }
    if (assignedTillDate) {
      const tillTime = new Date(assignedTillDate).setHours(23, 59, 59, 999);
      matchesDate = matchesDate && estTime <= tillTime;
    }

    return matchesName && matchesProject && matchesDate;
  });

  // Edit Project Filter (Default search feature)
  const filteredAllProjects = allProjects.filter((p) => {
    const matchesName = p.assignedTo.toLowerCase().includes(editSearchName.toLowerCase());
    const matchesProject =
      p.contractNo.toLowerCase().includes(editSearchProject.toLowerCase()) ||
      p.partNo.toLowerCase().includes(editSearchProject.toLowerCase()) ||
      p.partDescription.toLowerCase().includes(editSearchProject.toLowerCase());

    let matchesDate = true;
    const estTime = new Date(p.estimatedDate).getTime();
    if (editSinceDate) {
      matchesDate = matchesDate && estTime >= new Date(editSinceDate).getTime();
    }
    if (editTillDate) {
      const tillTime = new Date(editTillDate).setHours(23, 59, 59, 999);
      matchesDate = matchesDate && estTime <= tillTime;
    }

    return matchesName && matchesProject && matchesDate;
  });

  // Performance Analysis quick date range helper
  const setQuickDateRange = (type: 'this_month' | 'last_30' | 'last_90' | 'this_year' | 'all') => {
    const today = new Date();
    const todayStr = getTodayDateString();

    if (type === 'all') {
      setPerfFromDate('');
      setPerfTillDate('');
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setPerfFromDate(formatDateForInput(firstDay));
      setPerfTillDate(todayStr);
    } else if (type === 'last_30') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setPerfFromDate(formatDateForInput(d));
      setPerfTillDate(todayStr);
    } else if (type === 'last_90') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setPerfFromDate(formatDateForInput(d));
      setPerfTillDate(todayStr);
    } else if (type === 'this_year') {
      const firstDayYear = new Date(today.getFullYear(), 0, 1);
      setPerfFromDate(formatDateForInput(firstDayYear));
      setPerfTillDate(todayStr);
    }
  };

  // Filter users matching employee search in Performance Analysis
  const filteredPerfUsers = perfUsers.filter((u) => {
    const query = perfEmployeeSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.roles.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      {activeCard && (
        <button
          onClick={handleBackToDashboard}
          className="btn btn-outline"
          style={{ marginBottom: '1.5rem' }}
        >
          &larr; Back to Dashboard Cards
        </button>
      )}

      {/* Connection Error Banner with Retry */}
      {activeCard && cardError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(255, 68, 68, 0.15)',
            border: '1px solid #ff4444',
            color: '#ff4444',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span>⚠️ {cardError}</span>
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.8rem',
              borderColor: '#ff4444',
              color: '#ff4444',
              whiteSpace: 'nowrap',
            }}
            onClick={() => {
              setCardError('');
              setReloadToken((prev) => prev + 1);
            }}
          >
            ↻ Retry Connection
          </button>
        </div>
      )}

      {/* Main Dashboard Cards View */}
      {!activeCard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {canAssign && (
            <div className="dash-card" onClick={() => handleOpenCard('assign')}>
              <h3>Assign Project</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Assign new tasks to executants & co-supervisors.
              </p>
            </div>
          )}

          {canDue && (
            <div className="dash-card" onClick={() => handleOpenCard('due')}>
              <h3>Due Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View your active assigned projects.
              </p>
            </div>
          )}

          {canSubmit && (
            <div className="dash-card" onClick={() => handleOpenCard('submit')}>
              <h3>Submit Task</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Submit task progress or mark complete.
              </p>
            </div>
          )}

          {canSubmitted && (
            <div className="dash-card" onClick={() => handleOpenCard('submitted')}>
              <h3>Submitted Tasks</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View all submitted progress and final task reports.
              </p>
            </div>
          )}

          {canCompletedProjects && (
            <div className="dash-card" onClick={() => handleOpenCard('completed_projects')}>
              <h3>Completed Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View finalized projects where completion was confirmed.
              </p>
            </div>
          )}

          {canAbandoned && (
            <div className="dash-card" onClick={() => handleOpenCard('abandoned')}>
              <h3>Abandoned Projects</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View projects with no task submissions recorded.
              </p>
            </div>
          )}

          {canAssignedTasks && (
            <div className="dash-card" onClick={() => handleOpenCard('assigned_tasks')}>
              <h3>Assigned Tasks</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View all ongoing assigned tasks that are not completed yet.
              </p>
            </div>
          )}

          {canEditProject && (
            <div className="dash-card" onClick={() => handleOpenCard('edit_project')}>
              <h3>Edit Project</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                View all projects and edit their details.
              </p>
            </div>
          )}

          {canPerformanceAnalysis && (
            <div className="dash-card" onClick={() => handleOpenCard('performance_analysis')}>
              <h3>Performance Analysis</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Employee performance bar graphs comparing delayed vs. on-time tasks.
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
                  min={getTodayDateString()}
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
                        <td>
                          <ExpandableRemarks text={p.remarks} />
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
                            <ExpandableRemarks text={c.remarks} />
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
                            <ExpandableRemarks text={c.remarks} />
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
                          <ExpandableRemarks text={p.remarks} />
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

      {/* CARD 7: ASSIGNED TASKS (Not completed yet) */}
      {activeCard === 'assigned_tasks' && canAssignedTasks && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Assigned Tasks</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            All ongoing tasks assigned to team members that are not completed yet.
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
                value={assignedNameSearch}
                onChange={(e) => setAssignedNameSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={assignedProjectSearch}
                onChange={(e) => setAssignedProjectSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={assignedSinceDate}
                  onChange={(e) => setAssignedSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={assignedTillDate}
                  onChange={(e) => setAssignedTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {assignedLoading ? (
            <p>Loading assigned tasks...</p>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No assigned tasks found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAssignedTasks.map((p) => (
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
                          <ExpandableRemarks text={p.remarks} />
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

      {/* CARD 8: EDIT PROJECT */}
      {activeCard === 'edit_project' && canEditProject && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Edit Project</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Browse all department projects and click &quot;Edit&quot; to modify contract, part, assignee, date, or status.
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
                value={editSearchName}
                onChange={(e) => setEditSearchName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Search by Project</label>
              <input
                type="text"
                className="input"
                style={{ marginBottom: 0 }}
                placeholder="Contract / Part No / Desc..."
                value={editSearchProject}
                onChange={(e) => setEditSearchProject(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>Date Range (Since / Till)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={editSinceDate}
                  onChange={(e) => setEditSinceDate(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={editTillDate}
                  onChange={(e) => setEditTillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {allProjectsLoading ? (
            <p>Loading projects...</p>
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
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllProjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        No projects found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAllProjects.map((p) => (
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
                          <ExpandableRemarks text={p.remarks} />
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: p.status === 'Completed' ? 'rgba(200, 255, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                              color: p.status === 'Completed' ? 'var(--accent)' : 'var(--text)',
                              border: p.status === 'Completed' ? '1px solid var(--accent)' : '1px solid var(--line)',
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                            onClick={() => openEditModal(p)}
                          >
                            Edit
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
      )}

      {/* CARD 9: PERFORMANCE ANALYSIS */}
      {activeCard === 'performance_analysis' && canPerformanceAnalysis && (
        <section className="panel" style={{ borderTop: 'none', padding: 0 }}>
          <h2 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Performance Analysis</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Analyze employee task completion performance with delayed vs. on-time bar graphs across any date range.
          </p>

          {/* 3 Input Fields Container */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                alignItems: 'start',
              }}
            >
              {/* Field 1: Employee Name with Predictive Dropdown */}
              <div ref={perfDropdownRef} style={{ position: 'relative' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Employee Name {selectedPerfUser ? <span style={{ color: 'var(--accent)' }}>✓ Selected</span> : ''}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    style={{
                      marginBottom: 0,
                      paddingRight: selectedPerfUser ? '2.5rem' : '1rem',
                      borderColor: selectedPerfUser ? 'var(--accent)' : undefined,
                    }}
                    placeholder={perfUsersLoading ? 'Loading employees...' : 'Type employee name...'}
                    value={perfEmployeeSearch}
                    onChange={(e) => {
                      setPerfEmployeeSearch(e.target.value);
                      setPerfDropdownOpen(true);
                      if (selectedPerfUser && e.target.value.toLowerCase() !== selectedPerfUser.name.toLowerCase()) {
                        setSelectedPerfUser(null);
                      }
                    }}
                    onFocus={() => setPerfDropdownOpen(true)}
                  />
                  {selectedPerfUser && (
                    <button
                      type="button"
                      title="Clear selected employee"
                      onClick={() => {
                        setSelectedPerfUser(null);
                        setPerfEmployeeSearch('');
                        setPerfDropdownOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '2px 6px',
                        lineHeight: 1,
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Dropdown List */}
                {perfDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#161616',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
                      maxHeight: '230px',
                      overflowY: 'auto',
                      zIndex: 200,
                    }}
                  >
                    {filteredPerfUsers.length === 0 ? (
                      <div style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        No employees found matching &quot;{perfEmployeeSearch}&quot;
                      </div>
                    ) : (
                      filteredPerfUsers.map((u) => {
                        const isSelected = selectedPerfUser?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              setSelectedPerfUser(u);
                              setPerfEmployeeSearch(u.name);
                              setPerfDropdownOpen(false);
                            }}
                            style={{
                              padding: '0.65rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #222',
                              background: isSelected ? 'rgba(200, 255, 0, 0.12)' : 'transparent',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = '#222';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: isSelected ? 'var(--accent)' : 'var(--text)',
                              }}
                            >
                              {u.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              {u.email} &bull; <span style={{ color: 'var(--accent)' }}>{u.roles}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Field 2: From Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: '0.35rem',
                  }}
                >
                  From Date
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={perfFromDate}
                  onChange={(e) => setPerfFromDate(e.target.value)}
                />
              </div>

              {/* Field 3: Till Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Till Date
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ marginBottom: 0, padding: '0.5rem' }}
                  value={perfTillDate}
                  onChange={(e) => setPerfTillDate(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Quick Range:</span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setQuickDateRange('last_30')}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setQuickDateRange('this_month')}
              >
                This Month
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setQuickDateRange('last_90')}
              >
                Last 3 Months
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setQuickDateRange('this_year')}
              >
                This Year
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setQuickDateRange('all')}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Error Message */}
          {perfError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255, 68, 68, 0.15)',
                border: '1px solid #ff4444',
                color: '#ff4444',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
              }}
            >
              {perfError}
            </div>
          )}

          {/* Prompt state if no employee selected */}
          {!selectedPerfUser && (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: 'var(--surface)',
                border: '1px dashed var(--line)',
                borderRadius: '8px',
                color: 'var(--muted)',
              }}
            >
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                Select an employee from the dropdown above
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Start typing any employee&apos;s name in the employee field to view their on-time vs. delayed task performance.
              </p>
            </div>
          )}

          {/* Loading state when fetching performance data */}
          {selectedPerfUser && perfDataLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--muted)' }}>
                Loading performance metrics for <strong style={{ color: 'var(--text)' }}>{selectedPerfUser.name}</strong>...
              </p>
            </div>
          )}

          {/* Performance Data View */}
          {selectedPerfUser && !perfDataLoading && perfData && (
            <div>
              {/* Summary Numbers Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Stat 1: Total Tasks */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Tasks Submitted
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0.4rem 0 0.1rem 0' }}>
                    {perfData.totalCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Total recorded in period
                  </div>
                </div>

                {/* Stat 2: On Time Tasks */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(200, 255, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Submitted On Time
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--accent)', margin: '0.4rem 0 0.1rem 0' }}>
                    {perfData.onTimeCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                    {perfData.onTimeRate}% on-time completion rate
                  </div>
                </div>

                {/* Stat 3: Delayed Tasks */}
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(255, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#ff6b6b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Delayed Tasks
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#ff4444', margin: '0.4rem 0 0.1rem 0' }}>
                    {perfData.delayedCount}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>
                    {perfData.delayedRate}% delay rate
                  </div>
                </div>
              </div>

              {/* Bar Graph Section */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid var(--line)',
                    paddingBottom: '1rem',
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                      Performance Bar Graph &mdash; <span style={{ color: 'var(--accent)' }}>{selectedPerfUser.name}</span>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {perfFromDate || perfTillDate ? (
                        <>
                          Date range: {perfFromDate ? `From ${perfFromDate}` : 'Beginning'} &rarr;{' '}
                          {perfTillDate ? `Till ${perfTillDate}` : 'Present'}
                        </>
                      ) : (
                        'Date range: All Time'
                      )}
                    </p>
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          background: 'var(--accent)',
                          display: 'inline-block',
                        }}
                      />
                      <span>On Time ({perfData.onTimeCount})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          background: '#ff4444',
                          display: 'inline-block',
                        }}
                      />
                      <span>Delayed ({perfData.delayedCount})</span>
                    </div>
                  </div>
                </div>

                {perfData.totalCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--muted)' }}>
                    <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                      No tasks found for {selectedPerfUser.name}
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>
                      No task submissions were recorded for this employee in the selected date range. Try widening the dates or selecting &quot;All Time&quot;.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const maxCount = Math.max(perfData.onTimeCount, perfData.delayedCount, 1);
                    const chartHeight = 220; // px
                    const onTimeHeightPx = Math.max(
                      14,
                      Math.round((perfData.onTimeCount / maxCount) * chartHeight)
                    );
                    const delayedHeightPx = Math.max(
                      14,
                      Math.round((perfData.delayedCount / maxCount) * chartHeight)
                    );

                    // Y-axis tick values
                    const yTicks = [
                      maxCount,
                      Math.round(maxCount * 0.75),
                      Math.round(maxCount * 0.5),
                      Math.round(maxCount * 0.25),
                      0,
                    ];

                    return (
                      <div style={{ padding: '0.5rem 0' }}>
                        {/* Visual Chart Container */}
                        <div
                          style={{
                            display: 'flex',
                            position: 'relative',
                            height: `${chartHeight + 40}px`,
                            alignItems: 'flex-end',
                            paddingLeft: '45px',
                            paddingBottom: '25px',
                            borderBottom: '2px solid var(--line)',
                          }}
                        >
                          {/* Y-Axis labels & Grid lines */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: '25px',
                              width: '35px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              fontSize: '0.75rem',
                              color: 'var(--muted)',
                              paddingRight: '6px',
                            }}
                          >
                            {yTicks.map((val, idx) => (
                              <span key={idx}>{val}</span>
                            ))}
                          </div>

                          {/* Horizontal Grid lines */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '45px',
                              right: 0,
                              top: 0,
                              bottom: '25px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              pointerEvents: 'none',
                            }}
                          >
                            {yTicks.map((_, idx) => (
                              <div
                                key={idx}
                                style={{
                                  borderBottom: '1px dashed rgba(255, 255, 255, 0.08)',
                                  width: '100%',
                                }}
                              />
                            ))}
                          </div>

                          {/* Bars Container */}
                          <div
                            style={{
                              position: 'relative',
                              zIndex: 2,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'flex-end',
                              gap: '4rem',
                              width: '100%',
                              height: '100%',
                            }}
                          >
                            {/* Bar 1: On Time */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '120px',
                              }}
                            >
                              {/* Value Label above bar */}
                              <div
                                style={{
                                  marginBottom: '0.4rem',
                                  textAlign: 'center',
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  color: 'var(--accent)',
                                }}
                              >
                                {perfData.onTimeCount}
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', display: 'block' }}>
                                  ({perfData.onTimeRate}%)
                                </span>
                              </div>

                              {/* Vertical Bar */}
                              <div
                                style={{
                                  width: '100%',
                                  height: `${perfData.onTimeCount > 0 ? onTimeHeightPx : 4}px`,
                                  background: 'linear-gradient(180deg, var(--accent) 0%, #7da600 100%)',
                                  borderRadius: '6px 6px 0 0',
                                  boxShadow: perfData.onTimeCount > 0 ? '0 0 16px rgba(200, 255, 0, 0.25)' : 'none',
                                  transition: 'height 0.3s ease',
                                }}
                              />
                            </div>

                            {/* Bar 2: Delayed */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '120px',
                              }}
                            >
                              {/* Value Label above bar */}
                              <div
                                style={{
                                  marginBottom: '0.4rem',
                                  textAlign: 'center',
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  color: '#ff4444',
                                }}
                              >
                                {perfData.delayedCount}
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', display: 'block' }}>
                                  ({perfData.delayedRate}%)
                                </span>
                              </div>

                              {/* Vertical Bar */}
                              <div
                                style={{
                                  width: '100%',
                                  height: `${perfData.delayedCount > 0 ? delayedHeightPx : 4}px`,
                                  background: 'linear-gradient(180deg, #ff5555 0%, #b31414 100%)',
                                  borderRadius: '6px 6px 0 0',
                                  boxShadow: perfData.delayedCount > 0 ? '0 0 16px rgba(255, 68, 68, 0.25)' : 'none',
                                  transition: 'height 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* X-Axis Labels below the baseline */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '4rem',
                            paddingLeft: '45px',
                            marginTop: '0.75rem',
                          }}
                        >
                          <div style={{ width: '120px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent)' }}>
                              On Time
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              {perfData.onTimeCount} task{perfData.onTimeCount === 1 ? '' : 's'} on schedule
                            </div>
                          </div>

                          <div style={{ width: '120px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ff6b6b' }}>
                              Delayed
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              {perfData.delayedCount} task{perfData.delayedCount === 1 ? '' : 's'} overdue
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Tasks Breakdown Table */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  Detailed Task Submissions ({perfData.tasks.length})
                </h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Contract No</th>
                        <th>Part No</th>
                        <th>Part Description</th>
                        <th>Est. Date</th>
                        <th>Submission Date</th>
                        <th>Performance</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perfData.tasks.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                            No task submissions recorded
                          </td>
                        </tr>
                      ) : (
                        perfData.tasks.map((t) => (
                          <tr key={t.id}>
                            <td>
                              {Boolean(t.isFinal) && (
                                <span style={{ marginRight: '0.4rem', fontSize: '1rem' }} title="Finalized Completion">
                                  ✅
                                </span>
                              )}
                              {t.contractNo}
                            </td>
                            <td>{t.partNo}</td>
                            <td>{t.partDescription}</td>
                            <td>{new Date(t.estimatedDate).toLocaleDateString()}</td>
                            <td>{new Date(t.submissionDate).toLocaleDateString()}</td>
                            <td>
                              {t.isDelayed ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(255, 68, 68, 0.15)',
                                    color: '#ff6b6b',
                                    border: '1px solid rgba(255, 68, 68, 0.3)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {t.delayText}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(200, 255, 0, 0.15)',
                                    color: 'var(--accent)',
                                    border: '1px solid rgba(200, 255, 0, 0.3)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {t.delayText}
                                </span>
                              )}
                            </td>
                            <td>
                              <ExpandableRemarks text={t.remarks} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* EDIT PROJECT MODAL POPUP */}
      {editingProject && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setEditingProject(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>
                Edit Project: {editingProject.contractNo}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '0 0.25rem',
                }}
              >
                &times;
              </button>
            </div>

            {editError && (
              <div style={{ padding: '0.75rem', background: '#ff000022', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSave}>
              <div className="form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Contract No.</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.contractNo}
                    onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Part No.</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.partNo}
                    onChange={(e) => setEditForm({ ...editForm, partNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Part Description</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.partDescription}
                  onChange={(e) => setEditForm({ ...editForm, partDescription: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Assigned To</label>
                  <select
                    className="input"
                    value={editForm.assignedToId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToId: Number(e.target.value) })}
                    required
                  >
                    {!executants.some((u) => u.id === editForm.assignedToId) && (
                      <option value={editForm.assignedToId}>
                        {editingProject.assignedTo} (Current)
                      </option>
                    )}
                    {executants.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.roles})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Status</label>
                  <select
                    className="input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    required
                  >
                    <option value="Due">Due</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Estimated Date</label>
                <input
                  type="date"
                  className="input"
                  value={editForm.estimatedDate}
                  onChange={(e) => setEditForm({ ...editForm, estimatedDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Remarks / Detailed Task</label>
                <textarea
                  className="input"
                  rows={4}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingProject(null)}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={editSaving}>
                  {editSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
