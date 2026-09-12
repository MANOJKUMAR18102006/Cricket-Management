import React from 'react';
import {
  Calendar,
  Trophy,
  Shield,
  Sparkles,
  Users,
  Flag,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function PlayerCareerTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0c1220] border border-gray-800/80 p-6 text-center">
        <p className="text-xs text-gray-500">No career milestones recorded yet.</p>
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'team':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'tournament':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'career_start':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      default:
        return <Flag className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'team':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'tournament':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'career_start':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
      default:
        return 'border-gray-700 bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="rounded-3xl bg-[#0c1220] border border-gray-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide">
              Career Timeline
            </h3>
            <p className="text-xs text-gray-400">Chronological journey and milestone events</p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-gray-500">
          {timeline.length} Milestones
        </span>
      </div>

      {/* Vertical Timeline Track */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-teal-500/40 before:to-gray-800">
        {timeline.map((item, idx) => (
          <div key={`${item.year}-${idx}`} className="relative group">
            {/* Timeline Node Icon */}
            <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0a0f1d] border-2 border-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 group-hover:border-emerald-400 transition">
              <div className="scale-75 sm:scale-90">{getEventIcon(item.type)}</div>
            </div>

            {/* Timeline Content Card */}
            <div className="p-4 rounded-2xl bg-[#090d16] border border-gray-800/90 group-hover:border-emerald-500/40 transition-all shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white px-2 py-0.5 rounded-lg bg-gray-800/80 border border-gray-700 font-mono">
                    {item.year}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">→</span>
                  <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition">
                    {item.title}
                  </h4>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getEventBadge(
                    item.type
                  )}`}
                >
                  {item.type === 'career_start' ? 'Debut' : item.type}
                </span>
              </div>

              {item.details && (
                <p className="text-xs text-gray-400 leading-relaxed pl-1">
                  {item.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
