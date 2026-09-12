import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import matchService from '../services/matchService';
import scoringService from '../services/scoringService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  Activity, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Clock, 
  Shield, 
  Share2,
  Sparkles,
  Flame
} from 'lucide-react';

export default function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState(null);
  const [inningsList, setInningsList] = useState([]);
  const [activeScorecardInnings, setActiveScorecardInnings] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Update modal state for creator/admin
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: 'scheduled',
    tossWinner: '',
    tossDecision: '',
    winner: '',
    result: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchMatch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await matchService.getMatchById(id);
      if (data.success && data.match) {
        setMatch(data.match);
        setEditFormData({
          status: data.match.status || 'scheduled',
          tossWinner: data.match.tossWinner || '',
          tossDecision: data.match.tossDecision || '',
          winner: data.match.winner || '',
          result: data.match.result || '',
        });

        // Also fetch live scoring state
        try {
          const scoringData = await scoringService.getMatchScoringState(id);
          if (scoringData.success && scoringData.inningsList) {
            setInningsList(scoringData.inningsList);
            if (scoringData.currentInnings) {
              setActiveScorecardInnings(scoringData.currentInnings.inningsNumber);
            }
          }
        } catch (scoreErr) {
          // Silently ignore if not scored yet
        }
      } else {
        setError('Match not found.');
      }
    } catch (err) {
      console.error('Failed to load match:', err);
      setError(err.response?.data?.message || 'Match not found or unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCreator = match && user && (String(match.createdBy?._id || match.createdBy) === String(user._id) || user.role === 'admin');

  const handleUpdateMatch = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await matchService.updateMatch(match._id, editFormData);
      if (res.success && res.match) {
        setMatch(res.match);
        setShowEditModal(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update match.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMatch = async () => {
    setIsDeleting(true);
    try {
      await matchService.deleteMatch(match._id);
      toast.success('Match fixture deleted successfully.');
      navigate('/matches');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete match.');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading match fixture & scorecards..." />;
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          title="Match Fixture Not Found"
          description={error || 'The requested cricket match could not be found or has been removed.'}
          actionLabel="Return to Matches"
          actionHref="/matches"
        />
      </div>
    );
  }

  const matchDate = new Date(match.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen py-8 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/matches')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Matches</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-900 border border-gray-800 hover:text-white transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Share Match'}</span>
          </button>

          {isCreator && (
            <div className="flex items-center gap-2">
              <Link
                to={`/matches/${match._id}/score`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-500 hover:to-teal-400 transition shadow-md shadow-emerald-500/20"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Scoring</span>
              </Link>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gray-800 hover:bg-gray-700 transition border border-gray-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manage</span>
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                title="Delete Match"
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-800 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Match Stadium Card */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] border border-gray-800/90 shadow-2xl overflow-hidden mb-8">
        
        {/* Top Stadium Accent Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/70 via-teal-900/40 to-slate-900 border-b border-gray-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/60 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
              {match.format} • {match.overs} Overs
            </span>
            {match.tournament && (
              <span className="text-xs font-semibold text-gray-300">
                🏆 {match.tournament}
              </span>
            )}
          </div>

          <div>
            {match.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>LIVE IN PROGRESS</span>
              </span>
            ) : match.status === 'completed' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>MATCH COMPLETED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                <Clock className="w-3.5 h-3.5" />
                <span>SCHEDULED FIXTURE</span>
              </span>
            )}
          </div>
        </div>

        {/* Head to Head Teams Presentation */}
        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6 text-center">
            
            {/* Team 1 */}
            <div className="md:col-span-2 flex flex-col items-center p-6 rounded-2xl bg-[#090d16]/80 border border-gray-800">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/30 to-teal-400/30 border-2 border-emerald-500/40 flex items-center justify-center text-3xl font-black text-white mb-3 shadow-xl shadow-emerald-500/10">
                {match.team1.charAt(0).toUpperCase()}
              </div>
              <h2 className={`text-xl sm:text-2xl font-black ${match.winner === match.team1 ? 'text-emerald-300' : 'text-white'}`}>
                {match.team1}
              </h2>
              {match.winner === match.team1 && (
                <span className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Trophy className="w-3.5 h-3.5" /> Winner
                </span>
              )}
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-750 flex items-center justify-center text-xs font-mono font-black text-gray-400 shadow-inner">
                VS
              </div>
            </div>

            {/* Team 2 */}
            <div className="md:col-span-2 flex flex-col items-center p-6 rounded-2xl bg-[#090d16]/80 border border-gray-800">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-500/30 to-cyan-400/30 border-2 border-teal-500/40 flex items-center justify-center text-3xl font-black text-white mb-3 shadow-xl shadow-teal-500/10">
                {match.team2.charAt(0).toUpperCase()}
              </div>
              <h2 className={`text-xl sm:text-2xl font-black ${match.winner === match.team2 ? 'text-emerald-300' : 'text-white'}`}>
                {match.team2}
              </h2>
              {match.winner === match.team2 && (
                <span className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Trophy className="w-3.5 h-3.5" /> Winner
                </span>
              )}
            </div>

          </div>

          {/* Result / Toss Callout */}
          <div className="mt-8 pt-6 border-t border-gray-850 space-y-3">
            {match.result && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-sm font-bold text-emerald-300 text-center">
                <Trophy className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{match.result}</span>
              </div>
            )}

            {match.tossWinner && match.tossDecision && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 text-center">
                <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Toss Result: {match.tossWinner} won the toss and elected to {match.tossDecision}.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Match Specifications Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="p-5 rounded-2xl bg-[#0c1220] border border-gray-800/90">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase mb-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Date & Time</span>
          </div>
          <p className="text-sm font-bold text-white mt-1">{matchDate}</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c1220] border border-gray-800/90">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase mb-1">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>Stadium & City</span>
          </div>
          <p className="text-sm font-bold text-white mt-1 truncate">{match.venue}</p>
          <span className="text-xs text-gray-400">{match.city}</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c1220] border border-gray-800/90">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase mb-1">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Format & Overs</span>
          </div>
          <p className="text-sm font-bold text-white mt-1">{match.format}</p>
          <span className="text-xs text-gray-400">{match.overs} Overs per side</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c1220] border border-gray-800/90">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase mb-1">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Match Official</span>
          </div>
          <p className="text-sm font-bold text-white mt-1 truncate">
            {match.createdBy?.username ? `@${match.createdBy.username}` : 'CrickPulse Admin'}
          </p>
          <span className="text-xs text-gray-400">Match Scheduler</span>
        </div>

      </div>

      {/* Live Ball-by-Ball Scorecard Component */}
      <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 sm:p-8 space-y-6 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ball-by-Ball Match Scorecard</h3>
              <p className="text-xs text-gray-400">Official digital innings breakdown and player statistics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inningsList.map((inn) => (
              <button
                key={inn._id}
                onClick={() => setActiveScorecardInnings(inn.inningsNumber)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition ${
                  activeScorecardInnings === inn.inningsNumber
                    ? 'bg-emerald-500 text-black shadow'
                    : 'bg-gray-850 text-gray-400 hover:text-white'
                }`}
              >
                Innings {inn.inningsNumber}: {inn.totalRuns}/{inn.wickets}
              </button>
            ))}

            {isCreator && (
              <Link
                to={`/matches/${match._id}/score`}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-bold text-xs rounded-xl shadow hover:from-emerald-400 hover:to-teal-300 transition flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Scoring Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* Selected Innings Scorecard Table */}
        {(() => {
          const selectedInnings = inningsList.find((i) => i.inningsNumber === activeScorecardInnings) || inningsList[0];

          if (!selectedInnings || !selectedInnings.batsmen || selectedInnings.batsmen.length === 0) {
            return (
              <div className="text-center py-10 space-y-3">
                <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">No Innings Scored Yet</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {isCreator
                    ? 'Launch the Live Scoring Console to start recording ball-by-ball deliveries for this match.'
                    : 'The match scorer has not commenced digital scoring for this fixture yet.'}
                </p>
                {isCreator && (
                  <Link
                    to={`/matches/${match._id}/score`}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow transition"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Launch Scoring Console</span>
                  </Link>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* Batting Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {selectedInnings.battingTeam} Batting
                  </h4>
                  <span className="text-xs font-mono font-bold text-white">
                    {selectedInnings.totalRuns}/{selectedInnings.wickets} ({selectedInnings.overs} ov)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 pr-4">Batter</th>
                        <th className="py-2.5 px-3">Dismissal</th>
                        <th className="py-2.5 px-2 text-right">R</th>
                        <th className="py-2.5 px-2 text-right">B</th>
                        <th className="py-2.5 px-2 text-right">4s</th>
                        <th className="py-2.5 px-2 text-right">6s</th>
                        <th className="py-2.5 pl-3 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono">
                      {selectedInnings.batsmen.map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-900/40">
                          <td className="py-2.5 pr-4 font-sans font-bold text-white">
                            {b.name}
                            {!b.isOut && <span className="text-emerald-400 text-[10px] ml-1">*</span>}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-gray-400 text-[11px] capitalize">
                            {b.isOut ? b.dismissal : 'Not out'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-white">{b.runs}</td>
                          <td className="py-2.5 px-2 text-right text-gray-400">{b.balls}</td>
                          <td className="py-2.5 px-2 text-right text-gray-400">{b.fours}</td>
                          <td className="py-2.5 px-2 text-right text-gray-400">{b.sixes}</td>
                          <td className="py-2.5 pl-3 text-right text-teal-400">{b.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-800 flex justify-between">
                  <span>
                    Extras: {selectedInnings.extras?.total || 0} (w {selectedInnings.extras?.wides || 0}, nb {selectedInnings.extras?.noBalls || 0}, b {selectedInnings.extras?.byes || 0}, lb {selectedInnings.extras?.legByes || 0})
                  </span>
                  <span>CRR: {selectedInnings.legalBalls > 0 ? ((selectedInnings.totalRuns / (selectedInnings.legalBalls / 6))).toFixed(2) : '0.00'}</span>
                </div>
              </div>

              {/* Bowling Section */}
              <div className="space-y-3 pt-4 border-t border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  {selectedInnings.bowlingTeam} Bowling
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 pr-4">Bowler</th>
                        <th className="py-2.5 px-2 text-right">O</th>
                        <th className="py-2.5 px-2 text-right">M</th>
                        <th className="py-2.5 px-2 text-right">R</th>
                        <th className="py-2.5 px-2 text-right">W</th>
                        <th className="py-2.5 pl-3 text-right">ECON</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono">
                      {selectedInnings.bowlers?.map((bowl, idx) => (
                        <tr key={idx} className="hover:bg-gray-900/40">
                          <td className="py-2.5 pr-4 font-sans font-bold text-white">{bowl.name}</td>
                          <td className="py-2.5 px-2 text-right text-gray-300">{bowl.overs}</td>
                          <td className="py-2.5 px-2 text-right text-gray-400">{bowl.maidens}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-white">{bowl.runsConceded}</td>
                          <td className="py-2.5 px-2 text-right font-black text-teal-300">{bowl.wickets}</td>
                          <td className="py-2.5 pl-3 text-right text-emerald-400">{bowl.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Creator Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0f172a] border border-gray-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Manage Match Status & Results</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Match Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live (In Progress)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Toss Winner</label>
                  <select
                    value={editFormData.tossWinner}
                    onChange={(e) => setEditFormData({ ...editFormData, tossWinner: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select Toss Winner --</option>
                    <option value={match.team1}>{match.team1}</option>
                    <option value={match.team2}>{match.team2}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Toss Decision</label>
                  <select
                    value={editFormData.tossDecision}
                    onChange={(e) => setEditFormData({ ...editFormData, tossDecision: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Decision --</option>
                    <option value="bat">Elected to Bat</option>
                    <option value="bowl">Elected to Bowl</option>
                  </select>
                </div>
              </div>

              {editFormData.status === 'completed' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Winning Team</label>
                  <select
                    value={editFormData.winner}
                    onChange={(e) => setEditFormData({ ...editFormData, winner: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Select Winner --</option>
                    <option value={match.team1}>{match.team1}</option>
                    <option value={match.team2}>{match.team2}</option>
                    <option value="Tie">Match Tied</option>
                    <option value="No Result">No Result</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Result Summary / Message</label>
                <input
                  type="text"
                  value={editFormData.result}
                  onChange={(e) => setEditFormData({ ...editFormData, result: e.target.value })}
                  placeholder="e.g. Royal Challengers won by 15 runs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-900 border border-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Match Fixture"
        message={`Are you sure you want to delete the match between ${match?.team1} and ${match?.team2}? This action will permanently remove all scorecards and player records for this match.`}
        confirmText="Delete Match"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDeleteMatch}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}
