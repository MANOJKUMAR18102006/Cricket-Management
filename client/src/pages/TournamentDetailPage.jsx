import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import tournamentService from '../services/tournamentService';
import teamService from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  Shield,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Ban,
  Search,
  X,
  ExternalLink,
  Flame,
  Activity,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [tournament, setTournament] = useState(null);
  const [stats, setStats] = useState({ totalMatches: 0, completedMatches: 0, liveMatches: 0, teamsCount: 0 });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'teams' | 'matches' | 'points-table' | 'leaderboard'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab Data States
  const [matches, setMatches] = useState({ live: [], upcoming: [], completed: [] });
  const [pointsTable, setPointsTable] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loadingTabData, setLoadingTabData] = useState(false);

  // Modals (Organizer Only)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [searchingTeams, setSearchingTeams] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('You are invited to participate in this tournament.');
  const [sendingInviteTeamId, setSendingInviteTeamId] = useState(null);

  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [fixtureForm, setFixtureForm] = useState({
    team1: '',
    team2: '',
    date: '',
    venue: '',
    city: '',
  });
  const [creatingFixture, setCreatingFixture] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchTournamentDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tournamentService.getTournamentById(id);
      if (res.success) {
        setTournament(res.tournament);
        setStats(res.stats || { totalMatches: 0, completedMatches: 0, liveMatches: 0, teamsCount: 0 });
      }
    } catch (err) {
      console.error('Error fetching tournament details:', err);
      setError(err.response?.data?.message || 'Failed to load tournament profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTournamentDetails();
  }, [fetchTournamentDetails]);

  // Is current user organizer or admin
  const isOrganizer = user && tournament && (
    String(tournament.organizer?._id || tournament.organizer) === String(user._id) ||
    user.role === 'admin'
  );

  // Load Tab Specific Data
  useEffect(() => {
    if (!id || !tournament) return;

    const loadDataForTab = async () => {
      setLoadingTabData(true);
      try {
        if (activeTab === 'matches') {
          const res = await tournamentService.getTournamentMatches(id);
          if (res.success) {
            setMatches(res.categorized || { live: [], upcoming: [], completed: [] });
          }
        } else if (activeTab === 'points-table') {
          const res = await tournamentService.getTournamentPointsTable(id);
          if (res.success) {
            setPointsTable(res.pointsTable || []);
          }
        } else if (activeTab === 'leaderboard') {
          const res = await tournamentService.getTournamentLeaderboard(id);
          if (res.success) {
            setLeaderboard(res.leaderboard || null);
          }
        } else if (activeTab === 'teams' && isOrganizer) {
          const res = await tournamentService.getTournamentInvitations(id);
          if (res.success) {
            setInvitations(res.invitations || []);
          }
        }
      } catch (err) {
        console.error(`Error loading data for tab ${activeTab}:`, err);
      } finally {
        setLoadingTabData(false);
      }
    };

    loadDataForTab();
  }, [activeTab, id, tournament, isOrganizer]);

  // Search teams for invitation modal
  useEffect(() => {
    if (!isInviteModalOpen) return;

    const timer = setTimeout(async () => {
      setSearchingTeams(true);
      try {
        const res = await teamService.getTeams({ search: teamSearch.trim(), limit: 12 });
        if (res.success) {
          setAvailableTeams(res.teams || []);
        }
      } catch (err) {
        console.error('Error searching teams:', err);
      } finally {
        setSearchingTeams(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [teamSearch, isInviteModalOpen]);

  // Send Tournament Invitation
  const handleSendInvite = async (team) => {
    setSendingInviteTeamId(team._id);
    try {
      const res = await tournamentService.sendTournamentInvitation(tournament._id, {
        teamId: team._id,
        message: inviteMessage.trim() || 'You are invited to participate in this tournament.',
      });
      if (res.success) {
        toast.success(`Invitation sent to ${team.name}!`);
        setIsInviteModalOpen(false);
        setInviteMessage('You are invited to participate in this tournament.');
        // Refresh invitations
        const invRes = await tournamentService.getTournamentInvitations(tournament._id);
        if (invRes.success) setInvitations(invRes.invitations || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSendingInviteTeamId(null);
    }
  };

  // Cancel Pending Invitation
  const handleCancelInvite = (invitationId, teamName) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel Tournament Invitation',
      message: `Are you sure you want to cancel the invitation sent to ${teamName}?`,
      confirmText: 'Cancel Invitation',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await tournamentService.cancelTournamentInvitation(invitationId);
          if (res.success) {
            toast.success('Invitation cancelled.');
            const invRes = await tournamentService.getTournamentInvitations(tournament._id);
            if (invRes.success) setInvitations(invRes.invitations || []);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to cancel invitation');
        }
      },
    });
  };

  // Create Fixture
  const handleCreateFixture = async (e) => {
    e.preventDefault();
    if (!fixtureForm.team1 || !fixtureForm.team2) {
      toast.error('Both teams are required');
      return;
    }
    if (fixtureForm.team1 === fixtureForm.team2) {
      toast.error('A team cannot play against itself');
      return;
    }
    if (!fixtureForm.date) {
      toast.error('Match date is required');
      return;
    }

    setCreatingFixture(true);
    try {
      const res = await tournamentService.createTournamentFixture(tournament._id, {
        ...fixtureForm,
        venue: fixtureForm.venue || tournament.location,
        city: fixtureForm.city || tournament.city,
      });

      if (res.success) {
        toast.success('Tournament fixture scheduled successfully!');
        setIsFixtureModalOpen(false);
        setFixtureForm({ team1: '', team2: '', date: '', venue: '', city: '' });
        // Refresh matches
        const matchesRes = await tournamentService.getTournamentMatches(tournament._id);
        if (matchesRes.success) setMatches(matchesRes.categorized || { live: [], upcoming: [], completed: [] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule fixture');
    } finally {
      setCreatingFixture(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading tournament profile, standings & stats..." />;
  }

  if (error || !tournament) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          title="Tournament Not Found"
          description={error || 'This tournament does not exist or has been removed.'}
          actionLabel="Back to Tournaments"
          actionHref="/tournaments"
        />
      </div>
    );
  }

  const teams = tournament.teams || [];
  const participatingTeamIds = new Set(teams.map((t) => String(t._id || t)));
  const pendingInvitedTeamIds = new Set(
    invitations.filter((i) => i.status === 'pending').map((i) => String(i.team?._id || i.team))
  );

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8">

        {/* Top Navigation & Action Controls */}
        <div className="flex items-center justify-between">
          <Link
            to="/tournaments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Tournaments</span>
          </Link>

          {isOrganizer && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setFixtureForm({
                    team1: teams[0]?.name || '',
                    team2: teams[1]?.name || '',
                    date: '',
                    venue: tournament.location,
                    city: tournament.city,
                  });
                  setIsFixtureModalOpen(true);
                }}
                disabled={teams.length < 2}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Fixture</span>
              </button>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite Team</span>
              </button>
            </div>
          )}
        </div>

        {/* Tournament Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0e172a] to-[#0a101d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            
            {/* Logo / Crest */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gray-900 border-2 border-emerald-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xl shadow-emerald-500/10">
              {tournament.logo ? (
                <img
                  src={tournament.logo}
                  alt={tournament.name}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              ) : (
                <Trophy className="w-14 h-14 text-emerald-400" />
              )}
            </div>

            {/* Core Info */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {tournament.format} • {tournament.overs} Overs
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {tournament.location}, {tournament.city}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                  {new Date(tournament.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {tournament.name}
              </h1>

              {tournament.description ? (
                <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                  {tournament.description}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No tournament description provided.</p>
              )}
            </div>

            {/* Status & Organizer Pill */}
            <div className="flex md:flex-col items-center justify-center p-4 bg-[#070b13]/80 border border-gray-800 rounded-2xl shrink-0 min-w-[140px] text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Tournament Status
              </span>
              <span className="text-xs font-mono font-bold uppercase text-emerald-400">
                {tournament.status.replace('_', ' ')}
              </span>
              <span className="text-[11px] text-gray-400 pt-1 border-t border-gray-800/80 block">
                Organizer: @{tournament.organizer?.username || 'admin'}
              </span>
            </div>

          </div>

          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-800/80 text-center">
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-xs uppercase font-semibold block">Teams</span>
              <strong className="text-xl font-bold font-mono text-white">
                {teams.length} / {tournament.maxTeams}
              </strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-emerald-400 text-xs uppercase font-semibold block">Matches</span>
              <strong className="text-xl font-bold font-mono text-emerald-400">{stats.totalMatches}</strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-teal-400 text-xs uppercase font-semibold block">Completed</span>
              <strong className="text-xl font-bold font-mono text-teal-400">{stats.completedMatches}</strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-amber-400 text-xs uppercase font-semibold block">Live Matches</span>
              <strong className="text-xl font-bold font-mono text-amber-400">{stats.liveMatches}</strong>
            </div>
          </div>
        </div>

        {/* Tabs Navigation: Overview | Teams | Matches | Points Table | Leaderboard */}
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'teams'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teams ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'matches'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Matches ({stats.totalMatches})</span>
          </button>

          <button
            onClick={() => setActiveTab('points-table')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'points-table'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Points Table</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* ================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Details & Rules */}
              <div className="md:col-span-2 space-y-6">
                <div className="p-6 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Tournament Overview</span>
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {tournament.description || 'Welcome to the official tournament page. Check the Teams and Matches tabs for updated schedules, standings, and stats.'}
                  </p>
                </div>

                <div className="p-6 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-400" />
                    <span>Tournament Regulations</span>
                  </h3>
                  <ul className="text-xs text-gray-400 space-y-2.5 list-disc pl-4">
                    <li>Matches are played under standard official {tournament.format} playing conditions.</li>
                    <li>Points Allocation: Win = 2 Points, Tie/No Result = 1 Point, Loss = 0 Points.</li>
                    <li>Tiebreaker: Net Run Rate (NRR) followed by total matches won.</li>
                    <li>All-out innings will count for the full quota of {tournament.overs} overs in NRR calculations.</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Organizer & Registration status */}
              <div className="space-y-6">
                <div className="p-6 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
                    Organizer Information
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base">
                      {tournament.organizer?.username?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">@{tournament.organizer?.username}</p>
                      <p className="text-xs text-gray-400">{tournament.organizer?.city || tournament.city}</p>
                    </div>
                  </div>
                </div>

                {tournament.status === 'registration_open' && (
                  <div className="p-6 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-3xl space-y-3 text-center">
                    <Clock className="w-8 h-8 text-amber-400 mx-auto" />
                    <h4 className="text-base font-bold text-white">Registration Open</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Team captains can join or request entry by contacting the tournament organizer.
                    </p>
                    {isOrganizer && (
                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-xl transition shadow-md"
                      >
                        Invite Franchises
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 2: TEAMS */}
        {/* ================================================== */}
        {activeTab === 'teams' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Participating Teams ({teams.length} / {tournament.maxTeams})</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Official franchises registered for this championship tournament.
                </p>
              </div>

              {isOrganizer && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Invite New Team</span>
                </button>
              )}
            </div>

            {/* Teams Grid */}
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <div
                    key={team._id}
                    className="p-5 bg-[#0e1526] border border-gray-800 rounded-2xl flex flex-col justify-between space-y-4 hover:border-gray-700 transition group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                        {team.logo ? (
                          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                        ) : (
                          <Shield className="w-7 h-7 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition truncate">
                          {team.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-teal-400" />
                          <span>{team.city}</span>
                        </div>
                        {team.captain && (
                          <p className="text-xs text-gray-400 mt-1">
                            Captain: <strong className="text-gray-200">{team.captain.displayName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {team.members ? team.members.length : 0} Players
                      </span>
                      <Link
                        to={`/teams/${team._id}`}
                        className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Team</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#0e1526]/40 rounded-2xl border border-gray-800 space-y-3">
                <Users className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">No teams have joined this tournament yet.</p>
                {isOrganizer && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-xl hover:bg-emerald-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Invite First Team</span>
                  </button>
                )}
              </div>
            )}

            {/* Organizer Sent Invitations Tracker */}
            {isOrganizer && (
              <div className="space-y-4 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Tournament Team Invitations History ({invitations.length})</span>
                  </h4>
                </div>

                {invitations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Team</th>
                          <th className="py-3 px-4">City</th>
                          <th className="py-3 px-4">Message</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {invitations.map((inv) => (
                          <tr key={inv._id} className="hover:bg-[#0e1526]/50 transition">
                            <td className="py-3 px-4 font-bold text-white">
                              {inv.team?.name || 'Team'}
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {inv.team?.city || '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={inv.message}>
                              {inv.message}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  inv.status === 'pending'
                                    ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                                    : inv.status === 'accepted'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : inv.status === 'rejected'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {inv.status === 'pending' ? (
                                <button
                                  onClick={() => handleCancelInvite(inv._id, inv.team?.name || 'team')}
                                  className="text-[11px] font-semibold text-rose-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No invitations sent yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 3: MATCHES */}
        {/* ================================================== */}
        {activeTab === 'matches' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Tournament Match Schedule</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Scheduled fixtures, live scorecards, and completed match results.
                </p>
              </div>

              {isOrganizer && (
                <button
                  onClick={() => setIsFixtureModalOpen(true)}
                  disabled={teams.length < 2}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Match Fixture</span>
                </button>
              )}
            </div>

            {loadingTabData ? (
              <div className="text-center py-12 text-xs text-gray-400">Loading fixtures...</div>
            ) : (
              <div className="space-y-6">
                {/* Live Matches */}
                {matches.live && matches.live.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Live Matches
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matches.live.map((m) => renderMatchCard(m))}
                    </div>
                  </div>
                )}

                {/* Scheduled / Upcoming Matches */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider">
                    Upcoming Fixtures ({matches.upcoming?.length || 0})
                  </h4>
                  {matches.upcoming && matches.upcoming.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matches.upcoming.map((m) => renderMatchCard(m))}
                    </div>
                  ) : (
                    <div className="p-6 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                      No upcoming fixtures currently scheduled.
                    </div>
                  )}
                </div>

                {/* Completed Matches */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Completed Matches ({matches.completed?.length || 0})
                  </h4>
                  {matches.completed && matches.completed.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matches.completed.map((m) => renderMatchCard(m))}
                    </div>
                  ) : (
                    <div className="p-6 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                      No completed matches recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 4: POINTS TABLE & NRR */}
        {/* ================================================== */}
        {activeTab === 'points-table' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Official Tournament Points Table</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Live team standings and Net Run Rate calculated from completed tournament matches.
                </p>
              </div>
            </div>

            {loadingTabData ? (
              <div className="text-center py-12 text-xs text-gray-400">Calculating standings...</div>
            ) : pointsTable.length > 0 ? (
              <div className="overflow-x-auto bg-[#0e1526] border border-gray-800 rounded-3xl p-2 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider font-mono">
                      <th className="py-3 px-4 w-12 text-center">POS</th>
                      <th className="py-3 px-4">TEAM</th>
                      <th className="py-3 px-3 text-center">P</th>
                      <th className="py-3 px-3 text-center text-emerald-400">W</th>
                      <th className="py-3 px-3 text-center text-red-400">L</th>
                      <th className="py-3 px-3 text-center text-amber-400">T</th>
                      <th className="py-3 px-3 text-center text-gray-400">NR</th>
                      <th className="py-3 px-4 text-center font-bold text-white text-sm">PTS</th>
                      <th className="py-3 px-4 text-right font-mono text-teal-300">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {pointsTable.map((row) => (
                      <tr key={row.teamName} className="hover:bg-[#121c31] transition">
                        <td className="py-3.5 px-4 text-center font-bold text-gray-300">
                          {row.pos}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2">
                          <span className="truncate">{row.teamName}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-300">{row.P}</td>
                        <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">{row.W}</td>
                        <td className="py-3.5 px-3 text-center text-red-400 font-bold">{row.L}</td>
                        <td className="py-3.5 px-3 text-center text-amber-400">{row.T}</td>
                        <td className="py-3.5 px-3 text-center text-gray-500">{row.NR}</td>
                        <td className="py-3.5 px-4 text-center font-black text-white text-sm bg-emerald-500/10 rounded-lg">
                          {row.PTS}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-teal-300">
                          {row.NRR > 0 ? `+${row.NRR.toFixed(3)}` : row.NRR.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                No completed matches yet to calculate points and Net Run Rate.
              </div>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 5: LEADERBOARD */}
        {/* ================================================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>Tournament Individual Leaderboards</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Player rankings derived exclusively from matches played in {tournament.name}.
              </p>
            </div>

            {loadingTabData ? (
              <div className="text-center py-12 text-xs text-gray-400">Loading leaderboards...</div>
            ) : leaderboard ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Run Scorers */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🏏</span>
                      <span>Top Run Scorers</span>
                    </h4>
                  </div>
                  {leaderboard.topRunScorers?.length > 0 ? (
                    <div className="divide-y divide-gray-800/60 text-xs">
                      {leaderboard.topRunScorers.slice(0, 5).map((p, idx) => (
                        <div key={p.name} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-gray-500 w-4">{idx + 1}</span>
                            <div>
                              <span className="font-bold text-white block">{p.name}</span>
                              <span className="text-[10px] text-gray-400">{p.team}</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <strong className="text-emerald-400 text-sm">{p.runs}</strong>
                            <span className="text-[10px] text-gray-500 block">SR {p.strikeRate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No batting performances recorded yet.</p>
                  )}
                </div>

                {/* Top Wicket Takers */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🎯</span>
                      <span>Top Wicket Takers</span>
                    </h4>
                  </div>
                  {leaderboard.topWicketTakers?.length > 0 ? (
                    <div className="divide-y divide-gray-800/60 text-xs">
                      {leaderboard.topWicketTakers.slice(0, 5).map((p, idx) => (
                        <div key={p.name} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-gray-500 w-4">{idx + 1}</span>
                            <div>
                              <span className="font-bold text-white block">{p.name}</span>
                              <span className="text-[10px] text-gray-400">{p.overs} ov</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <strong className="text-teal-400 text-sm">{p.wickets} Wkts</strong>
                            <span className="text-[10px] text-gray-500 block">Econ {p.economy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No bowling performances recorded yet.</p>
                  )}
                </div>

                {/* Most Sixes & Fours */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <span>💥</span>
                    <span>Boundary Hitters (Most Sixes & Fours)</span>
                  </h4>
                  <div className="space-y-3">
                    {leaderboard.mostSixes?.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{p.name} ({p.team})</span>
                        <span className="font-mono text-amber-300 font-bold">{p.sixes} Sixes</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best Economy Rates */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                    <span>⭐</span>
                    <span>Best Economy Bowlers</span>
                  </h4>
                  <div className="space-y-3">
                    {leaderboard.bestEconomy?.slice(0, 3).map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{p.name}</span>
                        <span className="font-mono text-emerald-400 font-bold">{p.economy} rpo</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                No tournament statistics recorded yet.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Helper renderMatchCard */}
      {function renderMatchCard(match) {
        return (
          <Link
            key={match._id}
            to={`/matches/${match._id}`}
            className="p-4 bg-[#0e1526] hover:bg-[#121c31] border border-gray-800 hover:border-gray-700 rounded-2xl transition space-y-3 group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-gray-400">
                {new Date(match.date).toLocaleDateString()} • {match.venue}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  match.status === 'live'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                    : match.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-teal-500/20 text-teal-300'
                }`}
              >
                {match.status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                {match.team1} <span className="text-gray-500 font-normal">vs</span> {match.team2}
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-800 text-gray-300 rounded">
                {match.format}
              </span>
            </div>

            {match.result && (
              <p className="text-xs text-gray-400 line-clamp-1 border-t border-gray-800/60 pt-2">
                {match.result}
              </p>
            )}
          </Link>
        );
      }}

      {/* Invite Team Modal (Organizer only) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold">Invite Franchise to Tournament</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Team Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Search team name, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Custom Invitation Message */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Message to Team Captain</label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full p-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {searchingTeams ? (
                <div className="text-center py-6 text-xs text-gray-400">Searching cricket clubs...</div>
              ) : availableTeams.length > 0 ? (
                availableTeams.map((team) => {
                  const isParticipating = participatingTeamIds.has(String(team._id));
                  const isPending = pendingInvitedTeamIds.has(String(team._id));

                  return (
                    <div
                      key={team._id}
                      className="p-3 bg-[#090d16] rounded-xl border border-gray-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{team.name}</p>
                        <p className="text-[10px] text-gray-400">{team.city}</p>
                      </div>

                      {isParticipating ? (
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-semibold rounded-lg">
                          Participating
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold rounded-lg">
                          Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendInvite(team)}
                          disabled={sendingInviteTeamId === team._id}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">No teams found.</div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Fixture Modal (Organizer only) */}
      {isFixtureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold">Schedule Tournament Fixture</h3>
              </div>
              <button
                onClick={() => setIsFixtureModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFixture} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-300">Team 1</label>
                <select
                  value={fixtureForm.team1}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, team1: e.target.value })}
                  className="w-full p-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Team 1</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-300">Team 2</label>
                <select
                  value={fixtureForm.team2}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, team2: e.target.value })}
                  className="w-full p-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">Select Team 2</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-300">Match Date & Time</label>
                <input
                  type="datetime-local"
                  value={fixtureForm.date}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, date: e.target.value })}
                  className="w-full p-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-300">Venue</label>
                <input
                  type="text"
                  value={fixtureForm.venue}
                  onChange={(e) => setFixtureForm({ ...fixtureForm, venue: e.target.value })}
                  placeholder="Venue ground name"
                  className="w-full p-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFixtureModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFixture}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {creatingFixture ? 'Scheduling...' : 'Schedule Fixture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant="danger"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
