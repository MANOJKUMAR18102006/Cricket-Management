import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import teamService from '../services/teamService';
import teamInvitationService from '../services/teamInvitationService';
import TeamCard from '../components/TeamCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Shield,
  Plus,
  Search,
  MapPin,
  Users,
  Crown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Lock,
  ArrowRight,
  Mail,
  UserCheck,
} from 'lucide-react';

export default function TeamsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // PRIMARY TAB STATE: 'all' (default) | 'my'
  const activeTab = searchParams.get('tab') === 'my' ? 'my' : 'all';

  // All Teams state
  const [allTeams, setAllTeams] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [allError, setAllError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAllCount, setTotalAllCount] = useState(0);

  // My Teams state
  const [myCaptainTeams, setMyCaptainTeams] = useState([]);
  const [myMemberTeams, setMyMemberTeams] = useState([]);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [myTeamsError, setMyTeamsError] = useState(null);

  // Received Invitations state
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [respondingInvitationId, setRespondingInvitationId] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  const cities = ['all', 'Mumbai', 'Bengaluru', 'Chennai', 'Delhi', 'Ahmedabad', 'Pune', 'Coimbatore', 'Kolkata', 'Hyderabad'];

  // Handle primary tab changes (preserves in URL state)
  const handleTabChange = (newTab) => {
    const next = new URLSearchParams(searchParams);
    if (newTab === 'my') {
      next.set('tab', 'my');
    } else {
      next.delete('tab');
    }
    setSearchParams(next);
    // Reset search inputs on tab switch to keep views focused
    setSearchTerm('');
    setSelectedCity('all');
    setPage(1);
  };

  // Fetch Received Team Invitations (Authenticated only)
  const fetchReceivedInvitations = useCallback(async () => {
    if (!isAuthenticated) {
      setReceivedInvitations([]);
      setLoadingInvitations(false);
      return;
    }

    setLoadingInvitations(true);
    try {
      const res = await teamInvitationService.getReceivedInvitations();
      if (res.success) {
        setReceivedInvitations(res.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching received team invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  }, [isAuthenticated]);

  // Fetch My Teams (Authenticated only)
  const fetchMyTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setMyCaptainTeams([]);
      setMyMemberTeams([]);
      setLoadingMyTeams(false);
      return;
    }

    setLoadingMyTeams(true);
    setMyTeamsError(null);
    try {
      const res = await teamService.getMyTeams();
      if (res.success) {
        setMyCaptainTeams(res.captainTeams || res.teams?.filter((t) => t.isCaptain) || []);
        setMyMemberTeams(res.memberTeams || res.teams?.filter((t) => !t.isCaptain) || []);
      }
    } catch (err) {
      console.error('Error fetching my teams:', err);
      setMyTeamsError(err.response?.data?.message || 'Failed to load your teams. Please try again.');
    } finally {
      setLoadingMyTeams(false);
    }
  }, [isAuthenticated]);

  // Fetch All Teams (Discovery)
  const fetchAllTeams = useCallback(async () => {
    setLoadingAll(true);
    setAllError(null);
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
        setAllTeams(res.teams || []);
        setTotalPages(res.totalPages || 1);
        setTotalAllCount(res.total || 0);
      }
    } catch (err) {
      console.error('Error fetching all teams:', err);
      setAllError(err.response?.data?.message || 'Failed to load teams. Please check your connection.');
    } finally {
      setLoadingAll(false);
    }
  }, [page, searchTerm, selectedCity]);

  // Load data based on active tab & authentication
  useEffect(() => {
    if (activeTab === 'all') {
      const timer = setTimeout(() => {
        fetchAllTeams();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchAllTeams]);

  // Load My Teams & invitations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMyTeams();
      fetchReceivedInvitations();
    } else {
      setMyCaptainTeams([]);
      setMyMemberTeams([]);
      setReceivedInvitations([]);
    }
  }, [isAuthenticated, fetchMyTeams, fetchReceivedInvitations]);

  // Handle Accept Invitation Action
  const handleAcceptInvitation = async (invitation) => {
    const invId = invitation.id || invitation._id;
    setRespondingInvitationId(invId);
    try {
      const res = await teamInvitationService.acceptInvitation(invId);
      if (res.success) {
        toast.success(res.message || `You're now a member of ${invitation.team?.name}!`);
        await Promise.all([fetchReceivedInvitations(), fetchMyTeams(), fetchAllTeams()]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setRespondingInvitationId(null);
    }
  };

  // Handle Reject Invitation Action
  const handleRejectInvitation = async (invitation) => {
    const invId = invitation.id || invitation._id;
    setRespondingInvitationId(invId);
    try {
      const res = await teamInvitationService.rejectInvitation(invId);
      if (res.success) {
        toast.info('Team invitation declined.');
        fetchReceivedInvitations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setRespondingInvitationId(null);
    }
  };

  // Client-side search & filtering for My Teams
  const filteredCaptainTeams = useMemo(() => {
    return myCaptainTeams.filter((team) => {
      const matchesSearch =
        !searchTerm.trim() ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCity = selectedCity === 'all' || team.city.toLowerCase() === selectedCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [myCaptainTeams, searchTerm, selectedCity]);

  const filteredMemberTeams = useMemo(() => {
    return myMemberTeams.filter((team) => {
      const matchesSearch =
        !searchTerm.trim() ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.description && team.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCity = selectedCity === 'all' || team.city.toLowerCase() === selectedCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [myMemberTeams, searchTerm, selectedCity]);

  const totalMyCount = myCaptainTeams.length + myMemberTeams.length;
  const filteredMyTotal = filteredCaptainTeams.length + filteredMemberTeams.length;

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8">
        
        {/* Top Header & Create Team Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
              <Shield className="w-4 h-4" />
              <span>Cricket Teams</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Cricket Teams
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Explore cricket clubs, franchises and teams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={isAuthenticated ? '/teams/create' : '/login'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Team</span>
            </Link>
          </div>
        </div>

        {/* ================================================== */}
        {/* PRIMARY TEAM TABS: [ All Teams ] [ My Teams ] */}
        {/* ================================================== */}
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
              <Shield className="w-4 h-4" />
              <span>All Teams</span>
              {totalAllCount > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    activeTab === 'all'
                      ? 'bg-black/20 text-black'
                      : 'bg-gray-800 text-gray-300 border border-gray-700'
                  }`}
                >
                  {totalAllCount}
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
              <span>My Teams</span>
              {isAuthenticated && totalMyCount > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                    activeTab === 'my'
                      ? 'bg-black/20 text-black'
                      : 'bg-gray-800 text-gray-300 border border-gray-700'
                  }`}
                >
                  {totalMyCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 hidden sm:block font-medium">
            {activeTab === 'all'
              ? 'Explore and discover cricket franchises and clubs'
              : 'Teams you currently belong to or manage'}
          </div>
        </div>

        {/* ================================================== */}
        {/* TAB 1: ALL TEAMS (DISCOVERY) */}
        {/* ================================================== */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            
            {/* Search & City Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#090d16]/70 p-3.5 rounded-2xl border border-gray-850">
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

            {/* Results Count & Reset */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                Showing <strong className="text-gray-200">{allTeams.length}</strong> of{' '}
                <strong className="text-gray-200">{totalAllCount}</strong> teams
              </span>
              {(searchTerm || selectedCity !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCity('all');
                    setPage(1);
                  }}
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Loading All Teams */}
            {loadingAll && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-400">Discovering cricket teams...</p>
              </div>
            )}

            {/* Error Loading All Teams */}
            {allError && !loadingAll && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
                <span>{allError}</span>
                <button
                  onClick={fetchAllTeams}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs transition font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* All Teams Grid (Desktop: 3, Tablet: 2, Mobile: 1) */}
            {!loadingAll && !allError && allTeams.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTeams.map((team) => (
                  <TeamCard key={team._id} team={team} isMyTeam={false} />
                ))}
              </div>
            )}

            {/* Empty State: All Teams */}
            {!loadingAll && !allError && allTeams.length === 0 && (
              <div className="text-center py-20 bg-[#0e1526]/50 rounded-3xl border border-gray-800 p-8 max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">🏏 No teams found</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Try changing your search or city filter.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCity('all');
                      setPage(1);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
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
        )}

        {/* ================================================== */}
        {/* TAB 2: MY TEAMS (CAPTAIN + MEMBER + PENDING INVITATIONS) */}
        {/* ================================================== */}
        {activeTab === 'my' && (
          <div className="space-y-8">
            
            {/* GUEST STATE: Sign in Prompt */}
            {!isAuthenticated ? (
              <div className="text-center py-20 bg-[#0e1526]/60 rounded-3xl border border-gray-800 p-8 max-w-md mx-auto space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">🔐 Sign in to view your teams</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Sign in with your CrickPulse account to access your captained teams and memberships.
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
              <div className="space-y-8">
                
                {/* Search & City Filter for My Teams */}
                {totalMyCount > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#090d16]/70 p-3.5 rounded-2xl border border-gray-850">
                    <div className="md:col-span-2 relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search within your teams, city, or franchise..."
                        className="w-full pl-10 pr-4 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
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
                )}

                {/* Loading My Teams */}
                {loadingMyTeams && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-400">Loading your teams...</p>
                  </div>
                )}

                {/* Error Loading My Teams */}
                {myTeamsError && !loadingMyTeams && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
                    <span>{myTeamsError}</span>
                    <button
                      onClick={fetchMyTeams}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-semibold transition"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loadingMyTeams && !myTeamsError && (
                  <>
                    {/* ================================================== */}
                    {/* 1. PENDING TEAM INVITATIONS (If any received) */}
                    {/* ================================================== */}
                    {receivedInvitations.length > 0 && (
                      <section className="space-y-4 bg-amber-500/5 p-5 sm:p-6 rounded-3xl border border-amber-500/20 shadow-lg">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                          <div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-amber-300 flex items-center gap-2">
                              <Mail className="w-5 h-5 text-amber-400" />
                              <span>PENDING TEAM INVITATIONS</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Invitations sent to you by team captains to join their squad
                            </p>
                          </div>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-mono font-bold">
                            {receivedInvitations.length} Pending
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {receivedInvitations.map((inv) => (
                            <div
                              key={inv.id || inv._id}
                              className="bg-gradient-to-b from-[#0e1526] to-[#080d18] border border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-3.5">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-900 border border-amber-400/40 overflow-hidden flex items-center justify-center shrink-0">
                                      {inv.team?.logo ? (
                                        <img src={inv.team.logo} alt={inv.team.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-2xl">🏏</span>
                                      )}
                                    </div>
                                    <div>
                                      <h3 className="text-base font-bold text-white">{inv.team?.name}</h3>
                                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                        <MapPin className="w-3 h-3 text-teal-400" />
                                        <span>{inv.team?.city || 'Club'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-400/15 text-amber-300 border border-amber-400/30">
                                    Invitation
                                  </span>
                                </div>

                                <div className="p-3 bg-[#070b13] rounded-xl border border-gray-800/80 space-y-1 text-xs">
                                  <p className="text-gray-400">
                                    Invited by:{' '}
                                    <strong className="text-emerald-400 font-medium">
                                      {inv.invitedBy?.displayName || inv.invitedBy?.name || 'Team Captain'}
                                    </strong>
                                  </p>
                                  {inv.message && (
                                    <p className="text-gray-300 italic pt-1 border-t border-gray-800/60 leading-relaxed">
                                      "{inv.message}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-gray-800/80 flex items-center gap-2">
                                <button
                                  onClick={() => handleAcceptInvitation(inv)}
                                  disabled={respondingInvitationId === (inv.id || inv._id)}
                                  className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleRejectInvitation(inv)}
                                  disabled={respondingInvitationId === (inv.id || inv._id)}
                                  className="py-2 px-3 bg-gray-800 hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 text-xs font-semibold rounded-xl border border-gray-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ================================================== */}
                    {/* 2. TEAMS I CAPTAIN */}
                    {/* ================================================== */}
                    {filteredCaptainTeams.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                          <div className="flex items-center gap-2.5">
                            <Crown className="w-5 h-5 text-amber-400" />
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                              Teams I Captain
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono font-bold">
                              {filteredCaptainTeams.length}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredCaptainTeams.map((team) => (
                            <TeamCard key={team._id} team={team} isMyTeam={true} roleBadge="captain" />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ================================================== */}
                    {/* 3. TEAMS I AM A MEMBER */}
                    {/* ================================================== */}
                    {filteredMemberTeams.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                          <div className="flex items-center gap-2.5">
                            <UserCheck className="w-5 h-5 text-teal-400" />
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                              Teams I Am a Member
                            </h2>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-400/10 text-teal-300 border border-teal-400/20 font-mono font-bold">
                              {filteredMemberTeams.length}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredMemberTeams.map((team) => (
                            <TeamCard key={team._id} team={team} isMyTeam={true} roleBadge="member" />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* ================================================== */}
                    {/* EMPTY STATE: MY TEAMS */}
                    {/* ================================================== */}
                    {totalMyCount === 0 && receivedInvitations.length === 0 && (
                      <div className="text-center py-20 bg-[#0e1526]/50 rounded-3xl border border-gray-800 p-8 max-w-lg mx-auto space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                          <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white">🏏 No teams yet</h3>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                          You are not a member of any team yet. You can create a team or join one through an invitation.
                        </p>
                        <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                          <Link
                            to="/teams/create"
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-md shadow-emerald-500/20 transition"
                          >
                            + Create Team
                          </Link>
                          <button
                            onClick={() => handleTabChange('all')}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 bg-gray-850 hover:bg-gray-800 hover:text-white transition"
                          >
                            Explore Teams
                          </button>
                        </div>
                      </div>
                    )}

                    {/* EMPTY STATE: Filter yielded no results */}
                    {totalMyCount > 0 && filteredMyTotal === 0 && (
                      <div className="text-center py-16 bg-[#0e1526]/40 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto space-y-3">
                        <h3 className="text-base font-bold text-white">No matching teams</h3>
                        <p className="text-xs text-gray-400">
                          No teams in your "My Teams" list match your current search or city filter.
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCity('all');
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}

                  </>
                )}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
