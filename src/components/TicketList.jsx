import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import TicketComments from './TicketComments';

export default function TicketList({ user, refreshTrigger }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, refreshTrigger]);

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

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

  const getCategoryIcon = (category) => {
    switch (category) {
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

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 transition-all hover:border-slate-700/80">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>My Support Tickets</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800 rounded-full">
              {tickets.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Track, view updates, and add comments to your submitted tickets</p>
        </div>

        <button
          onClick={fetchTickets}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search tickets by title, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 shrink-0 overflow-x-auto">
          {['All', 'Pending', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchTickets} className="underline text-rose-200 hover:text-white">Retry</button>
        </div>
      )}

      {/* Loading Skeletons */}
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
        /* Empty State */
        <div className="py-12 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Tickets Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'All'
              ? 'No tickets match your active filter or search query.'
              : 'You have not submitted any IT support tickets yet. Use the form above to submit your first ticket.'}
          </p>
        </div>
      ) : (
        /* Ticket List Container */
        <div className="space-y-3">
          {filteredTickets.map((t) => {
            const isExpanded = expandedTicketId === t.id;

            return (
              <div
                key={t.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* Ticket Header Row */}
                <div
                  onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{getCategoryIcon(t.category)}</span>
                      <h3 className="font-semibold text-slate-100 text-sm hover:text-blue-400 transition-colors">
                        {t.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-slate-400 text-xs line-clamp-1">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 text-[11px] text-slate-500">
                    <span>
                      {new Date(t.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <button
                      type="button"
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Comments' : 'Comments & Details'}</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Comments Panel */}
                {isExpanded && (
                  <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 space-y-4">
                    {t.description && (
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Ticket Description
                        </h4>
                        <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                          {t.description}
                        </p>
                      </div>
                    )}

                    {/* Integrated Comment System */}
                    <TicketComments
                      ticketId={t.id}
                      currentUser={user}
                      currentUserRole="user"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
