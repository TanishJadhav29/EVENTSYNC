import React from 'react';
import { Layers, Shield, User, Building2, Calendar, Clock } from 'lucide-react';


export default function Navbar({
  currentView,
  setCurrentView,
  currentUser,
  setCurrentUser,
  users,
  notificationsCount
}) {
  return (
    <header className="sticky top-0 z-50 bg-[#0B0F17]/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center space-x-3 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>EVENTSYNC</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-300 tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Intelligent Venue & Resource Engine</p>
            </div>
          </button>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                currentView === 'landing'
                  ? 'bg-slate-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('client')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                currentView === 'client'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Client Portal</span>
            </button>
            <button
              onClick={() => setCurrentView('manager')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                currentView === 'manager'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Manager & Judge View</span>
            </button>
            <button
              onClick={() => setCurrentView('venues')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                currentView === 'venues'
                  ? 'bg-slate-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Venue Directory</span>
            </button>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-4">
          {/* Operating Window Indicator */}
          <div className="hidden lg:flex items-center px-2.5 py-1 rounded bg-[#111827] border border-white/5 text-[11px] text-slate-400 gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>08:00 - 22:00 Window</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-medium">±30m Buffers</span>
          </div>

          {/* Quick Role / User Profile Switcher */}
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-white/10 rounded-lg p-1">
            <User className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={currentUser?.id || ''}
              onChange={(e) => {
                const selected = users.find((u) => u.id === e.target.value);
                if (selected) {
                  setCurrentUser(selected);
                  if (selected.role === 'EVENT_MANAGER') {
                    setCurrentView('manager');
                  } else {
                    setCurrentView('client');
                  }
                }
              }}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-2"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                  {u.role === 'EVENT_MANAGER' ? '👔 ' : '👤 '}
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Portal Access Button if on landing page */}
          {currentView === 'landing' && (
            <button
              onClick={() => setCurrentView('client')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            >
              Open Dashboard
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
