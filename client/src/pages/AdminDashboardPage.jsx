import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import AdminNav from '../components/AdminNav';
import {
  Users,
  UserCheck,
  Shield,
  Activity,
  Trophy,
  CheckCircle2,
  Radio,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [tournamentsList, setTournamentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboardStats();
      if (data.success) {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
        setRecentMatches(data.recentMatches || []);
        setTournamentsList(data.tournamentsList || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-cyan-400',
      path: '/admin/users',
      label: 'Manage Accounts',
    },
    {
      title: 'Total Players',
      value: stats?.totalPlayers ?? 0,
      icon: UserCheck,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      path: '/admin/players',
      label: 'Moderate Profiles',
    },
    {
      title: 'Total Teams',
      value: stats?.totalTeams ?? 0,
      icon: Shield,
      color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30 text-indigo-400',
      path: '/admin/teams',
      label: 'Manage Clubs',
    },
    {
      title: 'Total Matches',
      value: stats?.totalMatches ?? 0,
      icon: Activity,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      path: '/admin/matches',
      label: 'Oversee Fixtures',
    },
    {
      title: 'Completed Matches',
      value: stats?.completedMatches ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-lime-500/20 border-emerald-500/30 text-emerald-300',
      path: '/admin/matches?status=completed',
      label: 'Scorecards & Stats',
    },
    {
      title: 'Live Matches',
      value: stats?.liveMatches ?? 0,
      icon: Radio,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      badge: (stats?.liveMatches || 0) > 0 ? 'LIVE NOW' : null,
      path: '/admin/matches?status=live',
      label: 'Monitor Live Games',
    },
    {
      title: 'Total Tournaments',
      value: stats?.totalTournaments ?? 0,
      icon: Trophy,
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-yellow-400',
      path: '/admin/matches',
      label: 'Tournaments Tracked',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <AdminNav activeTab="overview" />

      {/* Loading state */}
      {loading && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-400 rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading admin metrics...</p>
        </div>
      )}

      {/* Error notification */}
      {error && !loading && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <button
            onClick={fetchStats}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-white transition"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-8">
          {/* Top Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.path}
                  className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 flex flex-col justify-between hover:border-gray-700 hover:scale-[1.01] transition-all shadow-xl group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {card.title}
                      </p>
                      <h3 className="text-3xl sm:text-4xl font-black text-white">
                        {card.value.toLocaleString()}
                      </h3>
                    </div>
                    <div className={`p-3 rounded-2xl bg-gradient-to-tr ${card.color} border shadow-inner`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800/80 text-xs font-medium text-gray-400 group-hover:text-white transition">
                    <span>{card.label}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Secondary Layout: Recent Users & Recent Matches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Registrations */}
            <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Recent Registrations</h3>
                </div>
                <Link to="/admin/users" className="text-xs text-cyan-400 hover:underline">
                  View All ({stats.totalUsers})
                </Link>
              </div>

              {recentUsers.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No recent registrations.</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((u) => (
                    <div
                      key={u._id}
                      className="p-3 rounded-2xl bg-[#080d1a] border border-gray-850 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-sm text-cyan-400">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{u.username}</p>
                          <p className="text-[11px] text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            u.status === 'disabled'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {u.status || 'active'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-gray-800 text-gray-300">
                          {u.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Matches */}
            <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Recent Match Fixtures</h3>
                </div>
                <Link to="/admin/matches" className="text-xs text-amber-400 hover:underline">
                  View All ({stats.totalMatches})
                </Link>
              </div>

              {recentMatches.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No matches recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((m) => (
                    <div
                      key={m._id}
                      className="p-3 rounded-2xl bg-[#080d1a] border border-gray-850 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">
                          {m.team1} <span className="text-gray-500">vs</span> {m.team2}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {m.format} • {m.tournament || 'Independent'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          m.status === 'live'
                            ? 'bg-rose-500 text-white animate-pulse'
                            : m.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
