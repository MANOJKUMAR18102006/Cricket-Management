import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import matchService from '../services/matchService';
import useDebounce from '../hooks/useDebounce';
import { 
  Activity, 
  Trophy, 
  Calendar, 
  MapPin, 
  PlusCircle, 
  Search, 
  Filter, 
  X, 
  ChevronRight, 
  Clock, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Coins
} from 'lucide-react';

const FORMATS = ['All', 'T10', 'T20', 'ODI', 'Custom'];

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTabParam = searchParams.get('tab') || 'live';
  const [activeTab, setActiveTab] = useState(currentTabParam); // 'live' | 'scheduled' | 'completed' | 'all'
  const [searchInput, setSearchInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('All');

  const debouncedSearch = useDebounce(searchInput, 350);

  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({ all: 0, scheduled: 0, live: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      if (selectedFormat !== 'All') {
        params.format = selectedFormat;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await matchService.getMatches(params);
      if (res.success) {
        setMatches(res.matches || []);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError(err.response?.data?.message || 'Could not fetch matches. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedFormat, debouncedSearch]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>LIVE</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getFormatBadge = (format, overs) => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-gray-900 border border-gray-800 text-gray-300">
        {format} • {overs} ov
      </span>
    );
  };

  return (
    <div className="min-h-screen py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Activity className="w-3.5 h-3.5" />
              <span>Cricket Matches & Digital Fixtures</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Match <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Center</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1">
              Explore live ball-by-ball matches, upcoming club fixtures, and past scorecard results.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={fetchMatches}
              disabled={loading}
              title="Refresh matches"
              className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="/matches/create"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Match</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-850 pb-4 mb-6">
        <button
          onClick={() => handleTabChange('live')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'live'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span>Live Matches</span>
          {counts.live > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'live' ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-400'
            }`}>
              {counts.live}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('scheduled')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'scheduled'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Matches</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'scheduled' ? 'bg-black/20 text-black font-extrabold' : 'bg-gray-800 text-gray-300'
          }`}>
            {counts.scheduled}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Completed Matches</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'completed' ? 'bg-black/20 text-black font-extrabold' : 'bg-gray-800 text-gray-300'
          }`}>
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === 'all'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>All Matches</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'all' ? 'bg-black/20 text-black font-extrabold' : 'bg-gray-800 text-gray-300'
          }`}>
            {counts.all}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-[#0c1220] border border-gray-800/90 p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search teams, venue, or city..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#070b14] border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/80"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          <span className="text-xs text-gray-500 mr-1 flex items-center gap-1 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Format:
          </span>
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFormat === fmt
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-3xl bg-[#0c1220] border border-gray-800/80 p-6 animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-gray-800 rounded-lg" />
                <div className="h-5 w-20 bg-gray-800 rounded-lg" />
              </div>
              <div className="h-16 bg-gray-850 rounded-2xl" />
              <div className="h-4 w-3/4 bg-gray-800 rounded" />
              <div className="h-4 w-1/2 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Matches Grid */}
      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {matches.map((match) => {
            const matchDate = new Date(match.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={match._id}
                onClick={() => navigate(`/matches/${match._id}`)}
                className="group relative rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-gray-800/90 hover:border-emerald-500/50 p-6 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Meta row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    {getFormatBadge(match.format, match.overs)}
                    {getStatusBadge(match.status)}
                  </div>

                  {/* Tournament if exists */}
                  {match.tournament && (
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-3 truncate">
                      🏆 {match.tournament}
                    </p>
                  )}

                  {/* Teams Matchup Box */}
                  <div className="p-4 rounded-2xl bg-[#070b14]/80 border border-gray-850 mb-4 space-y-3">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/30 border border-emerald-500/40 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                          {match.team1.charAt(0).toUpperCase()}
                        </div>
                        <span className={`text-sm font-bold truncate ${match.winner === match.team1 ? 'text-emerald-300 font-extrabold' : 'text-white'}`}>
                          {match.team1}
                        </span>
                      </div>
                      {match.winner === match.team1 && (
                        <span className="text-xs text-emerald-400 font-bold">Winner 🏆</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest px-2 py-0.5 rounded bg-gray-900 border border-gray-800">
                        VS
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500/30 to-cyan-400/30 border border-teal-500/40 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                          {match.team2.charAt(0).toUpperCase()}
                        </div>
                        <span className={`text-sm font-bold truncate ${match.winner === match.team2 ? 'text-emerald-300 font-extrabold' : 'text-white'}`}>
                          {match.team2}
                        </span>
                      </div>
                      {match.winner === match.team2 && (
                        <span className="text-xs text-emerald-400 font-bold">Winner 🏆</span>
                      )}
                    </div>
                  </div>

                  {/* Toss Result if recorded */}
                  {match.tossWinner && match.tossDecision && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90 mb-3 bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <Coins className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {match.tossWinner} chose to {match.tossDecision}
                      </span>
                    </div>
                  )}

                  {/* Result Note if completed */}
                  {match.result && (
                    <p className="text-xs font-semibold text-emerald-400/90 mb-3 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/20 truncate">
                      {match.result}
                    </p>
                  )}

                  {/* Match Schedule & Venue */}
                  <div className="space-y-1.5 text-xs text-gray-400 py-3 border-t border-gray-850">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-300 truncate">{matchDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{match.venue}, {match.city}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-gray-850 flex items-center justify-between text-xs text-gray-400 group-hover:text-emerald-400 transition-colors">
                  <span className="font-semibold">Match Details & Scorecard</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && (
        <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Matches Found</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            {activeTab === 'live'
              ? 'There are currently no live matches in progress. Check upcoming matches or schedule a new one!'
              : 'No matches found matching your current filter criteria.'}
          </p>
          <Link
            to="/matches/create"
            className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create a Cricket Match</span>
          </Link>
        </div>
      )}

    </div>
  );
}
