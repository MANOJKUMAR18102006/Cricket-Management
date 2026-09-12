import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import teamService from '../services/teamService';
import playerService from '../services/playerService';
import teamInvitationService from '../services/teamInvitationService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Shield,
  MapPin,
  Users,
  Trophy,
  Crown,
  Edit3,
  UserPlus,
  UserMinus,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Search,
  X,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  UserCheck,
  Check,
} from 'lucide-react';

export default function TeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState({ matchesCount: 0, wins: 0, losses: 0, winRate: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'squad' | 'matches' | 'recruit'

  // Recruitment state (Captain only)
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [invitingPlayerId, setInvitingPlayerId] = useState(null);
  const [inviteModalPlayer, setInviteModalPlayer] = useState(null);
  const [customMessage, setCustomMessage] = useState('We would like you to join our team.');

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchTeamDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await teamService.getTeamById(id);
      if (res.success) {
        setTeam(res.team);
        setStats(res.stats || { matchesCount: 0, wins: 0, losses: 0, winRate: 0 });
        setRecentMatches(res.recentMatches || []);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err.response?.data?.message || 'Failed to load team profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeamDetails();
  }, [fetchTeamDetails]);

  // Load current authenticated player profile to reliably identify user in the team
  const [myPlayerId, setMyPlayerId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      playerService.getMyPlayer()
        .then((res) => {
          if (res.success && res.player?._id) {
            setMyPlayerId(String(res.player._id));
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Helper to reliably check if a team member/captain is the authenticated user
  const isOwnPlayer = useCallback((p) => {
    if (!isAuthenticated || !p) return false;
    if (myPlayerId && String(p._id || p) === String(myPlayerId)) return true;
    const pUserId = p.userId?._id || p.userId;
    if (user?._id && pUserId && String(pUserId) === String(user._id)) return true;
    if (user?.username && p.userId?.username && user.username === p.userId.username) return true;
    return false;
  }, [isAuthenticated, myPlayerId, user]);

  // Helper to determine destination profile link: /profile if own profile, else /players/:id
  const getPlayerLink = useCallback((p) => {
    if (!p) return '/profile';
    return isOwnPlayer(p) ? '/profile' : `/players/${p._id || p}`;
  }, [isOwnPlayer]);

  // Check management/recruitment permissions
  const isCreator = user && team?.createdBy && (String(user._id) === String(team.createdBy._id || team.createdBy));
  const isAdmin = user && user.role === 'admin';
  const isCaptain = isOwnPlayer(team?.captain) || (
    user && team?.captain && (
      String(team.captain.userId?._id || team.captain.userId) === String(user._id) ||
      String(team.captain._id || team.captain) === String(user.playerId)
    )
  );
  const canRecruit = isCaptain || isCreator || isAdmin;
  const canManageLeadership = Boolean(isCreator || isAdmin);

  // Leadership Assignment (Creator or Admin)
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipModal, setLeadershipModal] = useState(null); // { role: 'captain' | 'viceCaptain', title: string }

  const handleAssignLeadership = async (role, playerId, playerName) => {
    // If a player is selected as captain, that player cannot be appointed as vice captain
    if (role === 'viceCaptain' && playerId && team.captain && String(team.captain._id || team.captain) === String(playerId)) {
      toast.error('The player selected as Captain cannot also be appointed as Vice Captain.');
      return;
    }

    setLeadershipLoading(true);
    try {
      const payload = {
        [role]: playerId || null,
      };
      if (role === 'captain' && team.viceCaptain && String(team.viceCaptain._id || team.viceCaptain) === String(playerId)) {
        payload.viceCaptain = null;
      }

      const res = await teamService.updateTeam(team._id, payload);
      if (res.success) {
        toast.success(
          playerId
            ? `${playerName} is now ${role === 'captain' ? 'Captain' : 'Vice Captain'} of ${team.name}!`
            : `${role === 'captain' ? 'Captain' : 'Vice Captain'} role unassigned.`
        );
        setLeadershipModal(null);
        fetchTeamDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update ${role}`);
    } finally {
      setLeadershipLoading(false);
    }
  };

  // Fetch Team Invitations History when on recruit tab
  const fetchInvitations = useCallback(async () => {
    if (!id || !canRecruit) return;
    setLoadingInvitations(true);
    try {
      const res = await teamInvitationService.getTeamInvitations(id);
      if (res.success) {
        setTeamInvitations(res.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching team invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  }, [id, canRecruit]);

  useEffect(() => {
    if (activeTab === 'recruit' && canRecruit) {
      fetchInvitations();
    }
  }, [activeTab, canRecruit, fetchInvitations]);

  // Search players for recruitment
  useEffect(() => {
    if (activeTab !== 'recruit') return;

    const searchTimer = setTimeout(async () => {
      setSearchingPlayers(true);
      try {
        const params = {
          limit: 12,
        };
        if (playerSearch.trim()) {
          params.search = playerSearch.trim();
        }
        if (selectedRole !== 'all') {
          params.role = selectedRole;
        }

        const res = await playerService.searchPlayers(params);
        if (res.success) {
          setSearchResults(res.players || []);
        }
      } catch (err) {
        console.error('Error searching players for recruitment:', err);
      } finally {
        setSearchingPlayers(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [playerSearch, selectedRole, activeTab]);

  // Send Team Invitation
  const handleSendInvite = async (targetPlayer) => {
    setInvitingPlayerId(targetPlayer._id);
    try {
      const res = await teamInvitationService.sendInvitation(team._id, {
        playerId: targetPlayer._id,
        message: customMessage.trim() || 'We would like you to join our team.',
      });

      if (res.success) {
        toast.success(`Invitation sent to ${targetPlayer.displayName}!`);
        setInviteModalPlayer(null);
        setCustomMessage('We would like you to join our team.');
        fetchInvitations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInvitingPlayerId(null);
    }
  };

  // Cancel Pending Invitation
  const handleCancelInvite = (invitationId, playerName) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel Team Invitation',
      message: `Are you sure you want to cancel the pending invitation sent to ${playerName}?`,
      confirmText: 'Cancel Invitation',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await teamInvitationService.cancelInvitation(invitationId);
          if (res.success) {
            toast.success('Invitation cancelled successfully.');
            fetchInvitations();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to cancel invitation');
        }
      },
    });
  };

  // Handle removing player from squad
  const handleRemovePlayer = (playerId, playerName) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Player from Squad',
      message: `Are you sure you want to remove ${playerName} from the squad?`,
      confirmText: 'Remove Player',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await teamService.removeMember(team._id, playerId);
          if (res.success) {
            toast.success(`${playerName} removed from squad.`);
            fetchTeamDetails();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to remove player');
        }
      },
    });
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading team profile & squad details..." />;
  }

  if (error || !team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          title="Team Not Found"
          description={error || 'This cricket team does not exist or has been removed.'}
          actionLabel="Back to Teams"
          actionHref="/teams"
        />
      </div>
    );
  }

  const members = team.members || [];
  const captain = team.captain;
  const viceCaptain = team.viceCaptain;

  // Track pending and accepted invitations for the UI
  const pendingPlayerIds = new Set(
    teamInvitations
      .filter((inv) => inv.status === 'pending')
      .map((inv) => String(inv.player?._id || inv.player))
  );

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-8 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="w-full space-y-8">

        {/* Back Link & Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/teams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Teams</span>
          </Link>

          <div className="flex items-center gap-2.5">
            {canRecruit && (
              <button
                onClick={() => setActiveTab('recruit')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'recruit'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Recruit Players</span>
              </button>
            )}

            {canRecruit && (
              <Link
                to={`/teams/${team._id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                <span>Edit Team</span>
              </Link>
            )}
          </div>
        </div>

        {/* Team Hero Profile Banner */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0e172a] to-[#0a101d] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            
            {/* Team Crest / Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gray-900 border-2 border-emerald-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xl shadow-emerald-500/10">
              {team.logo ? (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              ) : (
                <Shield className="w-14 h-14 text-emerald-400" />
              )}
            </div>

            {/* Team Core Info */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Official Club
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {team.city}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {team.name}
              </h1>

              {team.description ? (
                <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                  {team.description}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">No club description provided.</p>
              )}
            </div>

            {/* Quick Record Badge */}
            <div className="flex md:flex-col items-center justify-center p-4 bg-[#070b13]/80 border border-gray-800 rounded-2xl shrink-0 min-w-[140px] text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Overall Record
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400 my-0.5">
                {stats.wins}W - {stats.losses}L
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {stats.winRate}% Win Rate
              </span>
            </div>

          </div>

          {/* Performance Stats Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-800/80 text-center">
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-xs uppercase font-semibold block">Matches</span>
              <strong className="text-xl font-bold font-mono text-white">{stats.matchesCount}</strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-emerald-400 text-xs uppercase font-semibold block">Wins</span>
              <strong className="text-xl font-bold font-mono text-emerald-400">{stats.wins}</strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-red-400 text-xs uppercase font-semibold block">Losses</span>
              <strong className="text-xl font-bold font-mono text-red-400">{stats.losses}</strong>
            </div>
            <div className="p-3 bg-[#070b13]/60 rounded-xl border border-gray-800">
              <span className="text-teal-400 text-xs uppercase font-semibold block">Squad Size</span>
              <strong className="text-xl font-bold font-mono text-teal-400">{members.length} Players</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Overview | Squad | Matches | Recruit Players (Captain only) */}
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('squad')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'squad'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Squad ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'matches'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Matches ({recentMatches.length})</span>
          </button>

          {canRecruit && (
            <button
              onClick={() => setActiveTab('recruit')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === 'recruit'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Recruit Players</span>
              {teamInvitations.filter((i) => i.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {teamInvitations.filter((i) => i.status === 'pending').length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Leadership Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Franchise Leadership</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Captain Card */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 overflow-hidden shrink-0 border-2 border-amber-400/40 flex items-center justify-center">
                    {captain?.profileImage ? (
                      <img src={captain.profileImage} alt={captain.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Crown className="w-8 h-8 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        Captain
                      </span>
                      {captain?.playingRole && (
                        <span className="text-xs text-gray-400">{captain.playingRole}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate mt-1">
                      {captain ? (
                        <Link
                          to={getPlayerLink(captain)}
                          className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                          title={isOwnPlayer(captain) ? 'View Your Profile' : `View ${captain.displayName}'s Profile`}
                        >
                          <span>{captain.displayName}</span>
                          {isOwnPlayer(captain) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              You
                            </span>
                          )}
                        </Link>
                      ) : (
                        'Not Designated'
                      )}
                    </h3>
                    {captain?.city && (
                      <p className="text-xs text-gray-400">{captain.city}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManageLeadership && (
                      <button
                        onClick={() => setLeadershipModal({ role: 'captain', title: 'Choose Team Captain' })}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1"
                        title="Choose or Change Team Captain"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{captain ? 'Change' : 'Assign'}</span>
                      </button>
                    )}
                    {captain && (
                      <Link
                        to={getPlayerLink(captain)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
                        title={isOwnPlayer(captain) ? 'View Your Profile' : 'View Player Profile'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Vice Captain Card */}
                <div className="p-5 bg-[#0e1526] border border-gray-800 rounded-2xl flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 overflow-hidden shrink-0 border-2 border-teal-400/40 flex items-center justify-center">
                    {viceCaptain?.profileImage ? (
                      <img src={viceCaptain.profileImage} alt={viceCaptain.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-8 h-8 text-teal-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-400/10 text-teal-300 border border-teal-400/20">
                        Vice Captain
                      </span>
                      {viceCaptain?.playingRole && (
                        <span className="text-xs text-gray-400">{viceCaptain.playingRole}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate mt-1">
                      {viceCaptain ? (
                        <Link
                          to={getPlayerLink(viceCaptain)}
                          className="hover:text-teal-400 transition inline-flex items-center gap-1.5"
                          title={isOwnPlayer(viceCaptain) ? 'View Your Profile' : `View ${viceCaptain.displayName}'s Profile`}
                        >
                          <span>{viceCaptain.displayName}</span>
                          {isOwnPlayer(viceCaptain) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              You
                            </span>
                          )}
                        </Link>
                      ) : (
                        'Not Designated'
                      )}
                    </h3>
                    {viceCaptain?.city && (
                      <p className="text-xs text-teal-400 font-mono">{viceCaptain.city}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManageLeadership && (
                      <button
                        onClick={() => setLeadershipModal({ role: 'viceCaptain', title: 'Choose Team Vice Captain' })}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 transition flex items-center gap-1"
                        title="Choose or Change Team Vice Captain"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{viceCaptain ? 'Change' : 'Assign'}</span>
                      </button>
                    )}
                    {viceCaptain && (
                      <Link
                        to={getPlayerLink(viceCaptain)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
                        title={isOwnPlayer(viceCaptain) ? 'View Your Profile' : 'View Player Profile'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Squad Snapshot */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Squad Snapshot ({members.length} Players)</span>
                </h2>
                <button
                  onClick={() => setActiveTab('squad')}
                  className="text-xs font-semibold text-emerald-400 hover:underline"
                >
                  View Full Roster →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {members.slice(0, 6).map((player) => {
                  const isMe = isOwnPlayer(player);
                  return (
                    <Link
                      key={player._id}
                      to={getPlayerLink(player)}
                      className={`p-3 bg-[#0e1526] hover:bg-[#121c31] border rounded-2xl text-center space-y-2 group transition ${
                        isMe ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm shadow-emerald-500/10' : 'border-gray-800'
                      }`}
                      title={isMe ? 'View Your Profile' : `View ${player.displayName}'s Profile`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-800 mx-auto overflow-hidden flex items-center justify-center border border-gray-700">
                        {player.profileImage ? (
                          <img src={player.profileImage} alt={player.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-gray-400">
                            {player.displayName ? player.displayName.charAt(0) : '🏏'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                            {player.displayName}
                          </p>
                          {isMe && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">
                          {player.playingRole || 'Player'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SQUAD ROSTER */}
        {activeTab === 'squad' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Official Squad Roster ({members.length} Players)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Players officially recruited into the team roster.
                </p>
              </div>

              {canRecruit && (
                <button
                  onClick={() => setActiveTab('recruit')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition shadow-md shadow-emerald-500/10"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Recruit New Player</span>
                </button>
              )}
            </div>

            {members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((player) => {
                  const isMemberCaptain = captain && String(captain._id || captain) === String(player._id);
                  const isMemberViceCaptain = viceCaptain && String(viceCaptain._id || viceCaptain) === String(player._id);
                  const isMe = isOwnPlayer(player);

                  return (
                    <div
                      key={player._id}
                      className={`p-4 bg-[#0e1526] hover:bg-[#111a2e] border rounded-2xl transition flex items-center justify-between gap-3 group ${
                        isMe ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-gray-800'
                      }`}
                    >
                      <Link
                        to={getPlayerLink(player)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                        title={isMe ? 'View Your Profile' : `View ${player.displayName}'s Profile`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-800 overflow-hidden shrink-0 border border-gray-700 flex items-center justify-center">
                          {player.profileImage ? (
                            <img
                              src={player.profileImage}
                              alt={player.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-400">
                              {player.displayName ? player.displayName.charAt(0) : '🏏'}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition truncate">
                              {player.displayName}
                            </h4>
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                You
                              </span>
                            )}
                            {isMemberCaptain && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Captain" />
                            )}
                            {isMemberViceCaptain && (
                              <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" title="Vice Captain" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {player.playingRole || 'Player'}
                            {player.city && <span className="ml-1.5 text-gray-500">• {player.city}</span>}
                          </p>
                        </div>
                      </Link>

                      {/* Leadership assignment buttons for creator/admin */}
                      {canManageLeadership && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isMemberCaptain && (
                            <button
                              onClick={() => handleAssignLeadership('captain', player._id, player.displayName)}
                              disabled={leadershipLoading}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition flex items-center gap-1"
                              title={`Assign ${player.displayName} as Captain`}
                            >
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span className="hidden sm:inline">Make Captain</span>
                            </button>
                          )}
                          {!isMemberViceCaptain && !isMemberCaptain && (
                            <button
                              onClick={() => handleAssignLeadership('viceCaptain', player._id, player.displayName)}
                              disabled={leadershipLoading}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition flex items-center gap-1"
                              title={`Assign ${player.displayName} as Vice Captain`}
                            >
                              <Shield className="w-3 h-3 text-teal-400" />
                              <span className="hidden sm:inline">Make VC</span>
                            </button>
                          )}
                        </div>
                      )}

                      {canRecruit && !isMemberCaptain && (
                        <button
                          onClick={() => handleRemovePlayer(player._id, player.displayName)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                          title={`Remove ${player.displayName} from squad`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#0e1526]/40 rounded-2xl border border-gray-800 space-y-3">
                <Users className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">No players currently in this squad.</p>
                {canRecruit && (
                  <button
                    onClick={() => setActiveTab('recruit')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-xl hover:bg-emerald-400 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Recruit First Player</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATCHES & FIXTURES */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>Recent Matches & Fixtures</span>
              </h2>
              <Link
                to="/matches"
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Browse All Matches</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {recentMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentMatches.map((match) => {
                  const isWinner = match.winner === team.name;
                  const isLoss = match.status === 'completed' && match.winner && match.winner !== team.name;
                  const opponent = match.team1 === team.name ? match.team2 : match.team1;

                  return (
                    <Link
                      key={match._id}
                      to={`/matches/${match._id}`}
                      className="p-4 bg-[#0e1526] hover:bg-[#111a2e] border border-gray-800 hover:border-gray-700 rounded-2xl transition space-y-3 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gray-400">
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            match.status === 'live'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                              : match.status === 'completed'
                              ? isWinner
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isLoss
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-gray-800 text-gray-300'
                              : 'bg-teal-500/20 text-teal-300'
                          }`}
                        >
                          {match.status === 'completed'
                            ? isWinner
                              ? 'WON'
                              : isLoss
                              ? 'LOST'
                              : 'COMPLETED'
                            : match.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                          {team.name} <span className="text-gray-500 font-normal">vs</span> {opponent}
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
                })}
              </div>
            ) : (
              <div className="p-8 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
                No recorded fixtures found for this team yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RECRUIT PLAYERS (Captain only) */}
        {activeTab === 'recruit' && canRecruit && (
          <div className="space-y-8">
            {/* Recruitment Header */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <UserPlus className="w-4 h-4" />
                <span>Team Recruitment Center</span>
              </div>
              <h2 className="text-xl font-bold text-white">Recruit Players for {team.name}</h2>
              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                As the team captain, search for cricketers across CrickPulse and send them official invitations.
                Players will only be added to your squad once they accept.
              </p>
            </div>

            {/* Player Search & Filters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search Input */}
                <div className="md:col-span-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Search by player name, city, or username..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                {/* Role Filter */}
                <div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0e1526] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="all">All Playing Roles</option>
                    <option value="Batter">Batter</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>
              </div>

              {/* Search Results Grid */}
              <div>
                {searchingPlayers ? (
                  <div className="text-center py-12 text-xs text-gray-400 flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <span>Searching cricketers...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((player) => {
                      const isAlreadyMember = members.some((m) => String(m._id || m) === String(player._id));
                      const isPending = pendingPlayerIds.has(String(player._id));

                      return (
                        <div
                          key={player._id}
                          className="p-4 bg-[#0e1526] border border-gray-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-gray-700 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center border border-gray-700">
                              {player.profileImage ? (
                                <img src={player.profileImage} alt={player.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-base font-bold text-gray-400">
                                  {player.displayName ? player.displayName.charAt(0) : '🏏'}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white truncate">
                                {player.displayName}
                              </h4>
                              <p className="text-xs text-emerald-400 font-medium">
                                {player.playingRole || 'Player'}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                                <span className="truncate">{player.city || 'Available Cricketer'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-800/80">
                            {isAlreadyMember ? (
                              <div className="w-full py-2 px-3 bg-gray-800/60 text-gray-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>In Squad</span>
                              </div>
                            ) : isPending ? (
                              <div className="w-full py-2 px-3 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Invitation Sent</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setInviteModalPlayer(player)}
                                disabled={invitingPlayerId === player._id}
                                className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Invite to Team</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                    {playerSearch ? 'No players found matching criteria.' : 'Type a name or city to discover players.'}
                  </div>
                )}
              </div>
            </div>

            {/* Team Invitations History */}
            <div className="space-y-4 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Recruitment Invitations History ({teamInvitations.length})</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Track the status of all invitations sent to prospective players.
                  </p>
                </div>
                <button
                  onClick={fetchInvitations}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Refresh History
                </button>
              </div>

              {loadingInvitations ? (
                <div className="text-center py-8 text-xs text-gray-400">Loading invitations...</div>
              ) : teamInvitations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Role & City</th>
                        <th className="py-3 px-4">Message</th>
                        <th className="py-3 px-4">Date Sent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {teamInvitations.map((inv) => {
                        const target = inv.player;
                        const isPending = inv.status === 'pending';

                        return (
                          <tr key={inv._id} className="hover:bg-[#0e1526]/50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                                  {target?.profileImage ? (
                                    <img src={target.profileImage} alt={target.displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-bold text-gray-400">
                                      {target?.displayName ? target.displayName.charAt(0) : 'P'}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-white">{target?.displayName || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-300">
                              {target?.playingRole || 'Player'} {target?.city ? `(${target.city})` : ''}
                            </td>
                            <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={inv.message}>
                              {inv.message}
                            </td>
                            <td className="py-3 px-4 text-gray-400 font-mono">
                              {new Date(inv.createdAt).toLocaleDateString()}
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
                                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isPending ? (
                                <button
                                  onClick={() => handleCancelInvite(inv._id, target?.displayName || 'player')}
                                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1"
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>Cancel</span>
                                </button>
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-xs text-gray-500">
                  No invitations have been sent yet. Use the search above to recruit players!
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Choose Captain / Vice Captain Modal */}
      {leadershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0e1526] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${leadershipModal.role === 'captain' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-teal-500/15 text-teal-400 border border-teal-500/30'}`}>
                  {leadershipModal.role === 'captain' ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{leadershipModal.title}</h3>
                  <p className="text-xs text-gray-400">Select any squad member to assign this role</p>
                </div>
              </div>
              <button
                onClick={() => setLeadershipModal(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of squad members */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {members.length > 0 ? (
                members.map((player) => {
                  const isCurrentRole = leadershipModal.role === 'captain'
                    ? (captain && String(captain._id || captain) === String(player._id))
                    : (viceCaptain && String(viceCaptain._id || viceCaptain) === String(player._id));
                  const isCaptainMember = captain && String(captain._id || captain) === String(player._id);
                  const isBlockedForViceCaptain = leadershipModal.role === 'viceCaptain' && isCaptainMember;

                  return (
                    <button
                      key={player._id}
                      onClick={() => !isBlockedForViceCaptain && handleAssignLeadership(leadershipModal.role, player._id, player.displayName)}
                      disabled={leadershipLoading || isBlockedForViceCaptain}
                      className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                        isBlockedForViceCaptain
                          ? 'opacity-55 cursor-not-allowed bg-[#070b13] border-gray-800/80 text-gray-500'
                          : isCurrentRole
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                          : 'bg-[#070b13] hover:bg-[#111a2e] border-gray-800 hover:border-gray-700 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center border border-gray-700">
                          {player.profileImage ? (
                            <img src={player.profileImage} alt={player.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-gray-400">{player.displayName ? player.displayName.charAt(0) : '🏏'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{player.displayName}</p>
                          <p className="text-xs text-gray-400">{player.playingRole || 'Player'} {player.city ? `• ${player.city}` : ''}</p>
                        </div>
                      </div>

                      {isBlockedForViceCaptain ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 shrink-0">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>Captain (Cannot be VC)</span>
                        </span>
                      ) : isCurrentRole ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>Current</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-emerald-500 hover:text-black text-gray-300 transition shrink-0">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">No squad members available to assign.</div>
              )}
            </div>

            {/* Footer / Unassign button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <button
                onClick={() => handleAssignLeadership(leadershipModal.role, null, '')}
                disabled={leadershipLoading}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition hover:underline"
              >
                Unassign Current {leadershipModal.role === 'captain' ? 'Captain' : 'Vice Captain'}
              </button>
              <button
                onClick={() => setLeadershipModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invitation Modal */}
      {inviteModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold">Invite to {team.name}</h3>
              </div>
              <button
                onClick={() => setInviteModalPlayer(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Player Card */}
            <div className="p-3 bg-[#090d16] rounded-xl border border-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
                {inviteModalPlayer.profileImage ? (
                  <img src={inviteModalPlayer.profileImage} alt={inviteModalPlayer.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-gray-400">
                    {inviteModalPlayer.displayName?.charAt(0) || 'P'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{inviteModalPlayer.displayName}</p>
                <p className="text-xs text-gray-400">
                  {inviteModalPlayer.playingRole} • {inviteModalPlayer.city || 'Player'}
                </p>
              </div>
            </div>

            {/* Custom Invitation Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Invitation Message
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Write a message to the player..."
                className="w-full p-3 bg-[#090d16] border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition resize-none"
              />
              <span className="text-[10px] text-gray-500 float-right">
                {customMessage.length}/300
              </span>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2.5">
              <button
                onClick={() => setInviteModalPlayer(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendInvite(inviteModalPlayer)}
                disabled={invitingPlayerId === inviteModalPlayer._id}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/10 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Invitation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Confirmation Dialog */}
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
