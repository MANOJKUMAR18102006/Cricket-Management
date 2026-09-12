import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import AdminNav from '../components/AdminNav';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  UserCheck,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

export default function AdminPlayersPage() {
  const { toast } = useToast();
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPlayers({
        search,
        role,
        page,
        limit: 15,
      });
      if (data.success) {
        setPlayers(data.players);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to fetch players.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [page, role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPlayers();
  };

  const handleDeletePlayer = (player) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Player Profile',
      message: `Are you sure you want to remove player profile for "${player.displayName}"? This permanently removes their career stats and public profile.`,
      confirmText: 'Remove Profile',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(player._id);
        try {
          const res = await adminService.deletePlayer(player._id);
          if (res.success) {
            toast.success(res.message);
            setPlayers((prev) => prev.filter((p) => p._id !== player._id));
            setTotal((prev) => prev - 1);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Delete player profile failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <AdminNav activeTab="players" />

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-5 mb-6 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by player name, @username, or current team..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Playing Roles</option>
              <option value="Batter">Batter</option>
              <option value="Bowler">Bowler</option>
              <option value="All-Rounder">All-Rounder</option>
              <option value="Wicketkeeper">Wicketkeeper</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-850">
          <span>
            Total registered cricketers: <strong className="text-white">{total}</strong>
          </span>
          <button
            onClick={fetchPlayers}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#090e1a] text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-4 px-6">Player</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Team</th>
                <th className="py-4 px-6">City</th>
                <th className="py-4 px-6">Visibility</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                    <span>Loading cricketers...</span>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No players found matching your criteria.
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                          {p.profileImage ? (
                            <img src={p.profileImage} alt={p.displayName} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            p.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{p.displayName}</p>
                          <p className="text-[10px] text-gray-400">@{p.username || 'unknown'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-800 text-gray-300">
                        {p.playingRole}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-gray-300">
                      {p.currentTeam || 'Independent'}
                    </td>

                    <td className="py-4 px-6 text-gray-400">
                      {p.city || '—'}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.profileVisibility === 'public'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {p.profileVisibility || 'private'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/players/${p._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                          title="View Public Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeletePlayer(p)}
                          disabled={actionLoading === p._id}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove Inappropriate Profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 disabled:opacity-40 hover:text-white"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Remove Profile"
        variant="danger"
        loading={actionLoading !== null}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
