import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import tournamentService from '../services/tournamentService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TournamentCard from '../components/TournamentCard';
import {
  Trophy,
  Plus,
  Search,
  MapPin,
  Calendar,
  Filter,
  RefreshCw,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  Users,
  Shield,
  Lock,
  ArrowRight,
  Inbox,
  Check,
  X,
} from 'lucide-react';

export default function TournamentsPage() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Tab State: 'all' (default) | 'my'
  const activeTab = searchParams.get('tab') === 'my' ? 'my' : 'all';

  // Tournaments State
  const [allTournaments, setAllTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Tab Counts for Header Badges
  const [allCount, setAllCount] = useState(0);
  const [myCount, setMyCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const cities = ['all', 'Mumbai', 'Bengaluru', 'Chennai', 'Delhi', 'Coimbatore', 'Ahmedabad', 'Pune'];

  // Tab change handler (preserves in URL)
  const handleTabChange = (newTab) => {
    const next = new URLSearchParams(searchParams);
    if (newTab === 'my') {
      next.set('tab', 'my');
    } else {
      next.delete('tab');
    }
    setSearchParams(next);
  };

  // Build query parameters
  const buildFilterParams = useCallback(() => {
    const params = { limit: 50 };
    if (searchTerm.trim()) params.search = searchTerm.trim();
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (selectedFormat !== 'all') params.format = selectedFormat;
    if (selectedCity !== 'all') params.city = selectedCity;
    return params;
  }, [searchTerm, selectedStatus, selectedFormat, selectedCity]);

  // Fetch Discoverable Tournaments (All Tournaments Tab)
  const fetchAllTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const res = await tournamentService.getTournaments(params);
      if (res.success) {
        setAllTournaments(res.tournaments || []);
        setAllCount(res.total ?? (res.tournaments || []).length);
      }
    } catch (err) {
      console.error('Error fetching all tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load tournaments. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams]);

  // Fetch My Tournaments (My Tournaments Tab)
  const fetchMyTournaments = useCallback(async () => {
    if (!isAuthenticated) {
      setMyTournaments([]);
      setMyCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const res = await tournamentService.getMyTournaments(params);
      if (res.success) {
        setMyTournaments(res.tournaments || []);
        setMyCount((res.tournaments || []).length);
      }

      // Also fetch pending invitations for user's managed teams
      try {
        const invRes = await tournamentService.getReceivedTournamentInvitations();
        if (invRes.success) {
          setPendingInvitations(
            (invRes.invitations || []).filter((inv) => inv.status === 'pending')
          );
        }
      } catch (invErr) {
        console.warn('Could not fetch tournament invitations:', invErr);
      }
    } catch (err) {
      console.error('Error fetching my tournaments:', err);
      setError(err.response?.data?.message || 'Failed to load your tournaments.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, buildFilterParams]);

  // Trigger appropriate fetch based on active tab & filters (debounced for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'all') {
        fetchAllTournaments();
      } else {
        fetchMyTournaments();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, fetchAllTournaments, fetchMyTournaments]);

  // Pre-fetch count for other tab once on auth load
  useEffect(() => {
    if (isAuthenticated) {
      tournamentService.getMyTournaments()
        .then((res) => {
          if (res.success) setMyCount(res.count ?? (res.tournaments || []).length);
        })
        .catch(() => {});
    }
    tournamentService.getTournaments({ limit: 1 })
      .then((res) => {
        if (res.success) setAllCount(res.total ?? (res.tournaments || []).length);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Invitation Action Handlers
  const handleAcceptInvitation = async (invitationId, tournamentName) => {
    setActionLoadingId(invitationId);
    try {
      const res = await tournamentService.acceptTournamentInvitation(invitationId);
      if (res.success) {
        toast.success(`Successfully joined "${tournamentName}"!`);
        fetchMyTournaments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectInvitation = async (invitationId, tournamentName) => {
    setActionLoadingId(invitationId);
    try {
      const res = await tournamentService.rejectTournamentInvitation(invitationId);
      if (res.success) {
        toast.success(`Declined invitation to "${tournamentName}".`);
        setPendingInvitations((prev) => prev.filter((i) => i._id !== invitationId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const isFiltering =
    searchTerm.trim() !== '' ||
    selectedStatus !== 'all' ||
    selectedFormat !== 'all' ||
    selectedCity !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedFormat('all');
    setSelectedCity('all');
  };

  // Status-based groupings for "All Tournaments"
  const upcomingTournaments = allTournaments.filter((t) => t.status === 'upcoming');
  const registrationOpenTournaments = allTournaments.filter((t) => t.status === 'registration_open');
  const ongoingTournaments = allTournaments.filter((t) => t.status === 'ongoing');
  const completedTournaments = allTournaments.filter(
    (t) => t.status === 'completed' || t.status === 'cancelled'
  );

  // Groupings for "My Tournaments"
  const organizedTournaments = myTournaments.filter((t) => t.isOrganizer);
  const participatingTournaments = myTournaments.filter(
    (t) => t.isParticipating && !t.isOrganizer
  );

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8 max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>CrickPulse Championship Circuit</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Tournaments
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Discover cricket tournaments, leagues, and competitions. Compete for the championship cup!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? '/tournaments/create' : '/login'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Tournament</span>
            </Link>
          </div>
        </div>

        {/* PRIMARY TOURNAMENT TABS: [ All Tournaments ] [ My Tournaments ] */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#090d16] border border-gray-800/90 shadow-inner">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-850'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>All Tournaments</span>
              {allCount > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    activeTab === 'all'
                      ? 'bg-black/20 text-black'
                      : 'bg-gray-800 text-gray-300 border border-gray-700'
                  }`}
                >
                  {allCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('my')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-850'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>My Tournaments</span>
              {isAuthenticated && myCount > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    activeTab === 'my'
                      ? 'bg-black/20 text-black'
                      : 'bg-gray-800 text-gray-300 border border-gray-700'
                  }`}
                >
                  {myCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 hidden sm:block font-medium">
            {activeTab === 'all'
              ? 'Discover and explore all active championships'
              : 'Tournaments you organize or participate in with your team'}
          </div>
        </div>

        {/* SEARCH & FILTERS ROW (Applies to the currently active tab) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#090d16]/70 p-3.5 rounded-2xl border border-gray-850">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tournaments, city, venue..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="registration_open">Registration Open</option>
              <option value="ongoing">Live / Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Format Filter */}
          <div>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="T10">T10 (10 Overs)</option>
              <option value="T20">T20 (20 Overs)</option>
              <option value="ODI">ODI (50 Overs)</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === 'all' ? 'All Cities' : city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Reset if active */}
        {isFiltering && (
          <div className="flex items-center justify-between text-xs text-gray-400 bg-[#0e1526]/50 px-4 py-2.5 rounded-xl border border-gray-800">
            <span>
              Showing results matching your active filters (
              {activeTab === 'all' ? allTournaments.length : myTournaments.length} tournaments found)
            </span>
            <button
              onClick={clearFilters}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading tournaments...</p>
          </div>
        )}

        {/* Error Notice */}
        {error && !loading && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={activeTab === 'all' ? fetchAllTournaments : fetchMyTournaments}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 1: ALL TOURNAMENTS (Discoverable / Public) */}
        {/* ========================================================================= */}
        {!loading && !error && activeTab === 'all' && (
          <div className="space-y-12">
            {/* If filters are applied or tournaments exist, render by organized status sections */}
            {allTournaments.length > 0 ? (
              <>
                {/* 1. UPCOMING TOURNAMENTS */}
                {(selectedStatus === 'all' || selectedStatus === 'upcoming') && upcomingTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-cyan-400" />
                          <span>Upcoming Tournaments</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono font-bold">
                            {upcomingTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Scheduled championships preparing for opening day
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {upcomingTournaments.map((t) => (
                        <TournamentCard key={t._id} tournament={t} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2. REGISTRATION OPEN */}
                {(selectedStatus === 'all' || selectedStatus === 'registration_open') && registrationOpenTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span>Registration Open</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold">
                            {registrationOpenTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Championships currently recruiting and accepting team entries
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {registrationOpenTournaments.map((t) => (
                        <TournamentCard key={t._id} tournament={t} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. ONGOING TOURNAMENTS (LIVE) */}
                {(selectedStatus === 'all' || selectedStatus === 'ongoing') && ongoingTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Ongoing Tournaments</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono font-bold">
                            {ongoingTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Active competitions currently playing fixtures and live matches
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {ongoingTournaments.map((t) => (
                        <TournamentCard key={t._id} tournament={t} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. COMPLETED TOURNAMENTS */}
                {(selectedStatus === 'all' || selectedStatus === 'completed') && completedTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-gray-400" />
                          <span>Completed Tournaments</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-mono font-bold">
                            {completedTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Championship archives, final standings, and tournament history
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {completedTournaments.map((t) => (
                        <TournamentCard key={t._id} tournament={t} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              /* Empty State: All Tournaments */
              <div className="text-center py-20 bg-[#0e1526]/50 rounded-3xl border border-gray-800 p-8 max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">No Tournaments Found</h3>
                <p className="text-sm text-gray-400">
                  {isFiltering
                    ? 'Try changing your search or filters.'
                    : 'Be the first organizer to create and launch an official cricket tournament!'}
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  {isFiltering ? (
                    <button
                      onClick={clearFilters}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      to={isAuthenticated ? '/tournaments/create' : '/login'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Tournament</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 2: MY TOURNAMENTS (Organizer / Participating Squad) */}
        {/* ========================================================================= */}
        {!loading && !error && activeTab === 'my' && (
          <div className="space-y-10">
            {/* GUEST STATE: Sign in Prompt */}
            {!isAuthenticated ? (
              <div className="text-center py-20 bg-[#0e1526]/60 rounded-3xl border border-gray-800 p-8 max-w-md mx-auto space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Sign In Required</h3>
                <p className="text-sm text-gray-400">
                  Sign in to view tournaments you organize or participate in with your team.
                </p>
                <div className="pt-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* 0. PENDING INVITATIONS (If applicable to user's captained/managed teams) */}
                {pendingInvitations.length > 0 && (
                  <section className="space-y-4 bg-amber-500/5 p-5 sm:p-6 rounded-3xl border border-amber-500/20 shadow-lg">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-amber-300 flex items-center gap-2">
                          <Inbox className="w-5 h-5 text-amber-400" />
                          <span>Pending Tournament Invitations ({pendingInvitations.length})</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Invitations extended to your team to join tournaments
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingInvitations.map((inv) => (
                        <div
                          key={inv._id}
                          className="p-4 bg-[#0e1526] border border-gray-800 rounded-2xl flex flex-col justify-between gap-3 shadow"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                                {inv.tournament?.format} • {inv.tournament?.overs} Overs
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Invitation Pending
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-white line-clamp-1">
                              {inv.tournament?.name}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Invited Team: <strong className="text-gray-200">{inv.team?.name}</strong></span>
                            </p>
                            {inv.message && (
                              <p className="text-xs text-gray-400 italic mt-1.5 bg-[#090d16] p-2 rounded-lg border border-gray-850">
                                "{inv.message}"
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRejectInvitation(inv._id, inv.tournament?.name)}
                              disabled={actionLoadingId === inv._id}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-300 hover:bg-red-500/10 border border-gray-700/60 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                            <button
                              onClick={() => handleAcceptInvitation(inv._id, inv.tournament?.name)}
                              disabled={actionLoadingId === inv._id}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 shadow transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept Invitation</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 1. ORGANIZED BY ME */}
                {organizedTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-emerald-400" />
                          <span>Organized by Me</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                            {organizedTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Official tournaments and championships created and directed by you
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {organizedTournaments.map((t) => (
                        <TournamentCard
                          key={t._id}
                          tournament={t}
                          isMyTournament={true}
                          myRole={t.myRole || 'Organizer'}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2. PARTICIPATING WITH MY TEAM */}
                {participatingTournaments.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-teal-500/30 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <Shield className="w-5 h-5 text-teal-400" />
                          <span>Participating with My Team</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono font-bold">
                            {participatingTournaments.length}
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Championships where your squad has registered or accepted entry
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {participatingTournaments.map((t) => (
                        <TournamentCard
                          key={t._id}
                          tournament={t}
                          isMyTournament={true}
                          myRole="Team Participant"
                          teamName={t.participatingTeamName}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* EMPTY STATE: My Tournaments */}
                {organizedTournaments.length === 0 && participatingTournaments.length === 0 && pendingInvitations.length === 0 && (
                  <div className="text-center py-20 bg-[#0e1526]/50 rounded-3xl border border-gray-800 p-8 max-w-lg mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No Tournaments Yet</h3>
                    <p className="text-sm text-gray-400">
                      {isFiltering
                        ? 'No tournaments in your involvement match the selected filters.'
                        : 'You are not organizing or participating in any tournaments yet. Create a tournament or join one with your team!'}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      {isFiltering ? (
                        <button
                          onClick={clearFilters}
                          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleTabChange('all')}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 bg-gray-800 hover:bg-gray-750 transition"
                          >
                            Explore Tournaments
                          </button>
                          <Link
                            to="/tournaments/create"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 shadow transition"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create Tournament</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
