import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import analyticsService from '../services/analyticsService';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import LoginPromptModal from '../components/LoginPromptModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  Activity,
  Flame,
  Target,
  Zap,
  Lock,
  UserPlus,
  Clock,
  ArrowLeft,
  Layers,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Award,
  Users,
} from 'lucide-react';

const FORMAT_OPTIONS = ['all', 'T10', 'T20', 'ODI', 'Custom'];

// Custom Dark Tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-[#0a0f1d] border border-gray-700/80 shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-bold text-gray-200 border-b border-gray-800 pb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
              />
              {entry.name}:
            </span>
            <span className="font-extrabold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PlayerAnalyticsPage() {
  const { id: urlPlayerId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activePlayerId, setActivePlayerId] = useState(urlPlayerId || null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrivacyLocked, setIsPrivacyLocked] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [actionLoading, setActionLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Filters
  const [format, setFormat] = useState('all');
  const [tournament, setTournament] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Connected players dropdown list
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);

  // Resolve active player ID (defaults to own player profile if authenticated, or first public player if guest)
  useEffect(() => {
    let isMounted = true;
    const resolveInitialPlayer = async () => {
      try {
        if (!urlPlayerId) {
          if (isAuthenticated) {
            const myProfile = await playerService.getMyPlayer();
            if (myProfile.success && (myProfile.data || myProfile.player) && isMounted) {
              const p = myProfile.data || myProfile.player;
              setActivePlayerId(p._id);
              setMyPlayerId(p._id);
            }
          } else {
            // For guests navigating to /analytics without an ID, load the first public player!
            const playersRes = await playerService.getPlayers({ limit: 1 });
            const firstPlayer = playersRes.data?.players?.[0] || playersRes.players?.[0];
            if (firstPlayer && isMounted) {
              setActivePlayerId(firstPlayer._id);
            }
          }
        } else {
          setActivePlayerId(urlPlayerId);
        }

        // Fetch user's connected players for easy switching
        if (isAuthenticated) {
          const connRes = await connectionService.getConnections();
          if (connRes.success && isMounted) {
            setConnectedPlayers(connRes.data || connRes.connections || []);
          }
        }
      } catch (err) {
        // Handled silently
      }
    };
    resolveInitialPlayer();
    return () => {
      isMounted = false;
    };
  }, [urlPlayerId, isAuthenticated]);

  // Fetch player analytics
  const fetchAnalytics = useCallback(async () => {
    if (!activePlayerId) return;

    setLoading(true);
    setError(null);
    setIsPrivacyLocked(false);

    try {
      const params = {};
      if (format && format !== 'all') params.format = format;
      if (tournament.trim()) params.tournament = tournament.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await analyticsService.getPlayerAnalytics(activePlayerId, params);
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.data?.privacyRestricted)) {
        setIsPrivacyLocked(true);
        setPrivacyMessage(
          err.response.data?.message || "This player's cricket statistics are private. Connect with this player to view their analytics."
        );
        // Check relationship status
        try {
          const statusRes = await connectionService.getStatus(activePlayerId);
          if (statusRes.success) {
            setConnectionStatus(statusRes.status);
          }
        } catch {
          // Silent catch
        }
      } else {
        setError(err.response?.data?.message || 'Failed to load player analytics.');
      }
    } finally {
      setLoading(false);
    }
  }, [activePlayerId, format, tournament, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSendConnection = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setActionLoading(true);
    try {
      const res = await connectionService.sendRequest(activePlayerId);
      if (res.success) {
        setConnectionStatus('pending_sent');
        toast.success('Connection request sent.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send connection request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchPlayer = (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      setActivePlayerId(selectedId);
      navigate(`/players/${selectedId}/analytics`);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8">
        {/* Top Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to={activePlayerId ? `/players/${activePlayerId}` : '/players'}
                className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition"
                title="Back to Profile"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30">
                <Activity className="w-3.5 h-3.5" />
                <span>Performance Intelligence</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Cricket <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">Analytics Dashboard</span>
            </h1>
            <p className="text-sm text-gray-400 max-w-xl">
              In-depth performance trends, match-by-match run trajectories, strike rate consistency, and bowling impact.
            </p>
          </div>

          {/* Player Switcher & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {connectedPlayers.length > 0 && (
              <div className="relative">
                <select
                  value={activePlayerId || ''}
                  onChange={handleSwitchPlayer}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-200 focus:outline-none focus:border-cyan-500/50"
                >
                  {myPlayerId && <option value={myPlayerId}>👑 Your Analytics</option>}
                  {connectedPlayers.map((conn) => {
                    const friend = conn.player;
                    if (!friend) return null;
                    return (
                      <option key={String(friend._id)} value={friend._id}>
                        🏏 {friend.displayName} ({friend.currentTeam || 'Player'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                showFilters || format !== 'all' || tournament || startDate || endDate
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(format !== 'all' || tournament || startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-md space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tournament</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tournament}
                    onChange={(e) => setTournament(e.target.value)}
                    placeholder="e.g. State Trophy, IPL"
                    className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Format Pills */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      format === f
                        ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {f === 'all' ? 'All Formats' : f}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setFormat('all');
                  setTournament('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-gray-400 hover:text-cyan-400 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Computing player performance trajectories...</p>
          </div>
        ) : isPrivacyLocked ? (
          /* PRIVACY RESTRICTED SCREEN */
          <div className="py-16 px-6 max-w-xl mx-auto text-center rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] border border-gray-800 shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Private Performance Analytics</h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">{privacyMessage}</p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {!isAuthenticated ? (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 transition active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign in to Connect</span>
                </button>
              ) : connectionStatus === 'pending_sent' ? (
                <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span>Connection Request Pending</span>
                </span>
              ) : (
                <button
                  onClick={handleSendConnection}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Connect with this player</span>
                </button>
              )}

              <Link
                to="/leaderboards"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-900 border border-gray-800 transition"
              >
                Browse Leaderboards
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Player Info Glance Bar */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0c1426] to-[#080d1a] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-xl text-cyan-400 overflow-hidden shadow-md">
                  {analytics.player.profileImage ? (
                    <img
                      src={analytics.player.profileImage}
                      alt={analytics.player.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    analytics.player.displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{analytics.player.displayName}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {analytics.player.playingRole}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    {analytics.player.currentTeam || 'Free Agent'} • {analytics.player.city || 'District Player'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-gray-800 pt-3 sm:pt-0 sm:pl-6">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500">Scanned Matches</span>
                  <span className="text-lg font-black text-white">{analytics.totalMatches}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-500">Active Format</span>
                  <span className="text-lg font-black text-cyan-400">{format === 'all' ? 'Overall' : format}</span>
                </div>
              </div>
            </div>

            {/* 1. RECENT FORM (Visual Badges) */}
            <div className="rounded-3xl bg-[#090e1a] border border-gray-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-bold text-white">Recent Form (Last 5 Fixtures)</h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">Chronological order (Newest first)</span>
              </div>

              {analytics.recentForm.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No recent match performances recorded yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {analytics.recentForm.map((match, i) => (
                    <div
                      key={`form-${match.matchId}-${i}`}
                      className="p-3.5 rounded-2xl bg-gradient-to-b from-gray-900/90 to-[#0c1220] border border-gray-800 flex flex-col justify-between space-y-2 hover:border-gray-700 transition"
                    >
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-300 truncate max-w-[80px]">vs {match.opponent}</span>
                        <span className="text-[10px] text-gray-500">{match.date}</span>
                      </div>

                      <div className="text-center py-1">
                        <span className="text-base font-black text-amber-400 tracking-tight">
                          {match.badge}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800/60">
                        <span>{match.tournament || 'Match'}</span>
                        <span className="font-bold text-cyan-400">+{match.impactScore} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 2. RUNS PER MATCH & CUMULATIVE RUNS */}
              <div className="rounded-3xl bg-[#090e1a] border border-gray-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Runs Per Match & Career Trajectory</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Batting Trend
                  </span>
                </div>

                {analytics.runsPerMatch.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                    No batting data available for selected criteria.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.runsPerMatch} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area
                          type="monotone"
                          dataKey="runs"
                          name="Match Runs"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#runsGradient)"
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulativeRuns"
                          name="Cumulative Runs"
                          stroke="#38bdf8"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 3. STRIKE RATE TREND */}
              <div className="rounded-3xl bg-[#090e1a] border border-gray-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Strike Rate Trend vs Career Average</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Scoring Velocity
                  </span>
                </div>

                {analytics.strikeRateTrend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                    No strike rate data available for selected criteria.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.strikeRateTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Line
                          type="monotone"
                          dataKey="matchStrikeRate"
                          name="Match SR"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#06b6d4' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulativeStrikeRate"
                          name="Rolling SR"
                          stroke="#a855f7"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 4. WICKETS TREND & ECONOMY */}
              <div className="rounded-3xl bg-[#090e1a] border border-gray-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Wickets Trend & Bowling Impact</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Bowling Control
                  </span>
                </div>

                {analytics.wicketsTrend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                    No bowling data available for selected criteria.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.wicketsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="wickets" name="Wickets Taken" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Line
                          type="monotone"
                          dataKey="economy"
                          name="Economy (RPO)"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 5. PERFORMANCE OVER TIME (UNIFIED IMPACT) */}
              <div className="rounded-3xl bg-[#090e1a] border border-gray-800 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Overall Performance Impact Index</h3>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Weighted Rating
                  </span>
                </div>

                {analytics.performanceOverTime.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                    No performance data available for selected criteria.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.performanceOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area
                          type="monotone"
                          dataKey="impactScore"
                          name="Impact Score"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#impactGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Login Prompt Modal for Guests */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Sign in to connect with players."
        actionText="Sign In to Connect"
      />
    </div>
  );
}
