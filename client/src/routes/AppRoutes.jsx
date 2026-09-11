import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';
import EditPlayerPage from '../pages/EditPlayerPage';
import PlayerDetailPage from '../pages/PlayerDetailPage';
import PlayersPage from '../pages/PlayersPage';
import ConnectionsPage from '../pages/ConnectionsPage';
import MatchesPage from '../pages/MatchesPage';
import CreateMatchPage from '../pages/CreateMatchPage';
import MatchDetailPage from '../pages/MatchDetailPage';
import LiveScoringPage from '../pages/LiveScoringPage';
import TeamsPage from '../pages/TeamsPage';
import CreateTeamPage from '../pages/CreateTeamPage';
import TeamDetailPage from '../pages/TeamDetailPage';
import EditTeamPage from '../pages/EditTeamPage';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Public Routes */}
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="players/:id" element={<PlayerDetailPage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="matches/:id" element={<MatchDetailPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:id" element={<TeamDetailPage />} />

            {/* Protected Routes */}
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="connections"
              element={
                <ProtectedRoute>
                  <ConnectionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="players/edit"
              element={
                <ProtectedRoute>
                  <EditPlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="matches/create"
              element={
                <ProtectedRoute>
                  <CreateMatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="matches/:id/score"
              element={
                <ProtectedRoute>
                  <LiveScoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="teams/create"
              element={
                <ProtectedRoute>
                  <CreateTeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="teams/:id/edit"
              element={
                <ProtectedRoute>
                  <EditTeamPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
