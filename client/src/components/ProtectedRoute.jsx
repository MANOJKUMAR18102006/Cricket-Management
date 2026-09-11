import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <span className="absolute text-2xl">🏏</span>
        </div>
        <p className="text-gray-400 text-sm font-medium animate-pulse">
          Checking CrickPulse credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login while preserving previous attempted path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
