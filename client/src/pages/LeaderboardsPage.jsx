import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import analyticsService from '../services/analyticsService';
import {
  Trophy,
  Flame,
  Target,
  Zap,
  TrendingUp,
  Award,
  Shield,
  Filter,
  Search,
  Calendar,
  Layers,
  Lock,
  Medal,
  ChevronRight,
  BarChart2,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'topRunScorers',
    name: 'Top Run Scorers',
    statKey: 'runs',
    statLabel: 'Runs',
    icon: Flame,
    color: 'text-amber-400',
    bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    accentColor: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'topWicketTakers',
    name: 'Top Wicket Takers',
    statKey: 'wickets',
    statLabel: 'Wickets',
    icon: Target,
    color: 'text-purple-400',
    bgBadge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    accentColor: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'bestBattingAverage',
    name: 'Best Batting Average',
    statKey: 'battingAverage',
    statLabel: 'Average',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accentColor: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'bestStrikeRate',
    name: 'Best Strike Rate',
    statKey: 'strikeRate',
    statLabel: 'Strike Rate',
    icon: Zap,
    color: 'text-cyan-400',
    bgBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    accentColor: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'mostSixes',
    name: 'Most Sixes',
    statKey: 'sixes',
    statLabel: 'Sixes',
    icon: Flame,
    color: 'text-rose-400',
    bgBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    accentColor: 'from-rose-500/20 via-red-500/10 to-transparent',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'mostFours',
    name: 'Most Fours',
    statKey: 'fours',
    statLabel: 'Fours',
    icon: Award,
    color: 'text-blue-400',
    bgBadge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    accentColor: 'from-blue-500/20 via-indigo-500/10 to-transparent',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'mostCatches',
    name: 'Most Catches',
    statKey: 'catches',
    statLabel: 'Catches',
    icon: Shield,
    color: 'text-teal-400',
    bgBadge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    accentColor: 'from-teal-500/20 via-emerald-500/10 to-transparent',
    borderColor: 'border-teal-500/30',
  },
  {
    id: 'bestEconomy',
    name: 'Best Economy',
    statKey: 'economy',
    statLabel: 'Economy',
    icon: Trophy,
    color: 'text-indigo-400',
    bgBadge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    accentColor: 'from-indigo-500/20 via-purple-500/10 to-transparent',
    borderColor: 'border-indigo-500/30',
  },
];

const FORMAT_OPTIONS = ['all', 'T10', 'T20', 'ODI', 'Custom'];

