import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import UserManagement from './UserManagement';
import TicketComments from './TicketComments';

/**
 * AdminDashboard Component
 * Adheres to SOLID principles:
 * - Single Responsibility: Manages IT ticket dispatching, staff workload assignments, user activation, and ticket comment oversight.
 */
export default function AdminDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignmentFilter, setAssignmentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserManager, setShowUserManager] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // Fetch tickets and profiles
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch tickets
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsErr) throw ticketsErr;

      // 2. Fetch profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (profilesErr) {
        console.warn('Profiles table query error:', profilesErr.message);
      }

      const profiles = profilesData || [];
      setAllProfiles(profiles);

      // Filter staff members for assignment
      const staff = profiles.filter((p) => p.role === 'staff' && p.is_active);
      setStaffList(staff);
      setTickets(ticketsData || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load dispatch data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle staff assignment change
  const handleAssignChange = async (ticketId, staffId) => {
    setUpdatingTicketId(ticketId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const assignedValue = staffId === '' ? null : staffId;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: assignedValue })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, assigned_to: assignedValue } : t))
      );

      const assignedStaff = staffList.find((s) => s.id === staffId);
      const staffEmail = assignedStaff ? assignedStaff.email : 'Unassigned';
      setSuccessMsg(`Ticket updated! Assigned to: ${staffEmail}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Failed to assign staff: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Handle user account activation toggle
  const handleToggleActivation = async (profileId, newActiveStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newActiveStatus })
        .eq('id', profileId);

      if (error) throw error;

      setSuccessMsg(
        `User account ${newActiveStatus ? 'activated successfully' : 'deactivated'}.`
      );
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Failed to update activation status: ${err.message}`);
    }
  };

  // Handle role modification
  const handleRoleChange = async (profileId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);

      if (error) throw error;

      setSuccessMsg(`User role updated to '${newRole}'.`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Failed to update role: ${err.message}`);
    }
  };

  // Handle user removal
  const handleDeleteProfile = async (profileId) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;

      setSuccessMsg('User profile removed.');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Failed to remove user: ${err.message}`);
    }
  };

  // Handle ticket deletion (Admin privilege)
  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket permanently?')) return;

    try {
      const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
      if (error) throw error;
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setSuccessMsg('Ticket deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(`Failed to delete ticket: ${err.message}`);
    }
  };

  // Helper map for profile email by ID
  const getProfileEmail = (id) => {
    if (!id) return 'Unassigned';
    const prof = allProfiles.find((p) => p.id === id);
    return prof ? prof.email : id.slice(0, 8) + '...';
  };

  // Filtering tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesAssignment =
      assignmentFilter === 'All'
        ? true
        : assignmentFilter === 'Unassigned'
        ? !t.assigned_to
        : t.assigned_to === assignmentFilter;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      getProfileEmail(t.assigned_to).toLowerCase().includes(query);

    return matchesStatus && matchesAssignment && matchesSearch;
  });

  // Statistics
  const totalCount = tickets.length;
  const unassignedCount = tickets.filter((t) => !t.assigned_to).length;
  const pendingCount = tickets.filter((t) => t.status === 'Pending').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;
  const pendingUsersCount = allProfiles.filter((p) => !p.is_active).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/80';
      case 'In Progress':
        return 'bg-sky-950/60 text-sky-300 border-sky-800/80';
      case 'Resolved':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
      case 'Closed':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Admin Dispatch Dashboard</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-700/80 rounded-full uppercase tracking-wider">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Oversee tickets, assign tasks to IT staff members, respond to comments, and activate new user accounts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUserManager(!showUserManager)}
            className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900/60 text-purple-200 border border-purple-700/60 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 relative"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{showUserManager ? 'Hide User Manager' : 'User Accounts & Activation'}</span>
            {pendingUsersCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1"></span>
            )}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Tickets</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{totalCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-amber-900/40 p-4 rounded-xl shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Unassigned</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{unassignedCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Tickets</p>
          <p className="text-2xl font-bold text-amber-200 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-sky-900/40 p-4 rounded-xl shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">In Progress</p>
          <p className="text-2xl font-bold text-sky-300 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-emerald-900/40 p-4 rounded-xl shadow-lg col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Resolved</p>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Embedded Modular User Management Panel */}
      {showUserManager && (
        <UserManagement
          currentUserRole="admin"
          allProfiles={allProfiles}
          onToggleActivation={handleToggleActivation}
          onRoleChange={handleRoleChange}
          onDeleteProfile={handleDeleteProfile}
          loading={loading}
        />
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tickets Table Container */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 space-y-6">
        {/* Controls and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by ticket title, description, category, staff email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Assignments</option>
              <option value="Unassigned">⚠️ Unassigned Only</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  👤 {s.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl animate-pulse space-y-2">
                <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No Tickets Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your active filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3.5">Ticket Info</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Assigned Staff</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTickets.map((t) => {
                  const isExpanded = expandedTicketId === t.id;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-100">{t.title}</p>
                          <button
                            onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                            className="text-[10px] text-purple-400 hover:underline"
                          >
                            {isExpanded ? 'Hide Discussion' : '💬 Discussion'}
                          </button>
                        </div>
                        {t.description && (
                          <p className="text-slate-400 text-[11px] line-clamp-2 mt-1">{t.description}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          Submitted: {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {/* Expandable Comment Section */}
                        {isExpanded && (
                          <div className="mt-3 pt-2">
                            <TicketComments ticketId={t.id} currentUser={user} currentUserRole="admin" />
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                          {t.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={t.assigned_to || ''}
                            disabled={updatingTicketId === t.id}
                            onChange={(e) => handleAssignChange(t.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-all ${
                              !t.assigned_to
                                ? 'bg-amber-950/40 border-amber-800/70 text-amber-300 focus:ring-amber-500'
                                : 'bg-slate-900 border-slate-700 text-slate-200 focus:ring-purple-500'
                            }`}
                          >
                            <option value="">-- Unassigned --</option>
                            {staffList.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                🧑‍💻 {staff.email}
                              </option>
                            ))}
                          </select>

                          {updatingTicketId === t.id && (
                            <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 rounded-lg text-xs transition-all"
                          title="Delete Ticket"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
