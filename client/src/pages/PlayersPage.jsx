import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import playerService from '../services/playerService';
import PlayerSearchCard from '../components/PlayerSearchCard';
import useDebounce from '../hooks/useDebounce';
import { 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  MapPin, 
  Flame, 
  Target, 
  Zap, 
  Shield, 
  Sparkles,
  AlertCircle,
  UserCheck
} from 'lucide-react';

const ROLES = ['All', 'Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper'];

export default function PlayersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter state synced with URL query parameters
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [teamInput, setTeamInput] = useState(searchParams.get('team') || '');
  const [cityInput, setCityInput] = useState(searchParams.get('city') || '');
  const [selectedRole, setSelectedRole] = useState(searchParams.get('role') || 'All');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  // Debounced values
  const debouncedSearch = useDebounce(searchInput, 400);
  const debouncedTeam = useDebounce(teamInput, 400);
  const debouncedCity = useDebounce(cityInput, 400);

  // Results state
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Connection system modal state
  const [connectModalPlayer, setConnectModalPlayer] = useState(null);

  // Sync state changes with URL query parameters
  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (debouncedTeam) params.team = debouncedTeam;
    if (debouncedCity) params.city = debouncedCity;
    if (selectedRole && selectedRole !== 'All') params.role = selectedRole;
    if (currentPage > 1) params.page = currentPage;

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, debouncedTeam, debouncedCity, selectedRole, currentPage, setSearchParams]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, debouncedTeam, debouncedCity, selectedRole]);

  // Fetch players from API
  useEffect(() => {
    let isCancelled = false;

    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = {
          page: currentPage,
          limit: 12,
        };
        if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
        if (debouncedTeam.trim()) query.team = debouncedTeam.trim();
        if (debouncedCity.trim()) query.city = debouncedCity.trim();
        if (selectedRole && selectedRole !== 'All') query.role = selectedRole;

        const data = await playerService.searchPlayers(query);

        if (!isCancelled && data.success) {
          setPlayers(data.players || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to search players:', err);
          setError(err.response?.data?.message || 'Could not fetch players. Please check your connection.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchPlayers();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, debouncedTeam, debouncedCity, selectedRole, currentPage]);

  const handleResetFilters = () => {
    setSearchInput('');
    setTeamInput('');
    setCityInput('');
    setSelectedRole('All');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchInput.trim() !== '' ||
      teamInput.trim() !== '' ||
      cityInput.trim() !== '' ||
      selectedRole !== 'All'
    );
  }, [searchInput, teamInput, cityInput, selectedRole]);

  return (
    <div className="min-h-screen py-8 sm:py-12 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-10 left-1/3 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-72 right-10 w-80 h-80 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Player Discovery & Talent Network
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Discover Registered <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Players</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-1 max-w-2xl">
                Explore cricketers across clubs, roles, and cities. Find teammates, opponents, and talent for your next match.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-[#0c1220] border border-gray-800/90 px-3.5 py-2 rounded-xl self-start md:self-auto">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{loading ? 'Searching...' : `${total} Players Registered`}</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls Panel */}
        <div className="rounded-3xl bg-[#0c1220]/90 border border-gray-800/90 p-5 sm:p-6 shadow-xl mb-8 backdrop-blur-sm">
          
          {/* Main Search Bar */}
          <div className="relative mb-5">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
            </div>
            <input
              id="player-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by player name, @username, team, or city..."
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wider font-bold text-gray-400 mb-2.5">
              Filter by Playing Role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const isSelected = selectedRole.toLowerCase() === role.toLowerCase();
                let icon = null;
                if (role === 'Batter') icon = <Flame className="w-3.5 h-3.5" />;
                if (role === 'Bowler') icon = <Target className="w-3.5 h-3.5" />;
                if (role === 'All-Rounder') icon = <Zap className="w-3.5 h-3.5" />;
                if (role === 'Wicketkeeper') icon = <Shield className="w-3.5 h-3.5" />;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                        : 'bg-gray-900/80 text-gray-300 border border-gray-800 hover:border-gray-700 hover:text-white'
                    }`}
                  >
                    {icon}
                    <span>{role}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Filters: Team & City inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t border-gray-800/80">
            <div>
              <label htmlFor="filter-team-input" className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Team / Club
              </label>
              <div className="relative">
                <input
                  id="filter-team-input"
                  type="text"
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  placeholder="e.g. Mumbai Indians, Sunrisers"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                {teamInput && (
                  <button
                    type="button"
                    onClick={() => setTeamInput('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="filter-city-input" className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                City / Region
              </label>
              <div className="relative">
                <input
                  id="filter-city-input"
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="e.g. Mumbai, Bengaluru, Delhi"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                {cityInput && (
                  <button
                    type="button"
                    onClick={() => setCityInput('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Tags & Reset */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchInput.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Search: "{searchInput}"
                    <button onClick={() => setSearchInput('')}>
                      <X className="w-3 h-3 hover:text-white" />
                    </button>
                  </span>
                )}
                {selectedRole !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Role: {selectedRole}
                    <button onClick={() => setSelectedRole('All')}>
                      <X className="w-3 h-3 hover:text-white" />
                    </button>
                  </span>
                )}
                {teamInput.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Team: "{teamInput}"
                    <button onClick={() => setTeamInput('')}>
                      <X className="w-3 h-3 hover:text-white" />
                    </button>
                  </span>
                )}
                {cityInput.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    City: "{cityInput}"
                    <button onClick={() => setCityInput('')}>
                      <X className="w-3 h-3 hover:text-white" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}

        </div>

        {/* Results Info Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs text-gray-400">
            {loading ? (
              <span>Updating results...</span>
            ) : (
              <span>
                Showing <strong className="text-white">{players.length}</strong> of{' '}
                <strong className="text-white">{total}</strong> cricketers
              </span>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
            <button
              onClick={() => setCurrentPage(currentPage)}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold text-white transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-[#0c1220]/60 border border-gray-850 p-5 animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="h-5 w-20 bg-gray-800 rounded-full mb-4" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-gray-800 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-850 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-gray-850">
                    <div className="h-3 bg-gray-850 rounded w-2/3" />
                    <div className="h-3 bg-gray-850 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-gray-850 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Players Cards Grid */}
        {!loading && players.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <PlayerSearchCard
                key={player._id}
                player={player}
                onConnectClick={(p) => setConnectModalPlayer(p)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && players.length === 0 && (
          <div className="rounded-3xl bg-[#0c1220] border border-gray-800/90 py-16 px-4 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Cricketers Found</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              We couldn't find any players matching your current search or filter criteria. Try adjusting the search query or clearing your filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-850 pt-6">
            <p className="text-xs text-gray-400">
              Page <strong className="text-white">{currentPage}</strong> of{' '}
              <strong className="text-white">{totalPages}</strong>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-900 border border-gray-800 hover:text-white hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNumber = idx + 1;
                  // Show current page, edges, and adjacent pages
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                          currentPage === pageNumber
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                            : 'bg-gray-900/60 text-gray-400 border border-gray-800 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                  if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return (
                      <span key={pageNumber} className="text-gray-600 px-1 text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-900 border border-gray-800 hover:text-white hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Connection System Modal (Future System Preparation) */}
      {connectModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0f172a] border border-gray-800 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white text-center mb-1">
              Connect with {connectModalPlayer.displayName}
            </h3>
            <p className="text-xs text-emerald-400/80 font-mono text-center mb-4">
              @{connectModalPlayer.username || connectModalPlayer.user?.username}
            </p>

            <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-800/80 text-xs text-gray-300 space-y-2 mb-6">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Player Connection System (Coming Soon)</span>
              </div>
              <p className="leading-relaxed text-gray-400">
                You will soon be able to send teammate invitations, challenge {connectModalPlayer.displayName}'s team to friendly fixtures, and exchange direct messages.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConnectModalPlayer(null)}
                className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
