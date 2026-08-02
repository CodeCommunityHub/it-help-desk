import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * TicketComments Component
 * Handles chronological comment feed and posting new comments for a specific ticket.
 * Visually distinguishes user comments vs staff/admin responses.
 */
export default function TicketComments({ ticketId, currentUser, currentUserRole }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch comments for ticketId with user profile email & role
  const fetchComments = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Fetch comments along with profiles author details
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          created_at,
          content,
          user_id,
          profiles (
            email,
            role
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading ticket comments:', err);
      setErrorMsg(err.message || 'Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Submit new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('comments').insert({
        ticket_id: ticketId,
        user_id: currentUser.id,
        content: commentText.trim(),
      });

      if (error) throw error;

      setCommentText('');
      await fetchComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
      setErrorMsg(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', style: 'bg-rose-950 text-rose-300 border-rose-800' };
      case 'admin':
        return { label: 'Admin', style: 'bg-purple-950 text-purple-300 border-purple-800' };
      case 'staff':
        return { label: 'IT Staff', style: 'bg-sky-950 text-sky-300 border-sky-800' };
      default:
        return { label: 'User', style: 'bg-blue-950 text-blue-300 border-blue-800' };
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Ticket Discussion & Updates</span>
          <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded-full font-normal">
            {comments.length}
          </span>
        </h4>

        <button
          onClick={fetchComments}
          disabled={loading}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-2 py-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl animate-pulse space-y-2">
                <div className="h-3 bg-slate-800 rounded w-1/3"></div>
                <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          /* Empty State */
          <div className="py-6 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40 p-4">
            <p className="text-xs text-slate-400">No comments posted yet. Start the conversation below.</p>
          </div>
        ) : (
          comments.map((c) => {
            const isOwnComment = c.user_id === currentUser?.id;
            const authorRole = c.profiles?.role || 'user';
            const isStaffOrAdmin = authorRole === 'staff' || authorRole === 'admin' || authorRole === 'super_admin';
            const badge = getRoleBadge(authorRole);

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isStaffOrAdmin
                    ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                    : isOwnComment
                    ? 'bg-blue-950/40 border-blue-800/60'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {/* Author Info Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-slate-200 truncate">
                      {c.profiles?.email || 'Unknown User'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                    {isOwnComment && (
                      <span className="text-[10px] text-blue-400 font-medium">(You)</span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Comment Content */}
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-xs">
                  {c.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Post New Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-2 pt-2">
        <div className="relative">
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type a response or status update..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500">
            {commentText.length} characters
          </span>

          <button
            type="submit"
            disabled={submitting || !commentText.trim()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-md shadow-blue-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Posting...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Post Comment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
