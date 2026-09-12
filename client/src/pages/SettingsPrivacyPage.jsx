import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import playerService from '../services/playerService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Globe,
  Users,
  Eye,
  Activity,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function SettingsPrivacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState('private');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await playerService.getMyPlayer();
        if (res.success && res.player) {
          setPlayer(res.player);
          setSelectedVisibility(res.player.profileVisibility || 'private');
        }
      } catch (err) {
        console.error('Failed to load profile settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, []);

  const handleSavePrivacy = async (visibilityToSave) => {
    const targetVisibility = visibilityToSave || selectedVisibility;
    if (saving) return;

    setSaving(true);
    setStatusMessage('');
    try {
      const res = await playerService.updatePrivacy(targetVisibility);
      if (res.success) {
        setSelectedVisibility(targetVisibility);
        if (player) {
          setPlayer((prev) => ({ ...prev, profileVisibility: targetVisibility }));
        }
        setStatusMessage(`Account visibility saved: ${targetVisibility.toUpperCase()}`);
        toast.success(`Account visibility updated to ${targetVisibility}.`);
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-xs">Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Profile</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy Settings</span>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Shield className="w-7 h-7 text-emerald-400" />
          <span>Privacy Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
          Manage who can discover your cricket profile, inspect your career batting & bowling averages,
          and view your match performances.
        </p>
      </div>

      {/* Feedback banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Privacy Card */}
      <div className="rounded-3xl bg-gradient-to-b from-[#0e1628] to-[#0a0f1d] border border-gray-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Account Visibility</h3>
          <p className="text-xs text-gray-400">
            Control the privacy level for your cricket statistics, career records, and match history.
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Private (Default) */}
          <div
            onClick={() => handleSavePrivacy('private')}
            className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
              selectedVisibility === 'private'
                ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                : 'bg-[#080d1a] border-gray-800 hover:border-gray-700'
            }`}
          >
            {selectedVisibility === 'private' && (
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
            )}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Private</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Recommended / Default
                    </span>
                  </div>
                </div>

                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={selectedVisibility === 'private'}
                  onChange={() => handleSavePrivacy('private')}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <p className="text-xs text-gray-400 leading-relaxed mt-2">
                Only players you accept can view your detailed cricket statistics and match history.
                Basic information (name, role, club, city) remains visible on search.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Requires accepted connection</span>
            </div>
          </div>

          {/* Option 2: Public */}
          <div
            onClick={() => handleSavePrivacy('public')}
            className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
              selectedVisibility === 'public'
                ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                : 'bg-[#080d1a] border-gray-800 hover:border-gray-700'
            }`}
          >
            {selectedVisibility === 'public' && (
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
            )}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Public</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Open Profile
                    </span>
                  </div>
                </div>

                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={selectedVisibility === 'public'}
                  onChange={() => handleSavePrivacy('public')}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <p className="text-xs text-gray-400 leading-relaxed mt-2">
                Your permitted cricket profile and statistics can be discovered by other users and guests.
                Anyone can view your career performances and compare statistics with you.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Open to all CrickPulse members</span>
            </div>
          </div>
        </div>

        {/* Security / Safe Profile Notice */}
        <div className="p-4 rounded-2xl bg-[#080d18] border border-gray-800/80 flex items-start gap-3 text-xs text-gray-400">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-gray-300">Security & Information Safety</p>
            <p className="leading-relaxed text-[11px] text-gray-400">
              CrickPulse never exposes your account password, authentication tokens, email address,
              or sensitive internal identifiers under any visibility setting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
