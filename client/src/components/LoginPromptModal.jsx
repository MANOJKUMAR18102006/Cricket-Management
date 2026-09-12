import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, LogIn, X, UserPlus } from 'lucide-react';

export default function LoginPromptModal({
  isOpen,
  onClose,
  title = 'Sign In to Connect',
  description = 'Sign in to connect with players, participate in matches, and unlock full cricket features.',
  actionLabel = 'Sign In',
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1d] border border-emerald-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-white">{title}</h3>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">{description}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>

          <button
            onClick={() => navigate('/register')}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Account</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-300 font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
