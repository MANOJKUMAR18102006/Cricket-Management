import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import teamService from '../services/teamService';
import PlayerCard from '../components/PlayerCard';
import PlayerCareerStats from '../components/PlayerCareerStats';
import PlayerMatchHistory from '../components/PlayerMatchHistory';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import LoginPromptModal from '../components/LoginPromptModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  ArrowRight,
  Lock, 
  Globe, 
  User,
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Share2, 
  AlertCircle, 
  BarChart3, 
  CheckCircle2, 
  Activity, 
  Flame, 
  Target, 
  Trophy, 
  Swords, 
  TrendingUp, 
  Settings, 
  Sparkles, 
  Shield 
} from 'lucide-react';

export default function PlayerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [player, setPlayer] = useState(null);
  const [canViewDetails, setCanViewDetails] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionId, setConnectionId] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [activeCricketTab, setActiveCricketTab] = useState('overview');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchPlayerAndStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch player profile (backend performs privacy and ownership filtering)
      const data = await playerService.getPlayerById(id);
      if (data.success && data.player) {
        const isDetectedOwner = Boolean(
          data.isOwner ||
          data.isOwnProfile ||
          data.player.isOwner ||
          data.player.isOwnProfile ||
          (user?._id && data.player.user?._id && String(data.player.user._id) === String(user._id)) ||
          (user?._id && data.player.userId && String(data.player.userId?._id || data.player.userId) === String(user._id))
        );

        setPlayer(data.player);
        setCanViewDetails(isDetectedOwner ? true : (data.canViewDetails || false));
        setIsOwner(isDetectedOwner);

        if (isDetectedOwner) {
          setConnectionStatus('self');
        } else if (isAuthenticated) {
          try {
            const statusRes = await connectionService.getStatus(id);
            if (statusRes.success) {
              setConnectionStatus(statusRes.status);
              setConnectionId(statusRes.connectionId || null);
            }
          } catch (statusErr) {
            console.warn('Status check notice:', statusErr.message);
          }
        }
      } else {
        setError('Player profile not found.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to load player:', err);
      setError(err.response?.data?.message || 'Player not found or profile is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    fetchPlayerAndStatus();
  }, [fetchPlayerAndStatus]);

  // Robust check for profile ownership: ID relationship
  const isOwnProfile = Boolean(
    isOwner ||
    player?.isOwnProfile ||
    player?.isOwner ||
    (user?._id && player?.user?._id && String(player.user._id) === String(user._id)) ||
    (user?._id && player?.userId && String(player.userId?._id || player.userId) === String(user._id)) ||
    connectionStatus === 'self'
  );

  // Load player teams if owner switches to teams tab
  useEffect(() => {
    if (isOwnProfile && activeCricketTab === 'teams' && myTeams.length === 0) {
      setTeamsLoading(true);
      teamService.getMyTeams()
        .then((res) => {
          if (res.success && res.teams) {
            setMyTeams(res.teams);
          }
        })
        .catch((err) => console.warn('Failed to load teams:', err.message))
        .finally(() => setTeamsLoading(false));
    }
  }, [isOwnProfile, activeCricketTab, myTeams.length]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Connection Action Handlers
  const handleSendRequest = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await connectionService.sendRequest(player._id);
      if (res.success) {
        setConnectionStatus('pending_sent');
        setConnectionId(res.connection?._id);
        setActionFeedback({ type: 'success', message: 'Connection request sent successfully!' });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send connection request.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!connectionId) return;
    setActionLoading(true);
    try {
      const res = await connectionService.cancelRequest(connectionId);
      if (res.success) {
        setConnectionStatus('none');
        setConnectionId(null);
        setActionFeedback({ type: 'info', message: 'Connection request cancelled.' });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to cancel request.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!connectionId) return;
    setActionLoading(true);
    try {
      const res = await connectionService.acceptRequest(connectionId);
      if (res.success) {
        setConnectionStatus('connected');
        setCanViewDetails(true);
        setActionFeedback({ type: 'success', message: 'Connection accepted! Statistics unlocked.' });
        fetchPlayerAndStatus();
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to accept connection.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!connectionId) return;
    setActionLoading(true);
    try {
      const res = await connectionService.rejectRequest(connectionId);
      if (res.success) {
        setConnectionStatus('none');
        setConnectionId(null);
        setActionFeedback({ type: 'info', message: 'Connection request declined.' });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to decline request.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveConnection = () => {
    if (!connectionId) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Connection',
      message: `Are you sure you want to disconnect with ${player.displayName}? Detailed cricket statistics and match histories will be hidden if this account is private.`,
      confirmText: 'Disconnect',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await connectionService.removeConnection(connectionId);
          if (res.success) {
            setConnectionStatus('none');
            setConnectionId(null);
            if (player.profileVisibility === 'private' && !isOwnProfile) {
              setCanViewDetails(false);
            }
            toast.info(`Disconnected from ${player.displayName}`);
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
            fetchPlayerAndStatus();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to remove connection.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading player profile & stats..." />;
  }

  if (error || !player) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          title="Player Not Found"
          description={error || 'The requested player profile could not be located.'}
          actionLabel="Return to Players"
          actionHref="/players"
        />
      </div>
    );
  }

  // Privacy lock applies ONLY to other players, never to own profile
  const isPrivateAndLocked = !isOwnProfile && player.profileVisibility === 'private' && !canViewDetails;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8">
      
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm flex items-center gap-3 transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : actionFeedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Share Profile Link */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-900 border border-gray-800 hover:text-white hover:border-gray-700 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : isOwnProfile ? 'Share Profile' : 'Share'}</span>
          </button>

          {/* Analytics link */}
          <Link
            to={`/players/${player._id}/analytics`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition"
            title="View Performance Analytics"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </Link>

          {/* OTHER PLAYER PROFILE ACTIONS — Compare, Connect, and Your Profile return link */}
          {!isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/compare?player=${player._id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 transition shadow-sm"
                title="Compare your stats with this player"
              >
                <Swords className="w-3.5 h-3.5 text-indigo-400" />
                <span>Compare</span>
              </Link>

              {connectionStatus === 'connected' ? (
                <>
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-sky-400 bg-sky-500/15 border border-sky-500/40 shadow-sm shadow-sky-500/15">
                    <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Connected</span>
                  </span>
                  <button
                    onClick={handleRemoveConnection}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-800 transition"
                    title="Remove Connection"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </>
              ) : connectionStatus === 'pending_sent' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Request Sent</span>
                  </span>
                  {connectionId && (
                    <button
                      onClick={handleRemoveConnection}
                      disabled={actionLoading}
                      className="px-2.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-red-400 transition border border-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : connectionStatus === 'pending_received' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={handleRejectRequest}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-red-400 bg-gray-900 border border-gray-800 transition"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSendRequest}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
              )}

              {/* Only show 'Your Profile' link if authenticated viewer is looking at SOMEONE ELSE's profile */}
              {isAuthenticated && (
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition ml-1"
                >
                  <span>👑 Your Profile</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Reusable Player Card */}
      <PlayerCard player={player} isOwner={isOwnProfile} />

      {/* ========================================================================= */}
      {/* SECTION TABS                                                              */}
      {/* ========================================================================= */}
      <div className="mt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800/80 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveCricketTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCricketTab === 'overview'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isOwnProfile ? 'Overview & Network' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveCricketTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCricketTab === 'stats'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isOwnProfile ? 'My Statistics' : 'Career Statistics'}</span>
            {!isOwnProfile && isPrivateAndLocked && <Lock className="w-3 h-3 text-amber-400/80 ml-0.5" />}
          </button>

          <button
            onClick={() => setActiveCricketTab('matches')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeCricketTab === 'matches'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{isOwnProfile ? 'My Matches' : 'Match History'}</span>
            {!isOwnProfile && isPrivateAndLocked && <Lock className="w-3 h-3 text-amber-400/80 ml-0.5" />}
          </button>

          {isOwnProfile && (
            <button
              onClick={() => setActiveCricketTab('teams')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeCricketTab === 'teams'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-[#0c1220] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>My Teams</span>
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW                                                           */}
        {/* ------------------------------------------------------------------------- */}
        {activeCricketTab === 'overview' && (
          <div className="space-y-6">
            {/* Status notification banner — ONLY DISPLAYED FOR OTHER PLAYERS, NEVER FOR THE OWNER */}
            {!isOwnProfile && (
              <div className={`rounded-2xl border p-5 ${
                isPrivateAndLocked
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                      isPrivateAndLocked
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {isPrivateAndLocked ? (
                        <Lock className="w-5 h-5" />
                      ) : player.profileVisibility === 'public' ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <UserCheck className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {isPrivateAndLocked ? (
                          <>
                            <span>🔒 Private Account</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Protected Stats
                            </span>
                          </>
                        ) : player.profileVisibility === 'public' ? (
                          <>
                            <span>🌐 Public Account</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              Open Profile
                            </span>
                          </>
                        ) : (
                          <>
                            <span>🔒 Private Account</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Connected
                            </span>
                          </>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {isPrivateAndLocked
                          ? 'Detailed cricket career statistics and match scorecards are protected. Connect with this player to unlock full records.'
                          : player.profileVisibility === 'public'
                          ? 'Detailed cricket statistics are viewable by any CrickPulse member or visitor.'
                          : `You have an active accepted connection with ${player.displayName}. Full stats and match history are unlocked.`}
                      </p>
                    </div>
                  </div>

                  {isPrivateAndLocked && (
                    <div className="sm:self-center flex-shrink-0">
                      {!isAuthenticated ? (
                        <button
                          onClick={() => setShowLoginModal(true)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Sign in to Connect</span>
                        </button>
                      ) : connectionStatus === 'pending_sent' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Request Pending</span>
                        </span>
                      ) : connectionStatus === 'pending_received' ? (
                        <button
                          onClick={handleAcceptRequest}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 transition flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Accept Request</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleSendRequest}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cricket Performance Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#0c1220] border border-gray-800">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Batting Style</p>
                <p className="text-sm font-bold text-white">{player.battingStyle || 'Right-hand bat'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c1220] border border-gray-800">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bowling Style</p>
                <p className="text-sm font-bold text-white">{player.bowlingStyle || 'None'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c1220] border border-gray-800">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Current Club</p>
                <p className="text-sm font-bold text-emerald-400 truncate">{player.currentTeam || 'Free Agent'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0c1220] border border-gray-800">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">City / Region</p>
                <p className="text-sm font-bold text-white truncate">{player.city || 'Unspecified'}</p>
              </div>
            </div>

            {/* Cricketer Bio & Profile Details */}
            <div className="rounded-2xl bg-[#0c1220] border border-gray-800 p-6 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Player Profile & Bio</span>
              </h4>
              
              <p className="text-sm text-gray-300 leading-relaxed">
                {player.bio ? (
                  player.bio
                ) : (
                  <span className="text-gray-500 italic">No biographical information provided yet.</span>
                )}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-800/80 text-xs">
                <div>
                  <span className="text-gray-500 block">Role</span>
                  <span className="font-semibold text-gray-200 capitalize">{player.role || player.playingRole || 'Player'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Jersey #</span>
                  <span className="font-semibold text-gray-200">{player.jerseyNumber !== undefined && player.jerseyNumber !== null ? `#${player.jerseyNumber}` : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Member Since</span>
                  <span className="font-semibold text-gray-200">{player.createdAt ? new Date(player.createdAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 2: CAREER STATISTICS (Unrestricted for owner; locked if private & unconnected) */}
        {/* ------------------------------------------------------------------------- */}
        {activeCricketTab === 'stats' && (
          isPrivateAndLocked ? (
            <div className="rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 sm:p-12 text-center max-w-xl mx-auto my-6 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white mb-2">
                🔒 Statistics are private
              </h3>

              <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
                Connect with this player to view their detailed cricket statistics.
              </p>

              <div className="flex items-center justify-center gap-3">
                {!isAuthenticated ? (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Sign in to Connect</span>
                  </button>
                ) : connectionStatus === 'pending_sent' ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Connection request pending</span>
                  </span>
                ) : connectionStatus === 'pending_received' ? (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Accept Request to Unlock</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <PlayerCareerStats playerId={player._id} />
          )
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 3: MATCH HISTORY (Unrestricted for owner; locked if private & unconnected) */}
        {/* ------------------------------------------------------------------------- */}
        {activeCricketTab === 'matches' && (
          isPrivateAndLocked ? (
            <div className="rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 sm:p-12 text-center max-w-xl mx-auto my-6 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white mb-2">
                🔒 Match history is private
              </h3>

              <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
                Connect with this player to view their match history.
              </p>

              <div className="flex items-center justify-center gap-3">
                {!isAuthenticated ? (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Sign in to Connect</span>
                  </button>
                ) : connectionStatus === 'pending_sent' ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Connection request pending</span>
                  </span>
                ) : connectionStatus === 'pending_received' ? (
                  <button
                    onClick={handleAcceptRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Accept Request to Unlock</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendRequest}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <PlayerMatchHistory playerId={player._id} />
          )
        )}

        {/* ------------------------------------------------------------------------- */}
        {/* TAB 4: MY TEAMS (Visible only for own profile)                           */}
        {/* ------------------------------------------------------------------------- */}
        {activeCricketTab === 'teams' && isOwnProfile && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>My Teams</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cricket teams and clubs you are currently part of.
                </p>
              </div>
              <Link
                to="/teams"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                <span>Explore All Teams</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {teamsLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-3 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <p className="text-xs text-gray-400">Loading your teams...</p>
              </div>
            ) : myTeams.length === 0 ? (
              <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">No Teams Joined Yet</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto mb-5">
                  You are not a member of any cricket team yet. Join or create a team to start playing competitive matches.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/teams"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20"
                  >
                    Discover Cricket Teams
                  </Link>
                  <Link
                    to="/teams/create"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-gray-900 border border-gray-800 hover:text-white transition"
                  >
                    + Create New Team
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTeams.map((t) => {
                  const isCaptain =
                    String(t.captain?._id || t.captain) === String(user?._id) ||
                    String(t.captain?._id || t.captain) === String(player?._id);
                  return (
                    <div
                      key={t._id}
                      className="p-5 rounded-2xl bg-[#0c1220] border border-gray-800 hover:border-gray-700 transition flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{t.name?.[0]?.toUpperCase() || 'T'}</span>
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{t.name}</h4>
                            {isCaptain && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                                👑 Captain
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {t.city || 'Club'} • {t.members?.length || 0} Members
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/teams/${t._id}`}
                        className="w-full py-2 rounded-xl text-xs font-bold text-center text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 transition"
                      >
                        View Team Profile
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove Connection Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant="danger"
        loading={actionLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

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
