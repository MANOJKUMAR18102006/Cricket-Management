import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import connectionService from '../services/connectionService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  MapPin,
  Shield,
  Flame,
  Target,
  Zap,
  Activity,
  ArrowLeft
} from 'lucide-react';

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const queryTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    queryTab === 'received' || queryTab === 'sent' ? queryTab : 'connections'
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['connections', 'received', 'sent'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  const [connections, setConnections] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, receivedRes, sentRes] = await Promise.all([
        connectionService.getConnections(),
        connectionService.getReceivedRequests(),
        connectionService.getSentRequests(),
      ]);

      if (connRes.success) setConnections(connRes.connections || []);
      if (receivedRes.success) setReceivedRequests(receivedRes.requests || []);
      if (sentRes.success) setSentRequests(sentRes.requests || []);
    } catch (err) {
      console.error('Failed to load connections data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAccept = async (id, playerName) => {
    setActionLoadingId(id);
    try {
      const res = await connectionService.acceptRequest(id);
      if (res.success) {
        showFeedback('success', `Accepted connection request from ${playerName || 'player'}!`);
        fetchAllData();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to accept request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id, playerName) => {
    setActionLoadingId(id);
    try {
      const res = await connectionService.rejectRequest(id);
      if (res.success) {
        showFeedback('info', `Declined request from ${playerName || 'player'}.`);
        fetchAllData();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to decline request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSent = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await connectionService.removeConnection(id);
      if (res.success) {
        showFeedback('info', 'Cancelled connection request.');
        fetchAllData();
      }
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveConnection = (id, playerName) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Connection',
      message: `Are you sure you want to remove your connection with ${playerName}? You will no longer be able to compare stats or view their private match history.`,
      confirmText: 'Remove Connection',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setActionLoadingId(id);
        try {
          const res = await connectionService.removeConnection(id);
          if (res.success) {
            toast.info(`Connection with ${playerName} removed.`);
            fetchAllData();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to remove connection.');
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Batter':
        return { icon: Flame, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'Bowler':
        return { icon: Target, color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
      case 'All-Rounder':
        return { icon: Zap, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'Wicketkeeper':
        return { icon: Shield, color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      default:
        return { icon: Activity, color: 'bg-gray-800 text-gray-300 border-gray-700' };
    }
  };

  return (
    <div className="min-h-screen py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>Player Network & Teammates</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Player <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Connections</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your teammates, pending invites, and discover other cricketers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </Link>
            <Link
              to="/players"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Find Players</span>
            </Link>
            <button
              onClick={fetchAllData}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-sm flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-850 pb-4 mb-8">
        <button
          onClick={() => setActiveTab('connections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'connections'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>My Connections</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'connections' ? 'bg-black/20 text-black font-extrabold' : 'bg-gray-800 text-gray-300'
          }`}>
            {connections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'received'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Received Requests</span>
          {receivedRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-black font-extrabold">
              {receivedRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sent'
              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Sent Requests</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeTab === 'sent' ? 'bg-black/20 text-black font-extrabold' : 'bg-gray-800 text-gray-300'
          }`}>
            {sentRequests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: MY CONNECTIONS */}
      {activeTab === 'connections' && (
        <div>
          {connections.length === 0 ? (
            <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Connections Yet</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Connect with registered players to unlock their detailed cricket statistics, match history, and invite them to matches.
              </p>
              <Link
                to="/players"
                className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Discover Players</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {connections.map((item) => {
                const p = item.player;
                if (!p) return null;
                const roleMeta = getRoleBadge(p.playingRole);
                const RoleIcon = roleMeta.icon;

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl bg-[#0c1220] border border-gray-800/90 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg group"
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{p.playingRole}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 bg-sky-500/15 border border-sky-500/40 px-2 py-0.5 rounded-md">
                          <UserCheck className="w-3 h-3 text-sky-400" />
                          <span>Connected</span>
                        </span>
                      </div>

                      {/* Player Avatar and Name */}
                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500/40 to-teal-400/40 p-0.5 flex-shrink-0">
                          <div className="w-full h-full rounded-[14px] bg-[#090d16] flex items-center justify-center overflow-hidden">
                            {p.profileImage ? (
                              <img src={p.profileImage} alt={p.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-black text-emerald-400">
                                {p.displayName ? p.displayName.charAt(0).toUpperCase() : '🏏'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {p.displayName}
                          </h3>
                          <p className="text-xs font-mono text-emerald-400/80 truncate">
                            @{p.username}
                          </p>
                        </div>
                      </div>

                      {/* Club and City */}
                      <div className="space-y-1.5 py-3 border-t border-gray-850 text-xs text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Club:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.currentTeam || 'Free Agent'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>City:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.city || 'Unspecified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-850 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleRemoveConnection(item._id, p.displayName)}
                        disabled={actionLoadingId === item._id}
                        className="text-xs text-gray-500 hover:text-red-400 transition"
                      >
                        Remove
                      </button>

                      <Link
                        to={`/players/${p._id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVED REQUESTS */}
      {activeTab === 'received' && (
        <div>
          {receivedRequests.length === 0 ? (
            <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gray-850 border border-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Pending Requests</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                You don't have any incoming connection requests right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {receivedRequests.map((item) => {
                const p = item.player;
                if (!p) return null;
                const roleMeta = getRoleBadge(p.playingRole);
                const RoleIcon = roleMeta.icon;

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl bg-[#0c1220] border border-gray-800 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{p.playingRole}</span>
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500/40 to-teal-400/40 p-0.5 flex-shrink-0">
                          <div className="w-full h-full rounded-[14px] bg-[#090d16] flex items-center justify-center overflow-hidden">
                            {p.profileImage ? (
                              <img src={p.profileImage} alt={p.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-black text-emerald-400">
                                {p.displayName ? p.displayName.charAt(0).toUpperCase() : '🏏'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white truncate">
                            {p.displayName}
                          </h3>
                          <p className="text-xs font-mono text-emerald-400/80 truncate">
                            @{p.username}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 py-3 border-t border-gray-850 text-xs text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Club:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.currentTeam || 'Free Agent'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>City:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.city || 'Unspecified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Accept and Reject Buttons */}
                    <div className="pt-4 border-t border-gray-850 flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(item._id, p.displayName)}
                        disabled={actionLoadingId === item._id}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => handleReject(item._id, p.displayName)}
                        disabled={actionLoadingId === item._id}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-red-400 bg-gray-900 border border-gray-800 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SENT REQUESTS */}
      {activeTab === 'sent' && (
        <div>
          {sentRequests.length === 0 ? (
            <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-12 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gray-850 border border-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Sent Requests</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                You haven't sent any pending connection requests. Discover players to connect with them!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sentRequests.map((item) => {
                const p = item.player;
                if (!p) return null;
                const roleMeta = getRoleBadge(p.playingRole);
                const RoleIcon = roleMeta.icon;

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl bg-[#0c1220] border border-gray-800 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          <span>{p.playingRole}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          <span>Request Sent</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 mb-4">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500/40 to-teal-400/40 p-0.5 flex-shrink-0">
                          <div className="w-full h-full rounded-[14px] bg-[#090d16] flex items-center justify-center overflow-hidden">
                            {p.profileImage ? (
                              <img src={p.profileImage} alt={p.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-black text-emerald-400">
                                {p.displayName ? p.displayName.charAt(0).toUpperCase() : '🏏'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-white truncate">
                            {p.displayName}
                          </h3>
                          <p className="text-xs font-mono text-emerald-400/80 truncate">
                            @{p.username}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 py-3 border-t border-gray-850 text-xs text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Club:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.currentTeam || 'Free Agent'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>City:</span>
                          <span className="font-semibold text-gray-200 truncate">{p.city || 'Unspecified'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cancel Request Action */}
                    <div className="pt-3 border-t border-gray-850 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCancelSent(item._id)}
                        disabled={actionLoadingId === item._id}
                        className="text-xs text-gray-500 hover:text-red-400 transition"
                      >
                        Cancel Request
                      </button>

                      <Link
                        to={`/players/${p._id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Remove Connection"
        variant="danger"
        loading={actionLoadingId !== null}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
