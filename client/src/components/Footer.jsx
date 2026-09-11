import React from 'react';
import { Shield, Globe, Share2, MessageCircle, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#070a12] border-t border-gray-800 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏏</span>
              <span className="text-xl font-bold text-white tracking-tight">
                Crick<span className="text-emerald-400">Pulse</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Empowering grassroots, gully, club, and corporate cricket with modern digital scoring, player management, and live match analytics.
            </p>
            <div className="flex items-center gap-3 text-gray-400 pt-2">
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:text-emerald-400 hover:bg-gray-800 transition" title="Website">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:text-emerald-400 hover:bg-gray-800 transition" title="Social Channels">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gray-900 hover:text-emerald-400 hover:bg-gray-800 transition" title="Community Chat">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#scoring" className="hover:text-emerald-400 transition">Live Ball-by-Ball Scoring</a></li>
              <li><a href="#stats" className="hover:text-emerald-400 transition">Player Profiles & Career Stats</a></li>
              <li><a href="#tournaments" className="hover:text-emerald-400 transition">Tournament Fixtures & Tables</a></li>
              <li><a href="#leaderboard" className="hover:text-emerald-400 transition">MVP & Leaderboards</a></li>
            </ul>
          </div>

          {/* Column 3: Community */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#clubs" className="hover:text-emerald-400 transition">Register Your Club</a></li>
              <li><a href="#umpires" className="hover:text-emerald-400 transition">Certified Scorers & Umpires</a></li>
              <li><a href="#guidelines" className="hover:text-emerald-400 transition">Cricket Rules & Standard Formats</a></li>
              <li><a href="#support" className="hover:text-emerald-400 transition">Community Support</a></li>
            </ul>
          </div>

          {/* Column 4: Architecture & API */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-3">Developers & Status</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  REST API Operational
                </span>
              </li>
              <li>
                <span className="text-xs font-mono text-gray-500">
                  Endpoint: <span className="text-emerald-400">GET /api/health</span>
                </span>
              </li>
              <li className="text-xs text-gray-500">Node.js • Express • MongoDB • React</li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} CrickPulse. All rights reserved. Built for passionate cricketers everywhere.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for cricket lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
