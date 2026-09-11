import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import PlayerCard from '../components/PlayerCard';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Lock, 
  Globe, 
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
  Trophy
} from 'lucide-react';

export default function PlayerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [player, setPlayer] = useState(null);
  const [canViewDetails, setCanViewDetails] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionId, setConnectionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchPlayerAndStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch player profile (backend performs privacy filtering)
      const data = await playerService.getPlayerById(id);
      if (data.success && data.player) {
        setPlayer(data.player);
        setCanViewDetails(data.canViewDetails || false);
        setIsOwner(data.isOwner || false);
      } else {
        setError('Player profile not found.');
        setLoading(false);
        return;
      }

      // 2. If authenticated, fetch relationship status
      if (isAuthenticated) {
        try {
          const statusRes = await connectionService.getStatus(id);
          if (statusRes.success) {
            setConnectionStatus(statusRes.status);
            setConnectionId(statusRes.connectionId || null);
          }
        } catch (statusErr) {
          // Status check failed or unauthenticated
          console.warn('Status check notice:', statusErr.message);
        }
      }
    } catch (err) {
      console.error('Failed to load player:', err);
      setError(err.response?.data?.message || 'Player not found or profile is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    fetchPlayerAndStatus();
  }, [fetchPlayerAndStatus]);

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
      navigate('/login');
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
      setTimeout(() => setActionFeedback(null), 4000);
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
        setActionFeedback({ type: 'success', message: 'Connection request accepted! Cricket statistics are now unlocked.' });
        fetchPlayerAndStatus();
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to accept connection request.',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRejectRequest = async () => {
    if (!connectionId) return;
    setActionLoading(true);
    try {
      const res = await connectionService.rejectRequest(connectionId);
      if (res.success) {
        setConnectionStatus('rejected');
        setActionFeedback({ type: 'info', message: 'Connection request declined.' });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to decline request.',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRemoveConnection = async () => {
    if (!connectionId) return;
    if (!window.confirm(`Are you sure you want to remove your connection with ${player.displayName}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await connectionService.removeConnection(connectionId);
      if (res.success) {
        setConnectionStatus('none');
        setConnectionId(null);
        setActionFeedback({ type: 'info', message: 'Connection removed.' });
        fetchPlayerAndStatus();
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to remove connection.',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Loading player profile...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Player Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">{error || 'The requested player profile could not be located.'}</p>
        <button
          onClick={() => navigate('/players')}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-500 hover:bg-emerald-600 transition"
        >
          Return to Players
        </button>
      </div>
    );
  }

  const isPrivateAndLocked = player.profileVisibility === 'private' && !canViewDetails && !isOwner;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
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
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          {/* DYNAMIC CONNECTION BUTTON SYSTEM */}
          {isOwner || connectionStatus === 'self' ? (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
            >
              <span>👑 Your Profile</span>
            </Link>
          ) : connectionStatus === 'connected' ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                <UserCheck className="w-3.5 h-3.5" />
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
            </div>
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-red-400 bg-gray-900 border border-gray-800 transition"
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
        </div>
      </div>

      {/* Main Reusable Player Card */}
      <PlayerCard player={player} isOwner={isOwner} />

      {/* ========================================================================= */}
      {/* 10. PRIVATE PROFILE UI STATE (When target is private and NOT connected)   */}
      {/* ========================================================================= */}
      {isPrivateAndLocked && (
        <div className="mt-8 rounded-3xl bg-[#0c1220] border border-amber-500/30 p-8 sm:p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-white mb-2">
            🔒 This account is private
          </h3>

          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            Connect with this player to view their cricket statistics and match history.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {connectionStatus === 'pending_sent' ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Connection Request Pending Approval</span>
              </span>
            ) : connectionStatus === 'pending_received' ? (
              <button
                onClick={handleAcceptRequest}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Accept Pending Request to Unlock</span>
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
      )}

      {/* ========================================================================= */}
      {/* 11. PUBLIC / CONNECTED PROFILE UI STATE (When statistics are viewable)    */}
      {/* ========================================================================= */}
      {!isPrivateAndLocked && (
        <div className="mt-8 space-y-6">
          {/* Status banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0c1220] to-[#0f172a] border border-emerald-500/20 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                  {player.profileVisibility === 'public' ? (
                    <Globe className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {player.profileVisibility === 'public' ? (
                      <>
                        <span>🌐 Public Account</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          Open Profile
                        </span>
                      </>
                    ) : (
                      <>
                        <span>🔒 Private Account (Access Granted)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {isOwner ? 'Account Owner' : 'Accepted Connection'}
                        </span>
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {player.profileVisibility === 'public'
                      ? 'Detailed cricket statistics are viewable by any authenticated CrickPulse member.'
                      : isOwner
                      ? 'You are viewing your own private profile. Your privacy setting does not restrict your access.'
                      : `You have an active accepted connection with ${player.displayName}. Cricket statistics are unlocked.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Statistics Unlocked</span>
                </span>
              </div>
            </div>
          </div>

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
        </div>
      )}

    </div>
  );
}
