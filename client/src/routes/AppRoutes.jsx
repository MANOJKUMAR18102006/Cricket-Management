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
import PlayerMatchHistoryPage from '../pages/PlayerMatchHistoryPage';
import PlayerComparisonPage from '../pages/PlayerComparisonPage';
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
import LeaderboardsPage from '../pages/LeaderboardsPage';
import PlayerAnalyticsPage from '../pages/PlayerAnalyticsPage';
import TournamentsPage from '../pages/TournamentsPage';
import CreateTournamentPage from '../pages/CreateTournamentPage';
import TournamentDetailPage from '../pages/TournamentDetailPage';
import NotificationsPage from '../pages/NotificationsPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import AdminPlayersPage from '../pages/AdminPlayersPage';
import AdminTeamsPage from '../pages/AdminTeamsPage';
import AdminMatchesPage from '../pages/AdminMatchesPage';
import SettingsPrivacyPage from '../pages/SettingsPrivacyPage';
import SettingsAccountPage from '../pages/SettingsAccountPage';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import { ToastProvider } from '../context/ToastContext';

export default function AppRoutes() {
  return (
    <AuthProvider>
      <ToastProvider>
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
            <Route path="leaderboards" element={<LeaderboardsPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="analytics" element={<PlayerAnalyticsPage />} />
            <Route path="players/:id/analytics" element={<PlayerAnalyticsPage />} />
            <Route path="compare" element={<PlayerComparisonPage />} />

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
              path="notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings/account"
              element={
                <ProtectedRoute>
                  <SettingsAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings/privacy"
              element={
                <ProtectedRoute>
                  <SettingsPrivacyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={<Navigate to="/settings/privacy" replace />}
            />
            <Route
              path="players/me/edit"
              element={
                <ProtectedRoute>
                  <EditPlayerPage />
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
              path="players/:id/matches"
              element={
                <ProtectedRoute>
                  <PlayerMatchHistoryPage />
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
            <Route
              path="tournaments/create"
              element={
                <ProtectedRoute>
                  <CreateTournamentPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/players"
              element={
                <AdminRoute>
                  <AdminPlayersPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/teams"
              element={
                <AdminRoute>
                  <AdminTeamsPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/matches"
              element={
                <AdminRoute>
                  <AdminMatchesPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
