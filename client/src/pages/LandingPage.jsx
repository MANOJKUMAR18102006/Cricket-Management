import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkApiHealth } from '../services/api';
import { 
  Activity, 
  Trophy, 
  TrendingUp, 
  Users, 
  Flame, 
  Server, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight,
  Target,
  BarChart3
} from 'lucide-react';

export default function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await checkApiHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealthError(err.message || 'Could not connect to backend server');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="relative overflow-hidden">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-80 right-10 w-80 h-80 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="pt-12 pb-20 md:pt-20 md:pb-28 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Empowering Grassroots to Professional Cricket
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Every Ball. Every Run. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Feel the Pulse of Cricket.
            </span>
          </h1>

          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
            The all-in-one platform for live ball-by-ball digital scoring, career player profiles, 
            tournament fixtures, and club management. Built for cricket lovers, by cricket lovers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/matches"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Flame className="w-5 h-5 text-amber-300 fill-current" />
              Explore Matches
            </Link>
            <Link
              to="/players"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-gray-300 bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 transition flex items-center justify-center gap-2"
            >
              <span>Discover Players</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Real-time Backend Health Indicator */}
          <div className="pt-6">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0e1526]/90 border border-gray-800/80 shadow-md text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-gray-200">Backend API:</span>
                {loadingHealth ? (
                  <span className="text-amber-400 animate-pulse">Checking status...</span>
                ) : healthError ? (
                  <span className="flex items-center gap-1 text-red-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Offline / Disconnected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {healthData?.status?.toUpperCase() || 'ONLINE'}
                  </span>
                )}
              </div>

              {healthData && (
                <>
                  <span className="hidden sm:inline text-gray-600">•</span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Database className="w-3.5 h-3.5 text-teal-400" />
                    <span>DB: <strong className="text-gray-200 capitalize">{healthData.database?.status}</strong></span>
                  </div>
                  <span className="hidden sm:inline text-gray-600">•</span>
                  <div className="text-gray-400">
                    Uptime: <strong className="text-gray-200">{healthData.uptime}</strong>
                  </div>
                </>
              )}

              <button 
                onClick={fetchHealth} 
                disabled={loadingHealth}
                title="Refresh API status"
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

        </div>

        {/* Live Match Preview Card Mockup */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-b from-gray-850 to-gray-900/90 border border-gray-800/90 p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  LIVE
                </span>
                <span className="text-xs text-gray-400 font-medium">Premier T20 Championship • Final</span>
              </div>
              <span className="text-xs text-emerald-400 font-mono">Over 16.4 • Target: 182</span>
            </div>

            {/* Teams & Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 items-center">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Strikers Cricket Club</h3>
                  <div className="text-2xl font-black text-white tracking-tight">
                    154/3 <span className="text-sm font-normal text-gray-400">(16.4/20 ov)</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-0.5">CRR: 9.24 • RRR: 8.40</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-800">
                <div className="text-left sm:text-right">
                  <h3 className="font-bold text-lg text-gray-300">Royal Strikers XI</h3>
                  <div className="text-2xl font-black text-gray-300">
                    181/6 <span className="text-sm font-normal text-gray-500">(20.0 ov)</span>
                  </div>
                  <p className="text-xs text-amber-400 mt-0.5 font-medium">Need 28 runs in 20 balls</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl font-bold text-amber-400">
                  👑
                </div>
              </div>
            </div>

            {/* Batsmen and Bowler Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-800/80 text-xs">
              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold">Rohit V.*</span>
                  <p className="text-[11px] text-gray-400">Striker</p>
                </div>
                <div className="font-mono font-semibold text-white">58* (34b) 6x4 3x6</div>
              </div>
              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="text-gray-300 font-medium">David K.</span>
                  <p className="text-[11px] text-gray-400">Non-striker</p>
                </div>
                <div className="font-mono font-semibold text-white">32* (18b) 2x4 2x6</div>
              </div>
              <div className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-medium">Samir A.</span>
                  <p className="text-[11px] text-gray-400">Bowling</p>
                </div>
                <div className="font-mono font-semibold text-white">3.4-0-32-1</div>
              </div>
            </div>

            {/* Recent Balls Timeline */}
            <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between">
              <span className="text-xs text-gray-400">Recent:</span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-300">1</span>
                <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-300">2</span>
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">4</span>
                <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-300">0</span>
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold">6</span>
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold">W</span>
                <span className="w-6 h-6 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 flex items-center justify-center font-bold">1</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Feature Highlights Section */}
      <section className="py-16 bg-[#070a13] border-t border-gray-850">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Comprehensive Platform</h2>
            <p className="text-3xl font-extrabold text-white sm:text-4xl">
              Everything Your Cricket Community Needs
            </p>
            <p className="text-gray-400 text-sm">
              Designed from ground up with modern tech to streamline scoring, stats, leagues, and social interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#0c1220] border border-gray-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Digital Scoring</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Effortless ball-by-ball scoring for overs, extras, wickets, wagon wheels, and run rate calculations in real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#0c1220] border border-gray-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Player Career Profiles</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Detailed batting & bowling career records, milestones, MVP ratings, strike rates, and head-to-head records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#0c1220] border border-gray-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Tournament Management</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Host round-robin or knockout tournaments with automatic points tables, Net Run Rate (NRR) calculators, and fixture generators.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#0c1220] border border-gray-800 hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cricket Social Pulse</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Share match highlights, celebrate man-of-the-match awards, connect with local clubs, and discover players in your city.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-12 border-t border-gray-850 bg-[#090d16]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 text-center">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-6">
            Engineered on the Modern MERN Architecture
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm font-semibold text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> MongoDB & Mongoose
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span> Express.js REST API
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> React 19 + Vite
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Tailwind CSS
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> JWT & Bcrypt Ready
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
