import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import teamService from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Plus,
  Search,
  MapPin,
  Users,
  Trophy,
  Crown,
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function TeamsPage() {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (selectedCity !== 'all') {
        params.city = selectedCity;
      }

      const res = await teamService.getTeams(params);
      if (res.success) {
        setTeams(res.teams || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.response?.data?.message || 'Failed to load teams. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedCity]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTeams]);

  const cities = ['all', 'Mumbai', 'Bengaluru', 'Chennai', 'Delhi', 'Ahmedabad', 'Pune'];

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Hero */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Shield className="w-4 h-4" />
              <span>CrickPulse Franchises & Clubs</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Cricket Teams
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Explore cricket clubs, review squad rosters, match records, and franchise captains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? '/teams/create' : '/login'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search team name, city, or franchise..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* City Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition appearance-none cursor-pointer"
            >
              {cities.map((city) => (
                <option key={city} value={city} className="bg-[#0e1526]">
                  {city === 'all' ? 'All Cities' : city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing <strong className="text-gray-200">{teams.length}</strong> of{' '}
            <strong className="text-gray-200">{totalCount}</strong> teams
          </span>
          {(searchTerm || selectedCity !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCity('all');
                setPage(1);
              }}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading cricket teams...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <span>{error}</span>
            <button
              onClick={fetchTeams}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs ml-auto transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Teams Grid */}
        {!loading && !error && teams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const matchesCount = team.stats?.matchesCount || 0;
              const wins = team.stats?.wins || 0;
              const losses = team.stats?.losses || 0;
              const memberCount = team.membersCount || 0;

              return (
                <div
                  key={team._id}
                  className="bg-[#0e1526]/80 hover:bg-[#0e1526] border border-gray-800/90 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/5 group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top row: Logo & City */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-800 border border-gray-700/60 overflow-hidden flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                              }}
                            />
                          ) : (
                            <Shield className="w-7 h-7 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {team.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-400" />
                            <span>{team.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Record Pill */}
                      <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                        {wins}W - {losses}L
                      </div>
                    </div>

                    {/* Description */}
                    {team.description ? (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {team.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No description provided.</p>
                    )}

                    {/* Captain & Leadership info */}
                    <div className="p-3 bg-[#090d16] border border-gray-800/80 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Crown className="w-3.5 h-3.5 text-amber-400" /> Captain:
                        </span>
                        <span className="font-semibold text-white">
                          {team.captain ? team.captain.displayName : 'TBD'}
                        </span>
                      </div>
                      {team.viceCaptain && (
                        <div className="flex items-center justify-between text-gray-300">
                          <span className="text-gray-400">Vice Captain:</span>
                          <span className="font-medium text-gray-200">
                            {team.viceCaptain.displayName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta stats pills */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Squad</span>
                        <strong className="text-white font-mono">{memberCount} Players</strong>
                      </div>
                      <div className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Matches</span>
                        <strong className="text-white font-mono">{matchesCount} Played</strong>
                      </div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="pt-4 mt-4 border-t border-gray-800/80">
                    <Link
                      to={`/teams/${team._id}`}
                      className="w-full py-2.5 px-4 bg-gray-850 hover:bg-emerald-500 hover:text-black font-semibold text-xs text-gray-200 rounded-xl transition-all flex items-center justify-center gap-1.5 group-hover:shadow-md"
                    >
                      <span>View Team Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && teams.length === 0 && (
          <div className="text-center py-20 bg-[#0e1526]/50 rounded-3xl border border-gray-800 p-8 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Teams Found</h3>
            <p className="text-sm text-gray-400">
              {searchTerm || selectedCity !== 'all'
                ? 'Try adjusting your search criteria or city filter.'
                : 'Be the first captain to register an official cricket team!'}
            </p>
            <div className="pt-2">
              <Link
                to={isAuthenticated ? '/teams/create' : '/login'}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Team</span>
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-[#0e1526] border border-gray-800 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-400 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-[#0e1526] border border-gray-800 text-sm font-medium text-gray-300 hover:text-white disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
