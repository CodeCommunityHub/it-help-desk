import { useState } from 'react';

/**
 * UserManagement Component
 * Adheres to SOLID principles:
 * - Single Responsibility: Handles user listing, activation state toggling, role assignment, and user deletion.
 * - Open/Closed: Extensible filter and action hooks without mutating component logic.
 */
export default function UserManagement({
  currentUserRole = 'admin',
  allProfiles = [],
  onToggleActivation,
  onRoleChange,
  onDeleteProfile,
  loading = false,
}) {
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isSuperAdmin = currentUserRole === 'super_admin';

  // Filter profiles based on state
  const filteredProfiles = allProfiles.filter((prof) => {
    const matchesRole = filterRole === 'All' || prof.role === filterRole;
    const matchesStatus =
      filterStatus === 'All'
        ? true
        : filterStatus === 'Pending'
        ? !prof.is_active
        : prof.is_active;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      prof.email.toLowerCase().includes(query) ||
      (prof.role && prof.role.toLowerCase().includes(query));

    return matchesRole && matchesStatus && matchesSearch;
  });

  const pendingCount = allProfiles.filter((p) => !p.is_active).length;
  const activeCount = allProfiles.filter((p) => p.is_active).length;

  const handleActivateToggle = async (profile) => {
    setActionLoadingId(profile.id);
    try {
      await onToggleActivation(profile.id, !profile.is_active);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleSelect = async (profileId, newRole) => {
    setActionLoadingId(profileId);
    try {
      await onRoleChange(profileId, newRole);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (profile) => {
    if (!window.confirm(`Are you sure you want to remove user "${profile.email}" permanently?`)) {
      return;
    }
    setActionLoadingId(profile.id);
    try {
      await onDeleteProfile(profile.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/80';
      case 'admin':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/80';
      case 'staff':
        return 'bg-sky-950/80 text-sky-300 border-sky-700/80';
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-700/80';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100 tracking-tight">
              User Management & Access Control
            </h3>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 rounded-full animate-pulse">
                {pendingCount} Pending Activation
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Super Admin Privileges: Activate pending users, re-assign roles, and delete user accounts.'
              : 'Admin Privileges: Activate pending user accounts and remove unauthorized users.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
            Total Users: <strong className="text-slate-200">{allProfiles.length}</strong> ({activeCount} Active, {pendingCount} Inactive)
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users by email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">⚠️ Pending Activation ({pendingCount})</option>
            <option value="Active">✅ Active Users ({activeCount})</option>
          </select>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="All">All Roles</option>
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading user profiles...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
          No user profiles match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">User Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredProfiles.map((prof) => {
                const isLoadingThis = actionLoadingId === prof.id;

                return (
                  <tr key={prof.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* User Email */}
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {prof.email}
                      {prof.email === 'superadmin@admin.com' && (
                        <span className="ml-2 text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                          Seeded Super Admin
                        </span>
                      )}
                    </td>

                    {/* Role Dropdown / Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isSuperAdmin && prof.email !== 'superadmin@admin.com' ? (
                        <select
                          value={prof.role}
                          disabled={isLoadingThis}
                          onChange={(e) => handleRoleSelect(prof.id, e.target.value)}
                          className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                        >
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2.5 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${getRoleBadge(
                            prof.role
                          )}`}
                        >
                          {prof.role}
                        </span>
                      )}
                    </td>

                    {/* Activation Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {prof.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Pending Activation
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      {/* Activate / Deactivate Toggle */}
                      <button
                        onClick={() => handleActivateToggle(prof)}
                        disabled={isLoadingThis}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          prof.is_active
                            ? 'bg-slate-900 text-slate-400 hover:text-amber-300 border-slate-700 hover:border-amber-800'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                        }`}
                      >
                        {isLoadingThis ? 'Saving...' : prof.is_active ? 'Deactivate' : 'Activate User'}
                      </button>

                      {/* Remove User (Disabled for main superadmin seed) */}
                      {prof.email !== 'superadmin@admin.com' && (
                        <button
                          onClick={() => handleDelete(prof)}
                          disabled={isLoadingThis}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-lg text-xs transition-all"
                          title="Remove user account"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
