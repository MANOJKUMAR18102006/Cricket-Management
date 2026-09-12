import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Shield, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';

export default function AdminNav({ activeTab }) {
  const tabs = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Players', path: '/admin/players', icon: UserCheck },
    { name: 'Teams', path: '/admin/teams', icon: Shield },
    { name: 'Matches', path: '/admin/matches', icon: Activity },
  ];

  return (
    <div className="space-y-4 mb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Admin Control <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">Hub</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                RESTRICTED
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Manage platform members, moderate inappropriate content, supervise fixtures, and oversee statistics.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.name}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-black border-transparent shadow-lg shadow-rose-500/20 font-extrabold'
                    : 'bg-[#0e1628] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
