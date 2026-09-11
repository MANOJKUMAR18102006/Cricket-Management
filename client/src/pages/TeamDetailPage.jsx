import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import teamService from '../services/teamService';
import playerService from '../services/playerService';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

export default function TeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState({ matchesCount: 0, wins: 0, losses: 0, winRate: 0 });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState({ type: '', text: '' });

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

  // Search players when modal is open
  useEffect(() => {
    if (!isAddModalOpen) return;

    const searchTimer = setTimeout(async () => {
      setSearchingPlayers(true);
      try {
        const res = await playerService.searchPlayers({
          search: playerSearch.trim(),
          limit: 8,
        });
        if (res.success) {
          setSearchResults(res.players || []);
        }
      } catch (err) {
        console.error('Error searching players:', err);
      } finally {
        setSearchingPlayers(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [playerSearch, isAddModalOpen]);

  // Handle adding player to squad
  const handleAddPlayer = async (playerId, playerName) => {
    setActionLoading(true);
    setModalMessage({ type: '', text: '' });
    try {
      const res = await teamService.addMember(team._id, playerId);
      if (res.success) {
        setModalMessage({ type: 'success', text: `${playerName} added to the squad!` });
        fetchTeamDetails();
      }
    } catch (err) {
      setModalMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to add player',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle removing player from squad
  const handleRemovePlayer = async (playerId, playerName) => {
    if (!window.confirm(`Are you sure you want to remove ${playerName} from the squad?`)) {
      return;
    }

    try {
      const res = await teamService.removeMember(team._id, playerId);
      if (res.success) {
        fetchTeamDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove player');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading team profile...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-100 py-16 px-4">
        <div className="max-w-md mx-auto text-center space-y-4 bg-[#0e1526] p-8 rounded-3xl border border-gray-800">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Team Not Found</h2>
          <p className="text-sm text-gray-400">{error || 'This cricket team does not exist or has been removed.'}</p>
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-semibold rounded-xl text-sm hover:bg-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Teams</span>
          </Link>
        </div>
      </div>
    );
  }

  // Check management permissions
  const isCreator = user && team.createdBy && user._id === (team.createdBy._id || team.createdBy);
  const isAdmin = user && user.role === 'admin';
  const isCaptain = user && team.captain && (
    team.captain.userId?._id === user._id || team.captain.userId === user._id
  );
  const canManageTeam = isCreator || isCaptain || isAdmin;

  const members = team.members || [];
  const captain = team.captain;
  const viceCaptain = team.viceCaptain;

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/teams"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Teams</span>
          </Link>

          {canManageTeam && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Player</span>
              </button>

              <Link
                to={`/teams/${team._id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-white transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                <span>Edit Team</span>
              </Link>
            </div>
          )}
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

        {/* Leadership Section: Captain & Vice Captain */}
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
                  {captain ? captain.displayName : 'Not Designated'}
                </h3>
                {captain?.userId?.username && (
                  <p className="text-xs text-emerald-400 font-mono">@{captain.userId.username}</p>
                )}
              </div>
              {captain && (
                <Link
                  to={`/players/${captain._id}`}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
                  title="View Player Profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
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
                  {viceCaptain ? viceCaptain.displayName : 'Not Designated'}
                </h3>
                {viceCaptain?.userId?.username && (
                  <p className="text-xs text-teal-400 font-mono">@{viceCaptain.userId.username}</p>
                )}
              </div>
              {viceCaptain && (
                <Link
                  to={`/players/${viceCaptain._id}`}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
                  title="View Player Profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* Squad Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Squad Roster ({members.length} Players)</span>
            </h2>
            {canManageTeam && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Recruit Player</span>
              </button>
            )}
          </div>

          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((player) => {
                const isMemberCaptain = captain && captain._id === player._id;
                const isMemberViceCaptain = viceCaptain && viceCaptain._id === player._id;

                return (
                  <div
                    key={player._id}
                    className="p-4 bg-[#0e1526] hover:bg-[#111a2e] border border-gray-800 rounded-2xl transition flex items-center justify-between gap-3 group"
                  >
                    <Link
                      to={`/players/${player._id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
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
                          {isMemberCaptain && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Captain" />
                          )}
                          {isMemberViceCaptain && (
                            <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" title="Vice Captain" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {player.playingRole || 'Player'}
                          {player.jerseyNumber !== undefined && player.jerseyNumber !== null && (
                            <span className="ml-1 text-emerald-400 font-mono">#{player.jerseyNumber}</span>
                          )}
                        </p>
                      </div>
                    </Link>

                    {canManageTeam && (
                      <button
                        onClick={() => handleRemovePlayer(player._id, player.displayName)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
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
            <div className="text-center py-12 bg-[#0e1526]/40 rounded-2xl border border-gray-800 space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400">No players currently in this squad.</p>
              {canManageTeam && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-black text-xs font-semibold rounded-xl hover:bg-emerald-400 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add First Player</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent Matches & Fixtures */}
        <div className="space-y-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Recent Matches & Fixtures</span>
            </h2>
            <Link
              to="/matches"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View All Matches</span>
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
            <div className="p-6 bg-[#0e1526]/40 rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
              No recorded fixtures found for this team yet.
            </div>
          )}
        </div>

      </div>

      {/* Add Player to Squad Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Recruit Player to Squad</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setPlayerSearch('');
                  setModalMessage({ type: '', text: '' });
                }}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalMessage.text && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  modalMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {modalMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{modalMessage.text}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Search players by name, role, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Results List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {searchingPlayers ? (
                <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <span>Searching CrickPulse players...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((player) => {
                  const alreadyMember = members.some((m) => m._id === player._id);

                  return (
                    <div
                      key={player._id}
                      className="p-3 bg-[#090d16] rounded-xl border border-gray-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {player.profileImage ? (
                            <img src={player.profileImage} alt={player.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-gray-400">
                              {player.displayName ? player.displayName.charAt(0) : 'P'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{player.displayName}</p>
                          <p className="text-[10px] text-gray-400">
                            {player.playingRole} • {player.city || 'Player'}
                          </p>
                        </div>
                      </div>

                      {alreadyMember ? (
                        <span className="px-2.5 py-1 bg-gray-800 text-gray-400 text-[10px] font-semibold rounded-lg">
                          In Squad
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddPlayer(player._id, player.displayName)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">
                  {playerSearch ? 'No players found matching your query.' : 'Type a name to search players.'}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setPlayerSearch('');
                  setModalMessage({ type: '', text: '' });
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 rounded-xl transition"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
