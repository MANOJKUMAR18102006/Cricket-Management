import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import tournamentService from '../services/tournamentService';
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  FileText,
  Clock,
  Shield,
} from 'lucide-react';

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
];

export default function CreateTournamentPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    format: 'T20',
    overs: 20,
    startDate: '',
    endDate: '',
    maxTeams: 8,
    status: 'registration_open',
    banner: PRESET_BANNERS[0],
    logo: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'format') {
      const defaultOvers = value === 'T10' ? 10 : value === 'ODI' ? 50 : 20;
      setFormData((prev) => ({ ...prev, format: value, overs: defaultOvers }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Tournament name is required');
      return;
    }

    if (!formData.location.trim()) {
      setError('Location / venue ground is required');
      return;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Both start date and end date are required');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be before start date');
      return;
    }

    const maxTeamsNum = parseInt(formData.maxTeams, 10);
    if (isNaN(maxTeamsNum) || maxTeamsNum < 2 || maxTeamsNum > 64) {
      setError('Maximum teams must be between 2 and 64');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        city: formData.city.trim(),
        format: formData.format,
        overs: parseInt(formData.overs, 10) || 20,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        maxTeams: maxTeamsNum,
        status: formData.status,
        banner: formData.banner,
        logo: formData.logo,
      };

      const res = await tournamentService.createTournament(payload);
      if (res.success && res.tournament) {
        navigate(`/tournaments/${res.tournament._id}`);
      }
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.response?.data?.message || 'Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back Link */}
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournaments</span>
        </Link>

        {/* Form Container */}
        <div className="bg-[#0e1526] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="border-b border-gray-800 pb-5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>Organizer Registration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Launch a Cricket Tournament
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Set up tournament regulations, format, venue, and invite franchises to compete.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Tournament Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">
                Tournament Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Coimbatore Premier League 2026"
                className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">
                Description & Rules
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Details on tournament format, prizes, entry qualifications, and venue amenities..."
                className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Location & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Location / Ground <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. SNR Cricket Ground"
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  City <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Coimbatore"
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Format & Overs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Format <span className="text-emerald-400">*</span>
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="T20">T20 (20 Overs)</option>
                  <option value="T10">T10 (10 Overs)</option>
                  <option value="ODI">ODI (50 Overs)</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Overs per Innings <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  name="overs"
                  value={formData.overs}
                  onChange={handleChange}
                  min={1}
                  max={100}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Start Date <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  End Date <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Max Teams & Initial Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Maximum Participating Teams
                </label>
                <input
                  type="number"
                  name="maxTeams"
                  value={formData.maxTeams}
                  onChange={handleChange}
                  min={2}
                  max={64}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Initial Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="registration_open">Registration Open</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Live / Ongoing</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
              <Link
                to="/tournaments"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Creating Tournament...' : 'Create Tournament'}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}
