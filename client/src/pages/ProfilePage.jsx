import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import playerService from '../services/playerService';
import PlayerCard from '../components/PlayerCard';
import PlayerCareerStats from '../components/PlayerCareerStats';
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
  Lock
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');

  const handlePrivacyChange = async (newVisibility) => {
    if (privacySaving || player?.profileVisibility === newVisibility) return;
    setPrivacySaving(true);
    setPrivacyMessage('');
    try {
      const res = await playerService.updatePrivacy(newVisibility);
      if (res.success) {
        setPlayer((prev) => ({ ...prev, profileVisibility: newVisibility }));
        setPrivacyMessage(`Saved: Account is now ${newVisibility}!`);
        setTimeout(() => setPrivacyMessage(''), 3500);
      }
    } catch (err) {
      console.error('Failed to update privacy setting:', err);
    } finally {
      setPrivacySaving(false);
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
  }, []);

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* If Player Profile Exists: Display Full Player Card */}
      {hasProfile && player ? (
        <PlayerCard
          player={player}
          isOwner={true}
          onEdit={() => navigate('/players/edit')}
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
              onClick={() => navigate('/players/edit')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Player Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Account Settings & Quick Details Bar */}
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

      {/* Career Stats Section */}
      <div className="space-y-4">
        {/* Career Stats Section (Automatic from completed match scorecards) */}
        {hasProfile && player?._id && (
          <PlayerCareerStats playerId={player._id} />
        )}

        {/* Privacy Settings Card */}
        <div className="rounded-3xl bg-gradient-to-b from-[#0e1526] to-[#0a0f1d] border border-gray-800 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Privacy Settings</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Control who can view your detailed cricket statistics, career data, and match history.
              </p>
            </div>

            {privacySaving && (
              <span className="text-xs text-emerald-400 font-mono animate-pulse">
                Saving changes...
              </span>
            )}
            {privacyMessage && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {privacyMessage}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-wider font-bold text-gray-400">
              Account Visibility
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Public */}
              <label
                onClick={() => handlePrivacyChange('public')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  player?.profileVisibility === 'public'
                    ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#090d16] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌐</span>
                    <span className="font-bold text-sm text-white">Public</span>
                  </div>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="public"
                    checked={player?.profileVisibility === 'public'}
                    onChange={() => {}}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Any authenticated player can view your cricket statistics and match history.
                </p>
              </label>

              {/* Option 2: Private */}
              <label
                onClick={() => handlePrivacyChange('private')}
                className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  player?.profileVisibility === 'private'
                    ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#090d16] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔒</span>
                    <span className="font-bold text-sm text-white">Private</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Default
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="private"
                    checked={player?.profileVisibility === 'private' || !player?.profileVisibility}
                    onChange={() => {}}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Only players you accept can view your detailed cricket statistics and match history.
                </p>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
