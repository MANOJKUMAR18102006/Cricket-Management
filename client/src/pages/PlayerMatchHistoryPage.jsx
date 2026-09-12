import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import PlayerCareerTimeline from '../components/PlayerCareerTimeline';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Lock,
  Search,
  Trophy,
  UserCheck,
  UserPlus,
  Clock,
  RotateCcw,
  MapPin,
  Flame,
  Target,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const FORMAT_OPTIONS = ['All', 'T20', 'T10', 'ODI', 'Custom'];
const RESULT_OPTIONS = [
  { label: 'All Results', value: 'all' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
  { label: 'Tie / Draw', value: 'tie' },
];

export default function PlayerMatchHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isPrivateRestricted, setIsPrivateRestricted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters State
  const [formatFilter, setFormatFilter] = useState('All');
  const [tournamentFilter, setTournamentFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Player Basic Info and Connection Status
  const loadPlayerData = useCallback(async () => {
    try {
      const pRes = await playerService.getPlayerById(id);
      if (pRes.success && pRes.player) {
        setPlayer(pRes.player);
      }
    } catch (err) {
      console.warn('Failed to fetch player basic info:', err);
    }

    if (isAuthenticated) {
      try {
        const sRes = await connectionService.getStatus(id);
        if (sRes.success) {
          setConnectionStatus(sRes.status);
        }
      } catch (err) {
        console.warn('Connection status error:', err);
      }
    }
  }, [id, isAuthenticated]);

  // Fetch Match History and Timeline with active filters
  const fetchMatchesAndTimeline = useCallback(async () => {
    setLoading(true);
    setIsPrivateRestricted(false);

    try {
      const params = {
        format: formatFilter !== 'All' ? formatFilter : undefined,
        tournament: tournamentFilter.trim() || undefined,
        result: resultFilter !== 'all' ? resultFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await playerService.getPlayerMatches(id, params);
      if (res.success) {
        setMatches(res.matches || []);
        setTimeline(res.timeline || []);
        if (res.availableTournaments) {
          setAvailableTournaments(res.availableTournaments);
        }
        if (res.displayName && !player) {
          setPlayer({
            _id: res.playerId,
            displayName: res.displayName,
            playingRole: res.playingRole,
            currentTeam: res.currentTeam,
            city: res.city,
          });
        }
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.data?.privacyRestricted) {
        setIsPrivateRestricted(true);
      } else {
        console.error('Error fetching player matches:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [id, formatFilter, tournamentFilter, resultFilter, startDate, endDate, player]);

  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  useEffect(() => {
    fetchMatchesAndTimeline();
  }, [fetchMatchesAndTimeline]);

  // Handle Connect action for private profiles
  const handleSendRequest = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setActionLoading(true);
    try {
      const res = await connectionService.sendRequest(id);
      if (res.success) {
        setConnectionStatus('pending_sent');
      }
    } catch (err) {
      console.error('Failed to send connection request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFormatFilter('All');
    setTournamentFilter('');
    setResultFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    formatFilter !== 'All' ||
    tournamentFilter.trim() !== '' ||
    resultFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(`/players/${id}`)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition group w-fit"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Player Profile</span>
        </button>

        {player && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
              {player.displayName ? player.displayName[0].toUpperCase() : '🏏'}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight">
                {player.displayName}
              </h2>
              <p className="text-[11px] text-gray-400">
                {player.playingRole || 'Player'} • {player.currentTeam || 'Independent'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0d1527] via-[#0b101d] to-[#0a0e1a] border border-gray-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Trophy className="w-3.5 h-3.5" />
            <span>Match Records & Career Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Player Match History
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Every match appearance, opponent duel, scorecard performance, and career milestone
            compiled from verified digital scoring scorecards.
          </p>
        </div>
      </div>

      {/* PRIVACY LOCKED STATE */}
      {isPrivateRestricted ? (
        <div className="rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-white mb-2">
            🔒 This player's cricket statistics are private.
          </h3>

          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            Connect with this player to view their statistics.
          </p>

          <div className="flex items-center justify-center">
            {connectionStatus === 'pending_sent' ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Connection request pending</span>
              </span>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Top Section: Career Timeline Component */}
          <PlayerCareerTimeline timeline={timeline} />

          {/* Filter Bar */}
          <div className="rounded-2xl bg-[#0c1220] border border-gray-800 p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span>Filter Match History</span>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Format Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                  Format
                </label>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  {FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt === 'All' ? 'All Formats' : fmt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tournament Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                  Tournament
                </label>
                <input
                  type="text"
                  placeholder="e.g. T20 Cup, Premier..."
                  value={tournamentFilter}
                  onChange={(e) => setTournamentFilter(e.target.value)}
                  className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Result Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                  Result
                </label>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  {RESULT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500/60"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#080d1a] border border-gray-800 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Match Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Appearances</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                  {matches.length}
                </span>
              </h3>
              <span className="text-xs text-gray-500">Verified Match Performance</span>
            </div>

            {loading ? (
              <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
                <p className="text-xs text-gray-400">Loading match scorecards...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-3xl bg-[#0c1220] border border-gray-800/80 p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-800/60 text-gray-500 flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">No Matches Found</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  {hasActiveFilters
                    ? 'No matches match your active filters. Try clearing filters to view all appearances.'
                    : 'No matches have been recorded for this player yet.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((item) => {
                  const matchDate = item.date
                    ? new Date(item.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent';

                  const outcomeBadge =
                    item.outcome === 'won'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : item.outcome === 'lost'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                  return (
                    <div
                      key={item.matchId}
                      className="rounded-3xl bg-[#0a0f1d] border border-gray-800/80 hover:border-gray-700 transition-all p-5 sm:p-6 shadow-xl relative group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Match Metadata & Opponent Header */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              {item.format}
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${outcomeBadge}`}
                            >
                              {item.outcome === 'won'
                                ? 'Won'
                                : item.outcome === 'lost'
                                ? 'Lost'
                                : item.status === 'live'
                                ? 'Live'
                                : item.outcome}
                            </span>

                            <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              {matchDate}
                            </span>

                            <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              {item.venue || item.city}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400 font-semibold">Opponent:</span>
                            <h4 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition">
                              vs {item.opponent || item.team2}
                            </h4>
                          </div>

                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>{item.tournament}</span>
                            {item.result && (
                              <>
                                <span className="text-gray-600">•</span>
                                <span className="text-emerald-400/90 font-semibold">
                                  {item.result}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Flat Performance Breakdown Cards */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#0c1426] p-3.5 rounded-2xl border border-gray-800/80 self-stretch lg:self-auto">
                          {/* Runs & Balls */}
                          <div className="p-2.5 rounded-xl bg-[#080d1a] border border-gray-800 text-center min-w-[70px]">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              Runs
                            </span>
                            <span className="text-sm font-black text-white">
                              {item.runs}{' '}
                              <span className="text-[10px] font-normal text-gray-400">
                                ({item.balls}b)
                              </span>
                            </span>
                          </div>

                          {/* Strike Rate */}
                          <div className="p-2.5 rounded-xl bg-[#080d1a] border border-gray-800 text-center min-w-[65px]">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              SR
                            </span>
                            <span className="text-xs font-black text-emerald-400">
                              {item.strikeRate || '0.00'}
                            </span>
                          </div>

                          {/* Wickets & Overs */}
                          <div className="p-2.5 rounded-xl bg-[#080d1a] border border-gray-800 text-center min-w-[70px]">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              Wickets
                            </span>
                            <span className="text-sm font-black text-teal-400">
                              {item.wickets}{' '}
                              <span className="text-[10px] font-normal text-gray-400">
                                ({item.overs} ov)
                              </span>
                            </span>
                          </div>

                          {/* Catches */}
                          <div className="p-2.5 rounded-xl bg-[#080d1a] border border-gray-800 text-center min-w-[60px]">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">
                              Catches
                            </span>
                            <span className="text-sm font-black text-amber-400">
                              {item.catches}
                            </span>
                          </div>

                          {/* View Scorecard Button */}
                          <Link
                            to={`/matches/${item.matchId}`}
                            className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold text-xs transition flex items-center gap-1 ml-auto"
                            title="View match scorecard"
                          >
                            <span>Scorecard</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
