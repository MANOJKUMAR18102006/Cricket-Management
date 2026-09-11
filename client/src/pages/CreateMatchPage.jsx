import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import matchService from '../services/matchService';
import teamService from '../services/teamService';
import { 
  PlusCircle, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  Activity, 
  Sparkles, 
  AlertCircle,
  Clock,
  Shield,
  CheckCircle2
} from 'lucide-react';

const FORMATS = [
  { id: 'T10', label: 'T10 Match', defaultOvers: 10, desc: '10 overs per side fast-paced cricket' },
  { id: 'T20', label: 'T20 Match', defaultOvers: 20, desc: 'Standard 20 overs per side cricket' },
  { id: 'ODI', label: 'ODI Match', defaultOvers: 50, desc: '50 overs per side One Day International' },
  { id: 'Custom', label: 'Custom Overs', defaultOvers: 15, desc: 'Custom overs tailored to your club' },
];

export default function CreateMatchPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    team1: '',
    team2: '',
    format: 'T20',
    overs: 20,
    venue: '',
    city: '',
    date: '',
    tournament: '',
    status: 'scheduled',
  });

  const [availableTeams, setAvailableTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await teamService.getTeams({ limit: 50 });
        if (res.success && res.teams) {
          setAvailableTeams(res.teams);
        }
      } catch (err) {
        // Silently fail to allow typing custom team names
      }
    };
    fetchTeams();
  }, []);

  const handleFormatChange = (fmtId) => {
    const selected = FORMATS.find((f) => f.id === fmtId);
    setFormData((prev) => ({
      ...prev,
      format: fmtId,
      overs: selected ? selected.defaultOvers : 20,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.team1.trim()) {
      setError('Team 1 name is required.');
      return;
    }
    if (!formData.team2.trim()) {
      setError('Team 2 name is required.');
      return;
    }
    if (formData.team1.trim().toLowerCase() === formData.team2.trim().toLowerCase()) {
      setError('Team 1 and Team 2 must be different teams.');
      return;
    }
    if (!formData.venue.trim()) {
      setError('Match venue is required.');
      return;
    }
    if (!formData.city.trim()) {
      setError('Match city is required.');
      return;
    }
    if (!formData.date) {
      setError('Match date and time is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await matchService.createMatch({
        ...formData,
        overs: Number(formData.overs),
        date: new Date(formData.date),
      });

      if (res.success && res.match) {
        navigate(`/matches/${res.match._id}`);
      }
    } catch (err) {
      console.error('Failed to create match:', err);
      setError(err.response?.data?.message || 'Could not create match. Please check the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Back link */}
      <div className="mb-6">
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Matches</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Captain & Admin Match Scheduler</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Create a New <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Cricket Match</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Schedule club fixtures, league matches, or friendly games across standard cricket formats.
        </p>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[#0c1220] border border-gray-800/90 p-6 sm:p-8 shadow-2xl space-y-8">
        
        {/* Section 1: Teams Matchup */}
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Participating Teams</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="team1" className="block text-xs font-semibold text-gray-300 mb-2">
                Team 1 (Host / Home Team) *
              </label>
              <input
                id="team1"
                type="text"
                name="team1"
                list="registered-teams-list"
                value={formData.team1}
                onChange={handleChange}
                placeholder="e.g. Royal Challengers"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label htmlFor="team2" className="block text-xs font-semibold text-gray-300 mb-2">
                Team 2 (Opponent / Away Team) *
              </label>
              <input
                id="team2"
                type="text"
                name="team2"
                list="registered-teams-list"
                value={formData.team2}
                onChange={handleChange}
                placeholder="e.g. Mumbai Indians"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Datalist of registered teams for quick autocompletion */}
          <datalist id="registered-teams-list">
            {availableTeams.map((t) => (
              <option key={t._id} value={t.name}>
                {t.city ? `${t.name} (${t.city})` : t.name}
              </option>
            ))}
          </datalist>
        </div>

        {/* Section 2: Format & Overs */}
        <div className="space-y-4 pt-6 border-t border-gray-850">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Match Format & Overs</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {formData.overs} Overs per side
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FORMATS.map((fmt) => {
              const isSelected = formData.format === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => handleFormatChange(fmt.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-[#070b14] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-bold">{fmt.label}</span>
                  <span className="text-[11px] text-gray-500 mt-1 leading-snug">{fmt.desc}</span>
                </button>
              );
            })}
          </div>

          {formData.format === 'Custom' && (
            <div className="max-w-xs pt-2">
              <label htmlFor="custom-overs" className="block text-xs font-semibold text-gray-300 mb-1.5">
                Specify Custom Overs per side
              </label>
              <input
                id="custom-overs"
                type="number"
                name="overs"
                min="1"
                max="100"
                value={formData.overs}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-[#070b14] border border-gray-800 text-white text-sm focus:outline-none focus:border-emerald-500/80"
              />
            </div>
          )}
        </div>

        {/* Section 3: Schedule & Venue */}
        <div className="space-y-4 pt-6 border-t border-gray-850">
          <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Schedule & Venue</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="block text-xs font-semibold text-gray-300 mb-2">
                Match Date & Time *
              </label>
              <input
                id="date"
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white text-sm focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label htmlFor="venue" className="block text-xs font-semibold text-gray-300 mb-2">
                Stadium / Venue *
              </label>
              <input
                id="venue"
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g. M. Chinnaswamy Stadium"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-semibold text-gray-300 mb-2">
                City / Region *
              </label>
              <input
                id="city"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bengaluru"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/80"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Tournament & Status */}
        <div className="space-y-4 pt-6 border-t border-gray-850">
          <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>Tournament & Status</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tournament" className="block text-xs font-semibold text-gray-300 mb-2">
                Tournament / Cup Name (Optional)
              </label>
              <input
                id="tournament"
                type="text"
                name="tournament"
                value={formData.tournament}
                onChange={handleChange}
                placeholder="e.g. Bangalore Premier League"
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-gray-300 mb-2">
                Initial Match Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-[#070b14] border border-gray-800 text-white text-sm focus:outline-none focus:border-emerald-500/80"
              >
                <option value="scheduled">Scheduled (Upcoming)</option>
                <option value="live">Live (Currently in progress)</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-gray-850 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/matches')}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-gray-900 border border-gray-800 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{loading ? 'Creating Match...' : 'Publish Cricket Match'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
