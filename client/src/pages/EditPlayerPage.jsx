import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import playerService from '../services/playerService';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Flame, 
  Target, 
  Zap, 
  Shield, 
  MapPin, 
  Users, 
  Hash, 
  Calendar, 
  FileText, 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

export default function EditPlayerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasExistingProfile, setHasExistingProfile] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    playingRole: 'Batter',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    jerseyNumber: '',
    currentTeam: '',
    city: '',
    dateOfBirth: '',
    gender: 'Male',
    bio: '',
    profileImage: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await playerService.getMyPlayer();
        if (res.success && res.hasProfile && res.player) {
          setHasExistingProfile(true);
          const p = res.player;
          setFormData({
            displayName: p.displayName || '',
            playingRole: p.playingRole || 'Batter',
            battingStyle: p.battingStyle || 'Right-hand bat',
            bowlingStyle: p.bowlingStyle || 'None',
            jerseyNumber: p.jerseyNumber !== undefined && p.jerseyNumber !== null ? p.jerseyNumber : '',
            currentTeam: p.currentTeam || '',
            city: p.city || '',
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : '',
            gender: p.gender || 'Male',
            bio: p.bio || '',
            profileImage: p.profileImage || '',
          });
        } else {
          // Pre-populate with auth user details
          setFormData((prev) => ({
            ...prev,
            displayName: user?.username || '',
            city: user?.city || '',
            bio: user?.bio || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching player profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleRoleSelect = (role) => {
    setFormData((prev) => ({ ...prev, playingRole: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      setErrorMessage('Please provide a display name.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        ...formData,
        jerseyNumber: formData.jerseyNumber ? Number(formData.jerseyNumber) : undefined,
      };

      if (hasExistingProfile) {
        await playerService.updateMyPlayer(payload);
      } else {
        await playerService.createPlayer(payload);
      }

      setSuccessMessage('Profile saved successfully! Redirecting...');
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
    } catch (err) {
      console.error('Save player profile error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to save profile. Please check your entries.'
      );
    } finally {
      setSaving(false);
    }
  };

  const playingRoles = [
    { id: 'Batter', label: 'Batter', icon: Flame, desc: 'Specialist Batsman', color: 'emerald' },
    { id: 'Bowler', label: 'Bowler', icon: Target, desc: 'Pace or Spin Bowling', color: 'teal' },
    { id: 'All-Rounder', label: 'All-Rounder', icon: Zap, desc: 'Bat & Bowl Capability', color: 'amber' },
    { id: 'Wicketkeeper', label: 'Wicketkeeper', icon: Shield, desc: 'Keeper & Bat', color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Loading player profile details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back Button */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to My Profile</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {hasExistingProfile ? 'Edit Your Player Profile' : 'Create Your Player Profile'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Customize your cricket persona, skills, jersey number, and club affiliations.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-[#0e1424] border border-gray-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Playing Role Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2.5">
              Primary Playing Role *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {playingRoles.map((role) => {
                const Icon = role.icon;
                const isSelected = formData.playingRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/15 scale-[1.02]'
                        : 'border-gray-800 bg-[#090d16] text-gray-400 hover:text-gray-200 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800/80 text-gray-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{role.label}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{role.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Identity & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Player Display Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="displayName"
                  required
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="e.g. Virat Kohli"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Jersey Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  name="jerseyNumber"
                  min="0"
                  max="999"
                  value={formData.jerseyNumber}
                  onChange={handleChange}
                  placeholder="18"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

          </div>

          {/* Section 3: Batting & Bowling Styles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Batting Style
              </label>
              <select
                name="battingStyle"
                value={formData.battingStyle}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              >
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Bowling Style
              </label>
              <select
                name="bowlingStyle"
                value={formData.bowlingStyle}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              >
                <option value="None">None (Pure Batter)</option>
                <option value="Right-arm fast">Right-arm fast</option>
                <option value="Right-arm fast-medium">Right-arm fast-medium</option>
                <option value="Right-arm medium">Right-arm medium</option>
                <option value="Right-arm off-spin">Right-arm off-spin</option>
                <option value="Right-arm leg-spin">Right-arm leg-spin</option>
                <option value="Left-arm fast">Left-arm fast</option>
                <option value="Left-arm medium">Left-arm medium</option>
                <option value="Left-arm orthodox spin">Left-arm orthodox spin</option>
                <option value="Left-arm chinaman">Left-arm chinaman</option>
              </select>
            </div>

          </div>

          {/* Section 4: Current Team, City, Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Current Club / Team
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="currentTeam"
                  value={formData.currentTeam}
                  onChange={handleChange}
                  placeholder="e.g. Royal Challengers"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                City / Region
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
                  placeholder="e.g. Bengaluru"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

          </div>

          {/* Section 5: Date of Birth & Avatar URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Profile Image URL (Optional)
              </label>
              <input
                type="url"
                name="profileImage"
                value={formData.profileImage}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Section 6: Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Player Bio
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3.5 flex items-start pointer-events-none text-gray-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                name="bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Describe your cricket journey, playing style, favorite shots, or achievements..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#090d16] border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-850">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{hasExistingProfile ? 'Update Profile' : 'Save Profile'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
