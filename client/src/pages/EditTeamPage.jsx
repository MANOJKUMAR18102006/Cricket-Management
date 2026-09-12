import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import teamService from '../services/teamService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  Shield,
  MapPin,
  FileText,
  Crown,
  Upload,
  ArrowLeft,
  Trash2,
  Sparkles,
  AlertCircle,
  Save,
  Users,
} from 'lucide-react';

const PRESET_LOGOS = [
  {
    name: 'Red Stallions',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Blue Titans',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Golden Warriors',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Emerald Knights',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Lightning Strikers',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
  },
];

export default function EditTeamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    description: '',
    logo: '',
    captain: '',
    viceCaptain: '',
  });

  const [members, setMembers] = useState([]);
  const [logoMode, setLogoMode] = useState('preset');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [creatorId, setCreatorId] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await teamService.getTeamById(id);
        if (res.success && res.team) {
          const t = res.team;
          setFormData({
            name: t.name || '',
            city: t.city || '',
            description: t.description || '',
            logo: t.logo || PRESET_LOGOS[0].url,
            captain: t.captain?._id || '',
            viceCaptain: t.viceCaptain?._id || '',
          });
          setMembers(t.members || []);
          setCreatorId(t.createdBy?._id || t.createdBy);
        }
      } catch (err) {
        console.error('Error fetching team for edit:', err);
        setError(err.response?.data?.message || 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // If a player is selected as captain, that player cannot be appointed as vice captain
      if (name === 'captain' && next.viceCaptain && String(next.viceCaptain) === String(value)) {
        next.viceCaptain = '';
      }
      return next;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }

    if (formData.captain && formData.viceCaptain && String(formData.captain) === String(formData.viceCaptain)) {
      setError('The player selected as Captain cannot also be appointed as Vice Captain');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        description: formData.description.trim(),
        logo: formData.logo,
        captain: formData.captain || null,
        viceCaptain: formData.viceCaptain || null,
      };

      const res = await teamService.updateTeam(id, payload);
      if (res.success) {
        navigate(`/teams/${id}`);
      }
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    setDeleting(true);
    try {
      const res = await teamService.deleteTeam(id);
      if (res.success) {
        toast.success('Team deleted successfully.');
        navigate('/teams');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete team');
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage label="Loading team editor..." />;
  }

  const isCreatorOrAdmin = user && (user._id === creatorId || user.role === 'admin');

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Back Link */}
        <Link
          to={`/teams/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Team Profile</span>
        </Link>

        {/* Card Container */}
        <div className="bg-[#0e1526]/90 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
          
          {/* Header */}
          <div className="border-b border-gray-800 pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Team Management Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Edit Team Profile
            </h1>
            <p className="text-sm text-gray-400">
              Update club branding, headquarters, and assign Captain & Vice Captain roles.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Team Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Team Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={60}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                City / Base <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  maxLength={60}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Team Bio & Ethos
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3.5 flex items-start pointer-events-none text-gray-500">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={500}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                />
              </div>
            </div>

            {/* Leadership Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#090d16] border border-gray-800 rounded-2xl">
              
              {/* Captain Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Captain</span>
                </label>
                <select
                  name="captain"
                  value={formData.captain}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e1526] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Captain --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.displayName} ({m.playingRole || 'Player'})
                    </option>
                  ))}
                </select>
                {members.length === 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">Add squad members first</p>
                )}
              </div>

              {/* Vice Captain Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>Vice Captain</span>
                </label>
                <select
                  name="viceCaptain"
                  value={formData.viceCaptain}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#0e1526] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Vice Captain --</option>
                  {members
                    .filter((m) => m._id !== formData.captain)
                    .map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.displayName} ({m.playingRole || 'Player'})
                      </option>
                    ))}
                </select>
              </div>

            </div>

            {/* Logo Customization */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Team Crest / Logo
              </label>

              <div className="flex rounded-xl bg-[#090d16] p-1 border border-gray-800">
                <button
                  type="button"
                  onClick={() => setLogoMode('preset')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    logoMode === 'preset'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Choose Crest
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    logoMode === 'upload'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    logoMode === 'url'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Custom URL
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#090d16] border border-gray-800 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-emerald-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                  {formData.logo ? (
                    <img
                      src={formData.logo}
                      alt="Team Logo Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '';
                      }}
                    />
                  ) : (
                    <Shield className="w-8 h-8 text-emerald-400" />
                  )}
                </div>

                <div className="flex-1">
                  {logoMode === 'preset' && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-gray-400">Select standard franchise crest:</span>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_LOGOS.map((item) => (
                          <button
                            type="button"
                            key={item.name}
                            onClick={() => setFormData((prev) => ({ ...prev, logo: item.url }))}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition ${
                              formData.logo === item.url
                                ? 'border-emerald-400 scale-105'
                                : 'border-gray-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {logoMode === 'upload' && (
                    <div className="space-y-1.5">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold cursor-pointer transition border border-gray-700">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Choose New Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-gray-500">PNG, JPG, WebP up to 2MB</p>
                    </div>
                  )}

                  {logoMode === 'url' && (
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        value={customLogoUrl}
                        onChange={(e) => {
                          setCustomLogoUrl(e.target.value);
                          setFormData((prev) => ({ ...prev, logo: e.target.value }));
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-1.5 bg-[#0e1526] border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>

              <Link
                to={`/teams/${id}`}
                className="py-3 px-5 bg-gray-800/80 hover:bg-gray-800 text-gray-300 font-semibold text-sm rounded-xl transition"
              >
                Cancel
              </Link>
            </div>

          </form>

          {/* Danger Zone: Delete Team */}
          {isCreatorOrAdmin && (
            <div className="pt-6 border-t border-red-500/20 space-y-3">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Danger Zone</span>
              </h3>
              <p className="text-xs text-gray-400">
                Permanently delete this team and disband its squad. This action cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Team</span>
              </button>
            </div>
          )}

        </div>

      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Delete Team"
        message="Are you sure you want to delete this team? This permanently removes the club and disbands its squad. This action cannot be undone."
        confirmText="Delete Team"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteTeam}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}
