import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';
import AdminNav from '../components/AdminNav';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Shield,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
} from 'lucide-react';

export default function AdminTeamsPage() {
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await adminService.getTeams({
        search,
        page,
        limit: 15,
      });
      if (data.success) {
        setTeams(data.teams);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to fetch teams.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTeams();
  };

  const handleDeleteTeam = (team) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Team',
      message: `Are you sure you want to delete team "${team.name}"? This permanently removes the club and its roster.`,
      confirmText: 'Delete Team',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(team._id);
        try {
          const res = await adminService.deleteTeam(team._id);
          if (res.success) {
            toast.success(res.message);
            setTeams((prev) => prev.filter((t) => t._id !== team._id));
            setTotal((prev) => prev - 1);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Delete team failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <AdminNav activeTab="teams" />

      {/* Action feedback */}
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
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by franchise name, city, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition"
          >
            Search Teams
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-850">
          <span>
            Total cricket clubs: <strong className="text-white">{total}</strong>
          </span>
          <button
            onClick={fetchTeams}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#090e1a] text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-4 px-6">Team / Franchise</th>
                <th className="py-4 px-6">Home City</th>
                <th className="py-4 px-6">Squad Size</th>
                <th className="py-4 px-6">Matches Played</th>
                <th className="py-4 px-6">Created By</th>
                <th className="py-4 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                    <span>Loading teams...</span>
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No teams found matching search.
                  </td>
                </tr>
              ) : (
                teams.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-indigo-400 shrink-0">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            t.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{t.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-xs">{t.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span>{t.city}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-800 text-gray-300">
                        {t.membersCount || t.members?.length || 0} players
                      </span>
                    </td>

                    <td className="py-4 px-6 text-gray-300 font-mono">
                      {t.stats?.matchesCount || 0}
                    </td>

                    <td className="py-4 px-6 text-gray-400 text-[11px]">
                      {t.createdBy?.username ? `@${t.createdBy.username}` : 'System'}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/teams/${t._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                          title="View Team Roster"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteTeam(t)}
                          disabled={actionLoading === t._id}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove Inappropriate Team"
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
        confirmText="Delete Team"
        variant="danger"
        loading={actionLoading !== null}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