export default function LeaderboardsPage() {
  const [activeCategory, setActiveCategory] = useState('topRunScorers');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [format, setFormat] = useState('all');
  const [tournament, setTournament] = useState('');
  const [team, setTeam] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLeaderboards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (format && format !== 'all') params.format = format;
      if (tournament.trim()) params.tournament = tournament.trim();
      if (team.trim()) params.team = team.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await analyticsService.getLeaderboards(params);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboards.');
    } finally {
      setLoading(false);
    }
  }, [format, tournament, team, startDate, endDate]);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const handleClearFilters = () => {
    setFormat('all');
    setTournament('');
    setTeam('');
    setStartDate('');
    setEndDate('');
  };

  const currentCategoryConfig = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
  const currentLeaderboard = data ? data[activeCategory] || [] : [];
  const topThree = currentLeaderboard.slice(0, 3);
  const remainingPlayers = currentLeaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#060a12] text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>Cricket Excellence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              CrickPulse <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Leaderboards</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              Rankings across completed fixtures, dynamic averages, scoring milestones, and bowling masterclasses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                showFilters || format !== 'all' || tournament || team || startDate || endDate
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(format !== 'all' || tournament || team || startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={fetchLeaderboards}
              disabled={loading}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition"
              title="Refresh Leaderboards"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Privacy Note Guarantee */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300/90 text-xs">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-emerald-300">Privacy Guaranteed: </span>
            Leaderboards strictly honor account privacy. Public players and accepted connections from your network appear in rankings. Private player stats are never disclosed to unauthorized viewers.
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-md space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tournament */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tournament</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tournament}
                    onChange={(e) => setTournament(e.target.value)}
                    placeholder="e.g. State Trophy, IPL"
                    className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Team */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Team Name</label>
                <div className="relative">
                  <Shield className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="e.g. Chennai Kings"
                    className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#090d16] border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Format Pills & Clear */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/60">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-xs text-gray-400 mr-2 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-400" />
                  Format:
                </span>
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      format === f
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Overall' : f}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClearFilters}
                className="text-xs text-gray-400 hover:text-amber-400 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* 8 Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  isActive
                    ? `${cat.bgBadge} ${cat.borderColor} shadow-lg shadow-black/40`
                    : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? cat.color : 'text-gray-500'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Crunching cricket leaderboard data...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button
              onClick={fetchLeaderboards}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : currentLeaderboard.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-gray-900/40 border border-gray-800/80 p-8 space-y-4">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-300">No qualifying match records found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No completed match performances match the selected tournament, format, or date filters for {currentCategoryConfig.name}. Try expanding your search filters.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top 3 Podium (Visual Showcase) */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                {topThree.map((player, idx) => {
                  const medalColors = [
                    'text-amber-400 bg-amber-500/10 border-amber-500/30', // 1st Gold
                    'text-slate-300 bg-slate-400/10 border-slate-400/30', // 2nd Silver
                    'text-amber-600 bg-amber-700/10 border-amber-700/30', // 3rd Bronze
                  ];
                  const rankLabels = ['1st Place', '2nd Place', '3rd Place'];

                  return (
                    <div
                      key={String(player.playerId)}
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b ${currentCategoryConfig.accentColor} bg-[#0c1220] border ${currentCategoryConfig.borderColor} p-6 flex flex-col justify-between hover:scale-[1.01] transition shadow-xl`}
                    >
                      {/* Top Rank Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${medalColors[idx]}`}>
                          <Medal className="w-3.5 h-3.5" />
                          <span>{rankLabels[idx]}</span>
                        </span>

                        <span className="text-xs font-medium text-gray-400">
                          {player.matches} {player.matches === 1 ? 'match' : 'matches'}
                        </span>
                      </div>

                      {/* Player Info */}
                      <div className="flex items-center gap-4 my-6">
                        <div className="w-16 h-16 rounded-2xl bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-2xl font-black text-amber-400 overflow-hidden shrink-0 shadow-md">
                          {player.profileImage ? (
                            <img
                              src={player.profileImage}
                              alt={player.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            player.displayName.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/players/${player.playerId}`}
                            className="text-base font-bold text-white hover:text-amber-400 transition truncate block"
                          >
                            {player.displayName}
                          </Link>
                          <p className="text-xs text-gray-400 truncate">
                            {player.currentTeam || 'Free Agent'}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300">
                            {player.playingRole}
                          </span>
                        </div>
                      </div>

                      {/* Stat Value Callout */}
                      <div className="flex items-baseline justify-between pt-4 border-t border-gray-800/80">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {currentCategoryConfig.statLabel}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-black ${currentCategoryConfig.color}`}>
                            {player.statValue}
                          </span>
                          {currentCategoryConfig.id === 'bestStrikeRate' && (
                            <span className="text-xs text-gray-400 font-bold">%</span>
                          )}
                        </div>
                      </div>

                      {/* Quick Links */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800/40">
                        <Link
                          to={`/players/${player.playerId}/analytics`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-gray-300 bg-gray-900/90 hover:bg-gray-800 hover:text-white transition border border-gray-800"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Analytics</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Remaining Ranked Table */}
            {remainingPlayers.length > 0 && (
              <div className="rounded-3xl bg-[#090e1a] border border-gray-800/80 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Top Contenders (Ranks 4 to {currentLeaderboard.length})</span>
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    Showing top performers
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-6 text-center w-16">Rank</th>
                        <th className="py-3 px-6">Player</th>
                        <th className="py-3 px-6 hidden sm:table-cell">Team</th>
                        <th className="py-3 px-6 hidden md:table-cell">Role</th>
                        <th className="py-3 px-6 text-center">Matches</th>
                        <th className="py-3 px-6 text-right font-bold text-white">
                          {currentCategoryConfig.statLabel}
                        </th>
                        <th className="py-3 px-6 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40 text-xs">
                      {remainingPlayers.map((player) => (
                        <tr
                          key={String(player.playerId)}
                          className="hover:bg-gray-800/30 transition group"
                        >
                          <td className="py-3.5 px-6 text-center font-bold text-gray-400">
                            #{player.rank}
                          </td>

                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-300 shrink-0 overflow-hidden">
                                {player.profileImage ? (
                                  <img
                                    src={player.profileImage}
                                    alt={player.displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  player.displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <Link
                                to={`/players/${player.playerId}`}
                                className="font-semibold text-gray-200 group-hover:text-amber-400 transition"
                              >
                                {player.displayName}
                              </Link>
                            </div>
                          </td>

                          <td className="py-3.5 px-6 text-gray-400 hidden sm:table-cell">
                            {player.currentTeam || 'Free Agent'}
                          </td>

                          <td className="py-3.5 px-6 text-gray-400 hidden md:table-cell">
                            <span className="px-2 py-0.5 rounded bg-gray-800/80 text-[11px] text-gray-300">
                              {player.playingRole}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 text-center text-gray-300 font-medium">
                            {player.matches}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <span className={`font-black text-sm ${currentCategoryConfig.color}`}>
                              {player.statValue}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 text-center">
                            <Link
                              to={`/players/${player.playerId}/analytics`}
                              className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                              title="Player Analytics"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
