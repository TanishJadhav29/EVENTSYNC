import React from 'react';
import {
  Layers,
  ShieldCheck,
  Clock,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Building,
  Users,
  Video,
  Mic,
  CalendarCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function LandingPage({ setCurrentView, venues }) {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB]">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-[#0B0F17] to-[#0B0F17] pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Cpu className="w-3.5 h-3.5" />
            <span>Autonomous Resource Allocation & Conflict Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Intelligent Venue Scheduling with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              Zero Collisions
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Engineered for high-stakes corporate venues. Automates 30-minute buffer enforcement, multi-resource shared pools, and dynamic 15-minute waitlist re-allocations.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setCurrentView('client')}
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-950 flex items-center gap-2 group"
            >
              <span>Launch Client Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              onClick={() => setCurrentView('manager')}
              className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold text-sm transition flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Manager & Audit View</span>
            </button>
          </div>

          {/* Key Executive Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-[#1E293B] border border-white/5">
              <div className="text-2xl font-bold text-white">±30 Min</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Auto-Buffer Lock</div>
              <p className="text-[11px] text-slate-500 mt-1">Guaranteed setup & teardown buffer</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E293B] border border-white/5">
              <div className="text-2xl font-bold text-emerald-400">0 Collisions</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Discrete Timeline Math</div>
              <p className="text-[11px] text-slate-500 mt-1">Calculates equipment & staff peaks</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E293B] border border-white/5">
              <div className="text-2xl font-bold text-amber-400">15-Minute</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Priority Offer Window</div>
              <p className="text-[11px] text-slate-500 mt-1">Auto-promotes waitlist on cancellation</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1E293B] border border-white/5">
              <div className="text-2xl font-bold text-white">08:00 - 22:00</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">Daily Operating Window</div>
              <p className="text-[11px] text-slate-500 mt-1">Strict boundary constraint checks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-20 bg-[#111827] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              Architectural Engine
            </h2>
            <p className="mt-2 text-3xl font-bold text-white tracking-tight">
              Rigorous Mathematical Resource Governance
            </p>
            <p className="mt-3 text-slate-400 text-sm">
              Standard booking systems only check hall availability. EventSync Enterprise simulates the continuous overlap of shared personnel and AV inventory.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#1E293B] border border-white/10 hover:border-emerald-500/30 transition">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">30-Min Temporal Buffers</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Every booking $[T_{start}, T_{end}]$ automatically locks the physical hall and shared venue equipment from $[T_{start}-30m, T_{end}+30m]$, ensuring technical teardown and catering turnover.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <code>R_start = T_start - 30m</code>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#1E293B] border border-white/10 hover:border-emerald-500/30 transition">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Cumulative Resource Pools</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Detects discrete peak loads across simultaneous bookings. Staff, audio systems, and laser projectors are tracked on a sub-interval timeline to prevent over-allocation.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-teal-400 font-mono">
                <code>∑ Staff(t) ≤ Total_Staff(V)</code>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#1E293B] border border-white/10 hover:border-amber-500/30 transition">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">15-Min Dynamic Waitlist</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                When an active booking is cancelled, the engine computes the freed gap, identifies the earliest eligible waitlisted client, and issues an exclusive 15-minute offer lock.
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-amber-400 font-mono">
                <code>offer_expires_at = now + 15m</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues Showcase */}
      <section className="py-20 bg-[#0B0F17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Infrastructure Portfolio
              </h2>
              <p className="mt-1 text-2xl font-bold text-white">Enterprise Venue Directory</p>
            </div>
            <button
              onClick={() => setCurrentView('venues')}
              className="mt-4 md:mt-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore all facilities & equipment details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {venues.slice(0, 3).map((v) => {
              const totalCap = v.halls.reduce((acc, h) => acc + h.capacity, 0);
              const maxStaff = v.resources.find((r) => r.resource_type === 'staff')?.total_quantity || 0;
              const maxProj = v.resources.find((r) => r.resource_type === 'projector')?.total_quantity || 0;
              const maxAudio = v.resources.find((r) => r.resource_type === 'audio_system')?.total_quantity || 0;

              return (
                <div key={v.id} className="rounded-xl overflow-hidden bg-[#1E293B] border border-white/10 flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={v.image_url}
                      alt={v.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 backdrop-blur text-emerald-300 border border-emerald-500/30">
                        {v.has_ac ? 'Full Climate Control' : 'Standard HVAC'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{v.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{v.description}</p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-white/5">
                          <span className="text-slate-400">Available Halls:</span>
                          <span className="font-semibold text-white">
                            {v.halls.map((h) => `${h.name} (${h.capacity}p)`).join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-white/5">
                          <span className="text-slate-400">Shared Equipment:</span>
                          <span>{maxProj} Proj • {maxAudio} Audio • {maxStaff} Staff</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Max Capacity: <b className="text-white">{totalCap} attendees</b></span>
                      <button
                        onClick={() => setCurrentView('client')}
                        className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-700/80 hover:bg-emerald-600 text-white transition"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#0B0F17] border-t border-white/10 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EventSync Enterprise. Designed for 12-hour ESE Hackathon evaluation.</p>
        </div>
      </footer>
    </div>
  );
}
