import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import playerService from '../services/playerService';
import connectionService from '../services/connectionService';
import teamService from '../services/teamService';
import PlayerCard from '../components/PlayerCard';
import PlayerCareerStats from '../components/PlayerCareerStats';
import PlayerMatchHistory from '../components/PlayerMatchHistory';
import { 
  Trophy, 
  Sparkles, 
  LogOut, 
  Mail, 
  Calendar, 
  Shield, 
  Activity, 
  PlusCircle, 
  Flame,
  CheckCircle2,
  Lock,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Edit3,
  Globe,
  Settings,
  User,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [player, setPlayer] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Connections & Social data (Instagram-style network hub)
  const [connections, setConnections] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Teams data for My Teams tab
  const [myTeams, setMyTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Active section tab for owner's deep profile: 'overview' | 'stats' | 'matches' | 'teams'
  const [tabState, setTabState] = useState('overview');
  const activeProfileTab = searchParams.get('tab') || tabState;

  const handleTabChange = useCallback((newTab) => {
    setTabState(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', newTab);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const setActiveProfileTab = handleTabChange;

  const loadConnectionsData = useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const [connRes, recvRes, sentRes] = await Promise.all([
        connectionService.getConnections(),
        connectionService.getReceivedRequests(),
        connectionService.getSentRequests(),
      ]);

      if (connRes.success) setConnections(connRes.connections || []);
      if (recvRes.success) setReceivedRequests(recvRes.requests || []);
      if (sentRes.success) setSentRequests(sentRes.requests || []);
    } catch (err) {
      console.warn('Notice loading profile connections:', err.message);
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  // Fetch teams for My Teams tab
  const fetchMyTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await teamService.getMyTeams();
      if (res.success && Array.isArray(res.teams)) {
        setMyTeams(res.teams);
      }
    } catch (err) {
      console.warn('Failed to fetch player teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProfileTab === 'teams') {
      fetchMyTeams();
    }
  }, [activeProfileTab, fetchMyTeams]);

  const handleAcceptRequest = async (id, requesterName) => {
    setActionLoadingId(id);
    try {
      const res = await connectionService.acceptRequest(id);
      if (res.success) {
        toast.success(`Connected with ${requesterName || 'player'}!`);
        loadConnectionsData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await connectionService.rejectRequest(id);
      if (res.success) {
        toast.info('Connection request declined');
        loadConnectionsData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await playerService.getMyPlayer();
        if (res.success && res.hasProfile && res.player) {
          setPlayer(res.player);
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch (err) {
        console.error('Error fetching player profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    loadConnectionsData();
  }, [loadConnectionsData]);

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      logout();
      navigate('/');
    }, 400);
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 space-y-8">
      
      {/* 1. If Player Profile Exists: Display Full Player Card */}
      {hasProfile && player ? (
        <PlayerCard
          player={player}
          isOwner={true}
          onEdit={() => navigate('/players/me/edit')}
        />
      ) : (
        /* If Player Profile Not Yet Created: Prompt Card */
        <div className="rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] border border-emerald-500/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/15">
                🏏
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Profile Incomplete</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  Welcome, {user?.username}!
                </h2>
                <p className="text-sm text-gray-400 max-w-xl">
                  You haven't set up your player profile yet. Add your playing role, batting style, 
                  bowling technique, jersey number, and club to appear on leaderboards and scorecards.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/players/me/edit')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Player Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Sub-Navigation Tabs Bar (Navigation Only) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0a0f1d] border border-gray-800/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeProfileTab === 'overview'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-850'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview & Network</span>
        </button>

        <button
          onClick={() => handleTabChange('stats')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeProfileTab === 'stats'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-850'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>My Statistics</span>
        </button>

        <button
          onClick={() => handleTabChange('matches')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeProfileTab === 'matches'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-850'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>My Matches</span>
        </button>

        <button
          onClick={() => handleTabChange('teams')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeProfileTab === 'teams'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-850'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>My Teams</span>
        </button>
      </div>

      {/* 3. INSTAGRAM-STYLE SOCIAL CONNECTIONS & NETWORK SECTION */}
      {activeProfileTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Cricket Connections & Network</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Manage your player network, review incoming connection requests, and control your cricket circle.
              </p>
            </div>

            <Link
              to="/connections"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
            >
              <span>Manage All</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: My Connections */}
            <div className="rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-gray-800/80 p-6 flex flex-col justify-between hover:border-emerald-500/30 transition shadow-xl group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400 bg-gray-900 px-2.5 py-1 rounded-full border border-gray-800">
                    Network
                  </span>
                </div>

                <div className="text-3xl font-black text-white group-hover:text-emerald-300 transition">
                  {connectionsLoading ? '...' : connections.length}
                </div>
                <div className="text-sm font-bold text-gray-300 mt-1">Connections</div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Connected teammates and players who can view your full cricket statistics and compare performance.
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-gray-800/80">
                <button
                  onClick={() => navigate('/connections?tab=connections')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 transition flex items-center justify-center gap-2"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Connections</span>
                </button>
              </div>
            </div>

            {/* Card 2: Connection Requests (Pending Incoming) */}
            <div className={`rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border p-6 flex flex-col justify-between transition shadow-xl group ${
              receivedRequests.length > 0 ? 'border-amber-500/40' : 'border-gray-800/80'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  {receivedRequests.length > 0 && (
                    <span className="text-[10px] font-mono font-black text-black bg-amber-400 px-2.5 py-0.5 rounded-full animate-pulse">
                      Action Required
                    </span>
                  )}
                </div>

                <div className="text-3xl font-black text-white group-hover:text-amber-300 transition">
                  {connectionsLoading ? '...' : receivedRequests.length}
                </div>
                <div className="text-sm font-bold text-gray-300 mt-1">Connection Requests</div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Pending requests from other cricketers seeking to connect with you.
                </p>

                {/* Inline preview of first request if exists */}
                {receivedRequests.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-900/90 rounded-2xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {receivedRequests[0].requester?.displayName || 'Player'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {receivedRequests[0].requester?.city || 'Cricketer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(receivedRequests[0]._id, receivedRequests[0].requester?.displayName)}
                        disabled={actionLoadingId === receivedRequests[0]._id}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(receivedRequests[0]._id)}
                        disabled={actionLoadingId === receivedRequests[0]._id}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-5 mt-4 border-t border-gray-800/80">
                <button
                  onClick={() => navigate('/connections?tab=received')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center justify-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>View Requests ({receivedRequests.length})</span>
                </button>
              </div>
            </div>

            {/* Card 3: Sent Requests */}
            <div className="rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#0a0f1d] border border-gray-800/80 p-6 flex flex-col justify-between hover:border-gray-700 transition shadow-xl group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-400 bg-gray-900 px-2.5 py-1 rounded-full border border-gray-800">
                    Outgoing
                  </span>
                </div>

                <div className="text-3xl font-black text-white group-hover:text-blue-300 transition">
                  {connectionsLoading ? '...' : sentRequests.length}
                </div>
                <div className="text-sm font-bold text-gray-300 mt-1">Sent Requests</div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Invitations you have sent to other players awaiting their acceptance.
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-gray-800/80">
                <button
                  onClick={() => navigate('/connections?tab=sent')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>View Sent Requests</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Statistics Tab */}
      {activeProfileTab === 'stats' && hasProfile && player?._id && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span>Career Performance Statistics</span>
            </h3>
            <span className="text-xs text-emerald-400 font-mono">
              Always Unlocked for Profile Owner
            </span>
          </div>
          <PlayerCareerStats playerId={player._id} />
        </div>
      )}

      {/* 5. Matches Tab */}
      {activeProfileTab === 'matches' && hasProfile && player?._id && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>My Match History</span>
            </h3>
            <Link
              to="/matches"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore All Matches</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <PlayerMatchHistory playerId={player._id} />
        </div>
      )}

      {/* 6. Teams Tab */}
      {activeProfileTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xl font-black text-white">My Cricket Teams</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {myTeams.length} {myTeams.length === 1 ? 'Team' : 'Teams'}
              </span>
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
                You are not a member of any team yet. Join or create a cricket team to start playing tournament matches.
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

      {/* 8. Account Details & Sign Out Bar */}
      <div className="rounded-2xl bg-[#0c1220] border border-gray-800/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>Member since {formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-gray-300 capitalize">{user?.role} Account</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>

    </div>
  );
}
