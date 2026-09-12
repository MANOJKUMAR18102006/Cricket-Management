import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import adminService from '../services/adminService';
import AdminNav from '../components/AdminNav';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Activity,
  Search,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Radio,
  Trophy,
} from 'lucide-react';

export default function AdminMatchesPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [matches, setMatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [format, setFormat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await adminService.getMatches({
        search,
        status,
        format,
        page,
        limit: 15,
      });
      if (data.success) {
        setMatches(data.matches);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to fetch matches.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [page, status, format]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMatches();
  };

  const handleStatusChange = async (matchId, nextStatus) => {
    setActionLoading(matchId);
    try {
      const res = await adminService.updateMatchStatus(matchId, nextStatus);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setMatches((prev) =>
          prev.map((m) => (m._id === matchId ? { ...m, status: nextStatus } : m))
        );
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Status update failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMatch = (match) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Match Fixture',
      message: `Are you sure you want to delete match fixture "${match.team1} vs ${match.team2}"? This permanently removes scorecards and statistical records.`,
      confirmText: 'Delete Match',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(match._id);
        try {
          const res = await adminService.deleteMatch(match._id);
          if (res.success) {
            toast.success(res.message);
            setMatches((prev) => prev.filter((m) => m._id !== match._id));
            setTotal((prev) => prev - 1);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Delete match failed.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <AdminNav activeTab="matches" />

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
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team, venue, tournament, or city..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setSearchParams(e.target.value === 'all' ? {} : { status: e.target.value });
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Match Statuses</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="live">Live Matches</option>
              <option value="completed">Completed Matches</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>

          <div>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-[#070b14] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
            >
              <option value="all">All Formats</option>
              <option value="T20">T20</option>
              <option value="T10">T10</option>
              <option value="ODI">ODI</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-850">
          <span>
            Total matching fixtures: <strong className="text-white">{total}</strong>
          </span>
          <button
            onClick={fetchMatches}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Matches Table */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#090e1a] text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-4 px-6">Match Fixture</th>
                <th className="py-4 px-6">Format & Overs</th>
                <th className="py-4 px-6">Tournament</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Venue & Date</th>
                <th className="py-4 px-6 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                    <span>Loading matches...</span>
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No matches found matching criteria.
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m._id} className="hover:bg-gray-800/30 transition">
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">
                          {m.team1} <span className="text-gray-500 font-normal">vs</span> {m.team2}
                        </p>
                        {m.result && (
                          <p className="text-[10px] text-emerald-400 font-medium">{m.result}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-800 text-gray-300">
                        {m.format} • {m.overs} ov
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {m.tournament ? (
                        <span className="inline-flex items-center gap-1 text-gray-300 font-medium">
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{m.tournament}</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Independent</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <select
                        value={m.status}
                        onChange={(e) => handleStatusChange(m._id, e.target.value)}
                        disabled={actionLoading === m._id}
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          m.status === 'live'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : m.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        <option value="scheduled" className="bg-[#0e1628]">Scheduled</option>
                        <option value="live" className="bg-[#0e1628]">Live</option>
                        <option value="completed" className="bg-[#0e1628]">Completed</option>
                        <option value="abandoned" className="bg-[#0e1628]">Abandoned</option>
                      </select>
                    </td>

                    <td className="py-4 px-6 text-gray-400 text-[11px]">
                      <p className="text-gray-300">{m.venue}, {m.city}</p>
                      <p className="text-[10px] text-gray-500">{new Date(m.date).toLocaleDateString()}</p>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/matches/${m._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                          title="View Match Scorecard"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteMatch(m)}
                          disabled={actionLoading === m._id}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete Inappropriate Match"
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
        confirmText="Delete Match"
        variant="danger"
        loading={actionLoading !== null}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
