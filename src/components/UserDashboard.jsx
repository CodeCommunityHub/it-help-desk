import { useState } from 'react';
import NewTicketForm from './NewTicketForm';
import TicketList from './TicketList';

export default function UserDashboard({ user }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTicketCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Overview Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">User Portal Dashboard</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/80 rounded-full uppercase tracking-wider">
                Requester View
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Submit new IT service requests and track your ticket status in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* New Ticket Form (5 cols on desktop) */}
        <div className="lg:col-span-5">
          <NewTicketForm user={user} onTicketCreated={handleTicketCreated} />
        </div>

        {/* Ticket List (7 cols on desktop) */}
        <div className="lg:col-span-7">
          <TicketList user={user} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
