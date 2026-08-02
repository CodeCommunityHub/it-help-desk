import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import StaffDashboard from './components/StaffDashboard';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState('user'); // Default fallback role
  const [isActive, setIsActive] = useState(true); // Account activation status
  const [activeViewRole, setActiveViewRole] = useState(null); // Quick role preview switcher
  const [activationError, setActivationError] = useState(null);

  // Fetch role and activation status from `profiles` table upon authentication
  const fetchUserRoleAndStatus = useCallback(async (userId, userEmail) => {
    if (!userId) return;
    setRoleLoading(true);
    setActivationError(null);

    const cleanEmail = userEmail?.toLowerCase();

    try {
      // 1. Fetch user profile from `profiles` table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profile role & status:', error.message);
      }

      if (profile) {
        setUserRole(profile.role || 'user');
        setActiveViewRole(profile.role || 'user');

        // Check account activation (Seed super admin is auto-active)
        const activeStatus = profile.is_active ?? (cleanEmail === 'superadmin@admin.com');
        setIsActive(activeStatus);

        if (!activeStatus) {
          setActivationError(
            'Your account is currently PENDING ACTIVATION by an Administrator. Access to the portal is restricted until an Admin activates your profile.'
          );
        }
      } else {
        // If profile doesn't exist yet (auto-upsert)
        const defaultRole = cleanEmail === 'superadmin@admin.com' ? 'super_admin' : 'user';
        const defaultActive = cleanEmail === 'superadmin@admin.com';

        setUserRole(defaultRole);
        setActiveViewRole(defaultRole);
        setIsActive(defaultActive);

        await supabase.from('profiles').upsert({
          id: userId,
          email: userEmail,
          role: defaultRole,
          is_active: defaultActive,
        });

        if (!defaultActive) {
          setActivationError(
            'Your account is currently PENDING ACTIVATION by an Administrator. Access to the portal is restricted until an Admin activates your profile.'
          );
        }
      }
    } catch (err) {
      console.error('Role & status fetch exception:', err);
      setUserRole('user');
      setActiveViewRole('user');
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRoleAndStatus(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserRoleAndStatus(session.user.id, session.user.email);
      } else {
        setUserRole('user');
        setActiveViewRole(null);
        setIsActive(true);
        setActivationError(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoleAndStatus]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActivationError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-2xl mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-200">Initializing IT Support Portal...</p>
          <p className="text-xs text-slate-500 mt-1">Verifying activation status & RBAC permissions</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const user = session.user;

  // Inactive User Activation Guard Screen
  if (!isActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-slate-900/90 border border-amber-800/60 rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-700/80 text-amber-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Account Pending Activation</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {activationError ||
                'Your account has been created, but it requires activation by an IT Admin or Super Admin before you can access help desk features.'}
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs space-y-1.5 text-slate-300">
            <p><strong>Registered Email:</strong> {user.email}</p>
            <p><strong>Account Status:</strong> <span className="text-amber-400 font-semibold">Inactive (Pending Admin Action)</span></p>
            <p className="text-[11px] text-slate-500 pt-1">
              Contact your system administrator or Super Admin to request account activation.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => fetchUserRoleAndStatus(user.id, user.email)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs rounded-xl transition-all active:scale-95"
            >
              Check Activation Status
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentDisplayRole = activeViewRole || userRole;

  // Helper badge styling per role
  const getRoleBadgeStyle = (role) => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-slate-900 to-purple-900 border border-slate-700/60 shadow-md flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">IT Help Desk</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-md uppercase tracking-wider">
                  Iteration 3
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Enterprise IT Service & Support Portal</p>
            </div>
          </div>

          {/* User Info, Active Role & Quick Switcher */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Active DB Role Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">Signed in:</span>
              <span className="font-medium text-slate-200 truncate max-w-[140px]">{user.email}</span>
              <span className={`ml-1 px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${getRoleBadgeStyle(userRole)}`}>
                {roleLoading ? '...' : userRole}
              </span>
            </div>

            {/* Quick Role View Preview Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-semibold uppercase px-2 hidden sm:inline">
                View Mode:
              </span>
              {['user', 'staff', 'admin', 'super_admin'].map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveViewRole(r)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all capitalize ${
                    currentDisplayRole === r
                      ? r === 'super_admin'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : r === 'admin'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : r === 'staff'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Switch view mode to ${r}`}
                >
                  {r === 'super_admin' ? 'Super Admin' : r}
                </button>
              ))}
            </div>

            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Role-Based Dashboard View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentDisplayRole === 'user' && <UserDashboard user={user} />}
        {currentDisplayRole === 'staff' && <StaffDashboard user={user} />}
        {currentDisplayRole === 'admin' && <AdminDashboard user={user} />}
        {currentDisplayRole === 'super_admin' && <SuperAdminDashboard user={user} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>
            IT Service Help Desk • Role Hierarchy & User Activation • Powered by React & Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
