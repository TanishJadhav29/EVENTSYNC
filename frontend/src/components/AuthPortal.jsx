import React, { useState } from 'react';
import { User, Shield, Lock, Mail, ArrowRight, CheckCircle2, Building, Sparkles } from 'lucide-react';

export default function AuthPortal({ users, currentUser, onSelectUser, onEnterPortal }) {
  const [activeRole, setActiveRole] = useState('CLIENT'); // 'CLIENT' or 'EVENT_MANAGER'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('••••••••••••');

  const filteredUsers = users.filter((u) => u.role === activeRole);

  const handleQuickLogin = (user) => {
    onSelectUser(user);
    onEnterPortal(user.role === 'EVENT_MANAGER' ? 'manager' : 'client');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      handleQuickLogin(found);
    } else {
      // Pick first user of that role
      const fallback = filteredUsers[0];
      handleQuickLogin(fallback);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-[#1E293B] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Portal Authentication</h2>
          <p className="text-xs text-slate-400">
            Sign in to access event reservations, resource tracking, and audit ledgers
          </p>
        </div>

        {/* Tabbed Role Selector */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0F17] border border-white/5 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveRole('CLIENT');
              setEmail('client1@enterprise.io');
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${
              activeRole === 'CLIENT'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Client Portal</span>
          </button>

          <button
            onClick={() => {
              setActiveRole('EVENT_MANAGER');
              setEmail('admin@eventsync.io');
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${
              activeRole === 'EVENT_MANAGER'
                ? 'bg-slate-800 text-amber-400 shadow-sm border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Event Manager</span>
          </button>
        </div>

        {/* Quick Demo Login One-Click Profiles */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            One-Click Demo Profiles ({activeRole === 'CLIENT' ? 'Enterprise Clients' : 'Operations VP'}):
          </label>
          <div className="space-y-1.5">
            {filteredUsers.map((u) => {
              const isSelected = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className={`w-full p-2.5 rounded-lg text-left text-xs transition flex items-center justify-between border ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/40 text-white'
                      : 'bg-[#111827] border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{u.full_name}</span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Sign In →
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full"></div>
          <span className="bg-[#1E293B] px-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            or password sign-in
          </span>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Corporate Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email || filteredUsers[0]?.email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@enterprise.io"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center justify-center gap-1.5 shadow mt-2"
          >
            <span>Authenticate into {activeRole === 'CLIENT' ? 'Client' : 'Manager'} Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
