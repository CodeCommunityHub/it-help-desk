import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function StaffDashboard({ user }) {
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [viewMode, setViewMode] = useState('board'); // 'board' (Jira style) or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Fetch only tickets assigned to logged-in staff ID
  const fetchAssignedTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignedTickets(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch assigned tickets.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignedTickets();
  }, [fetchAssignedTickets]);

  // Instant status update handler
  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdatingTicketId(ticketId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state instantly
      setAssignedTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );

      setSuccessMsg(`Ticket status updated to '${newStatus}'`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // Helper for Category Icons
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Hardware Repair':
        return '💻';
      case 'Software Fix':
        return '⚙️';
      case 'Network Issue':
        return '🌐';
      case 'Meeting Setup':
        return '🎙️';
      default:
        return '📋';
    }
  };

  // Helper for Urgency Indicators (derived from Category/Status for visual feedback)
  const getUrgencyBadge = (category) => {
    if (category === 'Network Issue' || category === 'Hardware Repair') {
      return { label: 'High Urgency', color: 'bg-rose-950/70 text-rose-300 border-rose-800/80' };
    }
    if (category === 'Software Fix') {
      return { label: 'Medium Urgency', color: 'bg-amber-950/70 text-amber-300 border-amber-800/80' };
    }
    return { label: 'Normal Urgency', color: 'bg-blue-950/70 text-blue-300 border-blue-800/80' };
  };

  // Filtered tickets logic
  const filteredTickets = assignedTickets.filter((t) => {
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  // Kanban column buckets
  const pendingTickets = filteredTickets.filter((t) => t.status === 'Pending' || !t.status);
  const inProgressTickets = filteredTickets.filter((t) => t.status === 'In Progress');
  const resolvedTickets = filteredTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-800/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Staff Resolution Board</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-700/80 rounded-full uppercase tracking-wider">
                IT Staff Member
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage your assigned service tickets, update resolution progress, and respond to issues
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'board'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
              </svg>
              <span>Jira Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={fetchAssignedTickets}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assigned To Me</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">{assignedTickets.length}</p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400">📋</div>
        </div>
        <div className="bg-slate-900/90 border border-sky-900/40 p-4 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">In Progress</p>
            <p className="text-2xl font-bold text-sky-300 mt-1">{inProgressTickets.length}</p>
          </div>
          <div className="p-3 bg-sky-950 border border-sky-800/60 rounded-xl text-sky-400">⚡</div>
        </div>
        <div className="bg-slate-900/90 border border-emerald-900/40 p-4 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Resolved</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{resolvedTickets.length}</p>
          </div>
          <div className="p-3 bg-emerald-950 border border-emerald-800/60 rounded-xl text-emerald-400">✅</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 p-4 border border-slate-800 rounded-2xl">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filter my tasks by title, category, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-950/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="All">All Categories</option>
          <option value="Hardware Repair">💻 Hardware Repair</option>
          <option value="Software Fix">⚙️ Software Fix</option>
          <option value="Network Issue">🌐 Network Issue</option>
          <option value="Meeting Setup">🎙️ Meeting Setup</option>
        </select>
      </div>

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

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl mb-3">
            <svg className="animate-spin h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">Fetching assigned tickets...</p>
        </div>
      ) : assignedTickets.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Assigned Tasks</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You currently have no IT tickets assigned to your account. Ask an Administrator to dispatch tickets to you.
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* ==================== JIRA KANBAN BOARD VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Pending */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending</h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800/60 rounded-full">
                {pendingTickets.length}
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {pendingTickets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-xl">
                  No pending tasks
                </p>
              ) : (
                pendingTickets.map((t) => (
                  <TaskCard
                    key={t.id}
                    ticket={t}
                    updatingTicketId={updatingTicketId}
                    onStatusChange={handleStatusChange}
                    getCategoryIcon={getCategoryIcon}
                    getUrgencyBadge={getUrgencyBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="bg-slate-900/90 border border-sky-900/40 rounded-2xl p-4 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200">In Progress</h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800/60 rounded-full">
                {inProgressTickets.length}
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {inProgressTickets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-xl">
                  No tasks in progress
                </p>
              ) : (
                inProgressTickets.map((t) => (
                  <TaskCard
                    key={t.id}
                    ticket={t}
                    updatingTicketId={updatingTicketId}
                    onStatusChange={handleStatusChange}
                    getCategoryIcon={getCategoryIcon}
                    getUrgencyBadge={getUrgencyBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Resolved */}
          <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200">Resolved</h3>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-full">
                {resolvedTickets.length}
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {resolvedTickets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-xl">
                  No resolved tasks
                </p>
              ) : (
                resolvedTickets.map((t) => (
                  <TaskCard
                    key={t.id}
                    ticket={t}
                    updatingTicketId={updatingTicketId}
                    onStatusChange={handleStatusChange}
                    getCategoryIcon={getCategoryIcon}
                    getUrgencyBadge={getUrgencyBadge}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== CLEAN LIST VIEW ==================== */
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3.5">Task & Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Urgency</th>
                  <th className="px-4 py-3.5">Status Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTickets.map((t) => {
                  const urgency = getUrgencyBadge(t.category);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4 max-w-sm">
                        <p className="font-semibold text-slate-100">{t.title}</p>
                        {t.description && (
                          <p className="text-slate-400 text-[11px] line-clamp-2 mt-1">{t.description}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          Assigned: {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                          <span>{getCategoryIcon(t.category)}</span>
                          <span>{t.category}</span>
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold ${urgency.color}`}>
                          {urgency.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={t.status || 'Pending'}
                            disabled={updatingTicketId === t.id}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="Pending">🟡 Pending</option>
                            <option value="In Progress">🔵 In Progress</option>
                            <option value="Resolved">🟢 Resolved</option>
                          </select>

                          {updatingTicketId === t.id && (
                            <svg className="animate-spin h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Jira-style Card Component
function TaskCard({ ticket, updatingTicketId, onStatusChange, getCategoryIcon, getUrgencyBadge }) {
  const urgency = getUrgencyBadge(ticket.category);

  return (
    <div className="bg-slate-950/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 shadow-md transition-all space-y-3 group">
      {/* Category & Urgency badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
          <span>{getCategoryIcon(ticket.category)}</span>
          <span className="truncate max-w-[120px]">{ticket.category}</span>
        </span>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${urgency.color}`}>
          {urgency.label}
        </span>
      </div>

      {/* Ticket Title & Desc */}
      <div>
        <h4 className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
          {ticket.title}
        </h4>
        {ticket.description && (
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">
            {ticket.description}
          </p>
        )}
      </div>

      {/* Footer: Date & Instant Status Dropdown */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">
          {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>

        {/* Status Dropdown (Requirement 4) */}
        <div className="relative">
          <select
            value={ticket.status || 'Pending'}
            disabled={updatingTicketId === ticket.id}
            onChange={(e) => onStatusChange(ticket.id, e.target.value)}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg text-[11px] font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>
    </div>
  );
}
