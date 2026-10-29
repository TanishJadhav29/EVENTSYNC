import React, { useState } from 'react';
import { Building2, Search, SlidersHorizontal, Check, Wind, Users, Video, Mic, ArrowRight } from 'lucide-react';

export default function VenueDirectory({ venues, onSelectVenueForBooking }) {
  const [search, setSearch] = useState('');
  const [filterAc, setFilterAc] = useState('ALL');
  const [minCapacity, setMinCapacity] = useState(0);

  const filteredVenues = venues.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase());

    const matchesAc = filterAc === 'ALL' || (filterAc === 'AC' ? v.has_ac : !v.has_ac);

    const totalCap = v.halls.reduce((sum, h) => sum + h.capacity, 0);
    const matchesCap = totalCap >= minCapacity;

    return matchesSearch && matchesAc && matchesCap;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Venue Directory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse facilities, hall configurations, and real-time equipment pools
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-[#1E293B] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search venue by name, district, or hall type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterAc}
            onChange={(e) => setFilterAc(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none"
          >
            <option value="ALL">All Climate Types</option>
            <option value="AC">Climate Controlled (AC)</option>
          </select>

          <select
            value={minCapacity}
            onChange={(e) => setMinCapacity(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none"
          >
            <option value={0}>Any Capacity</option>
            <option value={100}>Min 100 Capacity</option>
            <option value={200}>Min 200 Capacity</option>
            <option value={300}>Min 300+ Capacity</option>
          </select>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {filteredVenues.map((v) => {
          const totalCap = v.halls.reduce((sum, h) => sum + h.capacity, 0);
          const maxStaff = v.resources.find((r) => r.resource_type === 'staff')?.total_quantity || 0;
          const maxProj = v.resources.find((r) => r.resource_type === 'projector')?.total_quantity || 0;
          const maxAudio = v.resources.find((r) => r.resource_type === 'audio_system')?.total_quantity || 0;

          return (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden bg-[#1E293B] border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition shadow-lg group"
            >
              <div>
                <div className="h-44 overflow-hidden relative">
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 backdrop-blur text-emerald-300 border border-emerald-500/30">
                      {v.has_ac ? 'Full Climate Control' : 'Standard Ventilation'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{v.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{v.location}</p>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">{v.description}</p>
                  </div>

                  {/* Halls */}
                  <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Individual Halls:
                    </span>
                    {v.halls.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0B0F17] border border-white/5 text-[11px]"
                      >
                        <span className="font-medium text-white">{h.name} ({h.hall_type})</span>
                        <span className="text-emerald-400 font-mono font-semibold">{h.capacity} attendees</span>
                      </div>
                    ))}
                  </div>

                  {/* Resource Inventory */}
                  <div className="pt-3 border-t border-white/5 space-y-1 text-xs">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Shared Pool Inventory:
                    </span>
                    <div className="text-[11px] text-slate-300 flex items-center gap-3">
                      <span>🎥 {maxProj} Projectors</span>
                      <span>🔊 {maxAudio} Audio</span>
                      <span>👔 {maxStaff} Staff</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => onSelectVenueForBooking(v.id)}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <span>Book at this Facility</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredVenues.length === 0 && (
          <div className="col-span-3 p-12 text-center rounded-xl bg-[#1E293B] border border-white/10">
            <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No venues matched your filter</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search term or adjusting filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
