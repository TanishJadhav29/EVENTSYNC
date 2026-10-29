import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Clock,
  AlertTriangle,
  Building,
  Plus,
  GitMerge,
  Cpu,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  Calendar,
  Activity,
  ArrowRight,
  RefreshCw,
  Trash2
} from 'lucide-react';
import {
  getTimelineData,
  getDecisionTraces,
  getWaitlistQueue,
  createVenue,
  mergeVenues,
  cancelBooking
} from '../api';

export default function ManagerDashboard({
  venues,
  onRefresh,
  onNotify
}) {
  const [activeTab, setActiveTab] = useState('gantt'); // 'gantt', 'traces', 'queue', 'venues'
  const [timelineItems, setTimelineItems] = useState([]);
  const [decisionTraces, setDecisionTraces] = useState([]);
  const [waitlistQueue, setWaitlistQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter venue for Gantt
  const [selectedVenueId, setSelectedVenueId] = useState(venues?.[0]?.id || '');

  useEffect(() => {
    if (!selectedVenueId && venues && venues.length > 0) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  // Add Venue Form Modal
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueLocation, setNewVenueLocation] = useState('');
  const [newVenueDesc, setNewVenueDesc] = useState('');
  const [newVenueAc, setNewVenueAc] = useState(true);
  const [hall1Name, setHall1Name] = useState('Hall Alpha');
  const [hall1Cap, setHall1Cap] = useState(80);
  const [hall2Name, setHall2Name] = useState('Auditorium Prime');
  const [hall2Cap, setHall2Cap] = useState(200);
  const [resProj, setResProj] = useState(2);
  const [resAudio, setResAudio] = useState(2);
  const [resStaff, setResStaff] = useState(5);

  // Merge Venues Modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergePrimary, setMergePrimary] = useState(venues[0]?.id || '');
  const [mergeSecondary, setMergeSecondary] = useState(venues[1]?.id || '');
  const [mergedName, setMergedName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes, wRes] = await Promise.all([
        getTimelineData({ venue_id: selectedVenueId || undefined }),
        getDecisionTraces(),
        getWaitlistQueue()
      ]);
      setTimelineItems(tRes.data);
      setDecisionTraces(dRes.data);
      setWaitlistQueue(wRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, [selectedVenueId]);

  const handleAddVenueSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createVenue({
        name: newVenueName,
        location: newVenueLocation,
        description: newVenueDesc,
        has_ac: newVenueAc,
        halls: [
          { name: hall1Name, capacity: parseInt(hall1Cap), hall_type: 'Hall' },
          { name: hall2Name, capacity: parseInt(hall2Cap), hall_type: 'Auditorium' }
        ],
        resources: {
          projector: parseInt(resProj),
          audio_system: parseInt(resAudio),
          staff: parseInt(resStaff)
        }
      });
      setShowAddVenue(false);
      onRefresh();
      loadData();
      onNotify({
        type: 'success',
        title: 'Venue Created',
        message: `Successfully created ${newVenueName} with halls and resource inventory.`
      });
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (mergePrimary === mergeSecondary) {
      alert('Please choose two different venues to merge.');
      return;
    }
    try {
      setLoading(true);
      const res = await mergeVenues({
        primary_venue_id: mergePrimary,
        secondary_venue_id: mergeSecondary,
        merged_name: mergedName || undefined
      });
      setShowMergeModal(false);
      onRefresh();
      loadData();
      onNotify({
        type: 'success',
        title: 'Venues Merged',
        message: res.data.message
      });
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert time "08:30" to percentage across 08:00 - 22:00 (14 hours = 840 mins)
  const timeToPercent = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = (h - 8) * 60 + m;
    const clamped = Math.max(0, Math.min(840, totalMins));
    return (clamped / 840) * 100;
  };

  const currentVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Event Manager & Judge Visibility Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Audit Dashboard
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time buffer visualization, discrete resource collision math, and dynamic queue inspect
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition"
            title="Refresh engine state"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowMergeModal(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-medium text-xs transition flex items-center gap-1.5"
          >
            <GitMerge className="w-3.5 h-3.5 text-amber-400" />
            <span>Merge Venues</span>
          </button>

          <button
            onClick={() => setShowAddVenue(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Facility</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('gantt')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === 'gantt'
              ? 'bg-slate-800 text-white border border-white/10 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Timeline & Setup Buffers (Gantt)</span>
        </button>

        <button
          onClick={() => setActiveTab('traces')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === 'traces'
              ? 'bg-slate-800 text-white border border-white/10 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Decision Traces & Mathematical Logs ({decisionTraces.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-slate-800 text-white border border-white/10 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-teal-400" />
          <span>Waitlist Queue Inspector ({waitlistQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('venues')}
          className={`px-3.5 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === 'venues'
              ? 'bg-slate-800 text-white border border-white/10 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Building className="w-4 h-4 text-slate-300" />
          <span>Venue & Inventory Pools</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. GANTT / TIMELINE VIEW WITH HATCHED BUFFER BLOCKS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'gantt' && (
        <div className="space-y-6">
          {/* Venue Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#1E293B] border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 uppercase font-semibold">Select Venue:</span>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {(venues || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({((v.halls || []).map((h) => h.name)).join(', ') || 'No halls'})
                  </option>
                ))}
              </select>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-500/50 inline-block"></span>
                <span className="text-slate-300">Active Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-buffer-hatched inline-block"></span>
                <span className="text-amber-300 font-mono">±30m Setup / Cleanup Buffer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/50 inline-block"></span>
                <span className="text-amber-400">Waitlist Offered</span>
              </div>
            </div>
          </div>

          {/* Visual Gantt Chart Grid */}
          <div className="rounded-xl bg-[#1E293B] border border-white/10 p-5 space-y-6 overflow-x-auto">
            {/* Time Header (08:00 to 22:00) */}
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b border-white/10 pb-2 text-[11px] font-mono text-slate-400">
                <div>08:00</div>
                <div>10:00</div>
                <div>12:00</div>
                <div>14:00</div>
                <div>16:00</div>
                <div>18:00</div>
                <div className="text-right">22:00</div>
              </div>

              {/* Hall Rows */}
              <div className="mt-4 space-y-6">
                {(currentVenue?.halls || []).map((hall) => {
                  // Find all items for this hall
                  const hallItems = timelineItems.filter((i) => i.hall_name === hall.name);


                  return (
                    <div key={hall.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-emerald-400" />
                          {hall.name}
                          <span className="text-[10px] font-normal px-2 py-0.2 rounded bg-white/5 text-slate-400">
                            Cap: {hall.capacity} attendees • {hall.hall_type}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {hallItems.filter((i) => i.type === 'event').length} reservation(s) scheduled
                        </span>
                      </div>

                      {/* Track Bar */}
                      <div className="relative h-14 bg-[#0B0F17] rounded-lg border border-white/5 overflow-hidden">
                        {/* Hour grid lines */}
                        <div className="absolute inset-0 grid grid-cols-7 pointer-events-none opacity-10 divide-x divide-white">
                          <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                        </div>

                        {/* Render Buffer & Event Blocks */}
                        {hallItems.map((item) => {
                          const leftPct = timeToPercent(item.start_str);
                          const rightPct = timeToPercent(item.end_str);
                          const widthPct = Math.max(3, rightPct - leftPct);

                          if (item.type === 'buffer_setup' || item.type === 'buffer_cleanup') {
                            return (
                              <div
                                key={item.id}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                title={`${item.title} (${item.start_str} - ${item.end_str})`}
                                className="absolute top-1 bottom-1 bg-buffer-hatched rounded flex items-center justify-center text-[9px] font-mono font-bold text-amber-300 tracking-tighter"
                              >
                                <span className="truncate px-1 opacity-80">30m Buffer</span>
                              </div>
                            );
                          }

                          // Main Event Block
                          return (
                            <div
                              key={item.id}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`${item.title}: ${item.start_str} - ${item.end_str} (${item.attendees} attendees)`}
                              className={`absolute top-1 bottom-1 rounded px-2 flex flex-col justify-center text-white border shadow-md transition hover:z-20 ${
                                item.status === 'WAITLIST_OFFERED'
                                  ? 'bg-amber-600/90 border-amber-400'
                                  : 'bg-emerald-700/90 border-emerald-500'
                              }`}
                            >
                              <div className="text-[11px] font-bold truncate leading-tight">
                                {item.title}
                              </div>
                              <div className="text-[9px] font-mono text-slate-200 truncate mt-0.5">
                                {item.start_str} - {item.end_str} • {item.attendees}p
                              </div>
                            </div>
                          );
                        })}

                        {hallItems.length === 0 && (
                          <div className="h-full flex items-center justify-center text-[11px] text-slate-600 italic">
                            No reservations scheduled in this hall
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DECISION TRACES & MATHEMATICAL CONFLICT LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'traces' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Mathematical Conflict & Decision Trace Log
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact discrete interval formulas explaining why bookings were waitlisted or rejected
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {decisionTraces.length} recorded events
            </span>
          </div>

          <div className="rounded-xl bg-[#1E293B] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111827] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Event & Client</th>
                    <th className="py-3 px-4">Requested Window (Reserved ±30m)</th>
                    <th className="py-3 px-4">Demand</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Audit Conflict Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {decisionTraces.map((trace) => (
                    <tr key={trace.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-sans">{trace.title}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{trace.client_name} • {trace.venue_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {trace.requested_window}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {trace.attendees}p | {trace.projectors} proj | {trace.staff} staff
                      </td>
                      <td className="py-3 px-4">
                        {trace.status === 'WAITLISTED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Waitlisted
                          </span>
                        )}
                        {trace.status === 'WAITLIST_OFFERED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/25 text-amber-300 border border-amber-500/50 animate-pulse">
                            Offer Active
                          </span>
                        )}
                        {trace.status === 'CANCELLED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                            Cancelled
                          </span>
                        )}
                        {trace.status === 'CONFIRMED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Confirmed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 leading-relaxed font-sans max-w-md">
                        <p className="bg-[#0B0F17] p-2 rounded border border-white/5 text-[11px] text-amber-200/90 font-mono">
                          {trace.trace_log}
                        </p>
                      </td>
                    </tr>
                  ))}

                  {decisionTraces.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 italic font-sans">
                        No conflict traces logged yet. Click "3. Step 3: Collide & Waitlist" in the top bar to test!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. WAITLIST QUEUE INSPECTOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Waitlist Queue & Expiry Countdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                FIFO ordered queue (created_at ASC) evaluated whenever an active reservation is cancelled
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {waitlistQueue.length} queued
            </span>
          </div>

          <div className="grid gap-3">
            {waitlistQueue.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  item.status === 'WAITLIST_OFFERED'
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                    : 'bg-[#1E293B] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 font-mono font-bold text-xs">
                    #{item.queue_position}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                      {item.status === 'WAITLIST_OFFERED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          Active 15m Offer
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
                          Queued
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Client: <b className="text-white">{item.client_name}</b> • Venue: {item.venue_name} • Window: {item.time_window}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      {item.rejection_reason}
                    </p>
                  </div>
                </div>

                {item.status === 'WAITLIST_OFFERED' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-amber-300 font-mono font-bold">
                      {item.offer_seconds_left ? `${Math.floor(item.offer_seconds_left / 60)}m ${item.offer_seconds_left % 60}s` : '15m 00s'} left
                    </span>
                  </div>
                )}
              </div>
            ))}

            {waitlistQueue.length === 0 && (
              <div className="p-12 text-center rounded-xl bg-[#1E293B] border border-white/10">
                <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Waitlist Queue is Currently Empty</p>
                <p className="text-xs text-slate-500 mt-1">
                  Trigger Step 3 from the top test bar to create a collision and observe queue behavior.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. VENUE INVENTORY & CAPACITY POOLS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'venues' && (
        <div className="grid md:grid-cols-3 gap-6">
          {venues.map((v) => {
            const maxStaff = v.resources.find((r) => r.resource_type === 'staff')?.total_quantity || 0;
            const maxProj = v.resources.find((r) => r.resource_type === 'projector')?.total_quantity || 0;
            const maxAudio = v.resources.find((r) => r.resource_type === 'audio_system')?.total_quantity || 0;

            return (
              <div key={v.id} className="rounded-xl bg-[#1E293B] border border-white/10 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="h-36 overflow-hidden relative">
                    <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 backdrop-blur text-white">
                      {v.name}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-400">{v.location}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Configured Halls:
                      </span>
                      {v.halls.map((h) => (
                        <div key={h.id} className="flex justify-between text-slate-300 bg-[#0B0F17] px-2.5 py-1 rounded border border-white/5">
                          <span className="font-medium text-white">{h.name} ({h.hall_type})</span>
                          <span className="font-mono text-emerald-400 font-semibold">{h.capacity} cap</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Shared Venue Resource Pool:
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                        <div className="p-1.5 rounded bg-[#0B0F17] border border-white/5">
                          <span className="text-slate-400 block text-[9px]">PROJECTORS</span>
                          <span className="font-bold text-white">{maxProj} units</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#0B0F17] border border-white/5">
                          <span className="text-slate-400 block text-[9px]">AUDIO</span>
                          <span className="font-bold text-white">{maxAudio} units</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#0B0F17] border border-white/5">
                          <span className="text-slate-400 block text-[9px]">STAFF</span>
                          <span className="font-bold text-emerald-400">{maxStaff} staff</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => {
                      setSelectedVenueId(v.id);
                      setActiveTab('gantt');
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition"
                  >
                    View Gantt Schedule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD FACILITY MODAL */}
      {/* ------------------------------------------------------------- */}
      {showAddVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl bg-[#1E293B] border border-white/10 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#111827]">
              <h3 className="text-sm font-bold text-white">Add New Venue Facility</h3>
              <button onClick={() => setShowAddVenue(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddVenueSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue D (Convention Center)"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Location Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 700 Enterprise Way"
                  value={newVenueLocation}
                  onChange={(e) => setNewVenueLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Halls Setup */}
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-white/5 space-y-2">
                <span className="font-semibold text-slate-300 uppercase tracking-wider block">Halls & Capacities:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={hall1Name}
                    onChange={(e) => setHall1Name(e.target.value)}
                    placeholder="Hall 1 Name"
                    className="px-2 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                  />
                  <input
                    type="number"
                    value={hall1Cap}
                    onChange={(e) => setHall1Cap(e.target.value)}
                    placeholder="Capacity"
                    className="px-2 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                  />
                  <input
                    type="text"
                    value={hall2Name}
                    onChange={(e) => setHall2Name(e.target.value)}
                    placeholder="Hall 2 Name"
                    className="px-2 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                  />
                  <input
                    type="number"
                    value={hall2Cap}
                    onChange={(e) => setHall2Cap(e.target.value)}
                    placeholder="Capacity"
                    className="px-2 py-1.5 rounded bg-slate-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Shared Pool */}
              <div className="p-3 rounded-lg bg-[#0B0F17] border border-white/5 space-y-2">
                <span className="font-semibold text-slate-300 uppercase tracking-wider block">Shared Resources:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Projectors</label>
                    <input
                      type="number"
                      value={resProj}
                      onChange={(e) => setResProj(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Audio Systems</label>
                    <input
                      type="number"
                      value={resAudio}
                      onChange={(e) => setResAudio(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Staff Pool</label>
                    <input
                      type="number"
                      value={resStaff}
                      onChange={(e) => setResStaff(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddVenue(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MERGE VENUES MODAL */}
      {/* ------------------------------------------------------------- */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-[#1E293B] border border-white/10 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <GitMerge className="w-4 h-4 text-amber-400" />
              <span>Merge Dual Venues into Combined Campus</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Combines hall inventory and pools shared staff/equipment across two venues.
            </p>

            <form onSubmit={handleMergeSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Primary Venue (Receives Inventory)</label>
                <select
                  value={mergePrimary}
                  onChange={(e) => setMergePrimary(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-[#0B0F17] border border-white/10 text-white"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Secondary Venue (Merged & Linked)</label>
                <select
                  value={mergeSecondary}
                  onChange={(e) => setMergeSecondary(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-[#0B0F17] border border-white/10 text-white"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Combined Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Silicon & Metropolis Dual Campus"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-[#0B0F17] border border-white/10 text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                >
                  Execute Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
