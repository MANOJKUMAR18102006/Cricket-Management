import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-3" />
        <p className="text-gray-400 text-sm">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0e1628] border border-red-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            You must have administrator privileges to view this section. Unauthorized access attempts are monitored and recorded.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gray-800 hover:bg-gray-700 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}
