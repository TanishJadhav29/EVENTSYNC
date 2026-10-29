import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Video,
  Mic,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  CreditCard,
  Building,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { createBooking, prevalidateBooking, cancelBooking } from '../api';
import PaymentModal from './PaymentModal';

export default function ClientDashboard({
  currentUser,
  venues,
  bookings,
  onRefresh,
  onNotify
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePaymentBooking, setActivePaymentBooking] = useState(null);
  const [isWaitlistPayment, setIsWaitlistPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState(100);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [preferredVenueId, setPreferredVenueId] = useState(venues[0]?.id || '');
  const [projectors, setProjectors] = useState(1);
  const [audio, setAudio] = useState(1);
  const [staff, setStaff] = useState(2);
  const [strictPreference, setStrictPreference] = useState(true);
  const [notes, setNotes] = useState('');

  // Pre-validation state
  const [preValidation, setPreValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Filter bookings for current user
  const userBookings = bookings.filter((b) => b.client_email === currentUser?.email || b.client_name?.includes(currentUser?.full_name?.split(' ')[0]));

  // Auto-enforce staff if attendees > 200
  useEffect(() => {
    if (attendees > 200 && staff < 2) {
      setStaff(2);
    }
  }, [attendees, staff]);

  // Run dry-run pre-validation debounce
  useEffect(() => {
    if (!preferredVenueId || !eventDate || !startTime || !endTime) return;

    const timer = setTimeout(async () => {
      try {
        setIsValidating(true);
        const res = await prevalidateBooking({
          preferred_venue_id: preferredVenueId,
          attendees: parseInt(attendees) || 1,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          projectors_requested: parseInt(projectors) || 0,
          audio_requested: parseInt(audio) || 0,
          staff_requested: parseInt(staff) || 0,
          allow_cross_venue_fallback: !strictPreference
        });
        setPreValidation(res.data);
      } catch (err) {
        setPreValidation({
          is_feasible: false,
          decision_trace: err.response?.data?.detail || err.message
        });
      } finally {
        setIsValidating(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [preferredVenueId, attendees, eventDate, startTime, endTime, projectors, audio, staff, strictPreference]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await createBooking({
        client_email: currentUser?.email,
        client_id: currentUser?.id,
        preferred_venue_id: preferredVenueId,
        title,
        attendees: parseInt(attendees),
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        projectors_requested: parseInt(projectors),
        audio_requested: parseInt(audio),
        staff_requested: parseInt(staff),
        special_notes: notes,
        allow_cross_venue_fallback: !strictPreference
      });

      setShowCreateModal(false);
      onRefresh();

      if (res.data.status === 'CONFIRMED') {
        onNotify({
          type: 'success',
          title: 'Booking Confirmed!',
          message: `Allocated to ${res.data.assigned_hall} at ${res.data.assigned_venue}. Advance deposit recorded.`
        });
      } else if (res.data.status === 'WAITLISTED') {
        onNotify({
          type: 'warning',
          title: 'Entered Priority Waitlist',
          message: res.data.decision_trace
        });
      }
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id, bookingTitle) => {
    if (!window.confirm(`Are you sure you want to cancel '${bookingTitle}'? This will free the hall and trigger waitlist re-allocation.`)) {
      return;
    }
    try {
      const res = await cancelBooking(id);
      onNotify({
        type: 'info',
        title: 'Booking Cancelled',
        message: `${res.data.message} ${res.data.promoted_waitlist_count > 0 ? `Promoted ${res.data.promoted_waitlist_count} waitlisted candidate(s)!` : ''}`
      });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  // Find any active waitlist offer
  const activeOffer = userBookings.find((b) => b.status === 'WAITLIST_OFFERED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Client Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Client Portal</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Session
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <b className="text-white">{currentUser?.full_name}</b> ({currentUser?.email})
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Event Reservation</span>
        </button>
      </div>

      {/* High-Priority Waitlist Offer Notification Banner */}
      {activeOffer && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#1E293B] to-amber-500/10 border border-amber-500/40 shadow-lg animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Priority Waitlist Offer Extended for "{activeOffer.title}"!
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    15-Minute Countdown
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  A cancellation freed up a slot at <b className="text-white">{activeOffer.venue_name}</b> ({activeOffer.hall_name}).
                  Complete your advance deposit (${activeOffer.advance_deposit}) to lock this reservation.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActivePaymentBooking(activeOffer);
                setIsWaitlistPayment(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shrink-0 flex items-center gap-1.5 shadow"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Advance & Confirm Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table / Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Your Event Bookings & Allocation Records
          </h2>
          <span className="text-xs text-slate-400">
            {userBookings.length} {userBookings.length === 1 ? 'record' : 'records'} found
          </span>
        </div>

        {userBookings.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#1E293B] border border-white/10">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No event reservations found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click the "New Event Reservation" button above or run a Hackathon preset scenario from the top bar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {userBookings.map((b) => {
              const isConfirmed = b.status === 'CONFIRMED';
              const isWaitlisted = b.status === 'WAITLISTED';
              const isOffered = b.status === 'WAITLIST_OFFERED';
              const isCancelled = b.status === 'CANCELLED';

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-xl bg-[#1E293B] border border-white/10 hover:border-white/20 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-white">{b.title}</h3>

                        {/* Status Badge */}
                        {isConfirmed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#059669]/15 text-[#10B981] border border-[#059669]/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed
                          </span>
                        )}
                        {isWaitlisted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#D97706]/15 text-[#F59E0B] border border-[#D97706]/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Waitlisted
                          </span>
                        )}
                        {isOffered && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Waitlist Offered
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#DC2626]/15 text-[#F87171] border border-[#DC2626]/30 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ID: <span className="font-mono text-slate-300">#{b.id.slice(0, 8)}</span> • Venue: <b className="text-white">{b.venue_name}</b> {b.hall_name ? `• ${b.hall_name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOffered && (
                        <button
                          onClick={() => {
                            setActivePaymentBooking(b);
                            setIsWaitlistPayment(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Advance</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setActivePaymentBooking(b);
                          setIsWaitlistPayment(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition"
                      >
                        Ledger & Cost
                      </button>

                      {isConfirmed && (
                        <button
                          onClick={() => handleCancelBooking(b.id, b.title)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/5">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Event Time</span>
                      <span className="font-medium text-white">{b.start_time_str} - {b.end_time_str}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{b.date_str}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/5">
                      <span className="text-[10px] text-emerald-400 block uppercase tracking-wider font-semibold">Reserved (±30m)</span>
                      <span className="font-medium text-emerald-300 font-mono">{b.reserved_start_str} - {b.reserved_end_str}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Setup + Cleanup buffer</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/5">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Attendance & Staff</span>
                      <span className="font-medium text-white">{b.attendees} guests</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{b.staff_requested} staff assigned</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/5">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Financial Status</span>
                      <span className="font-medium text-white font-mono">${b.total_cost} total</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                        Paid: ${b.total_paid} {b.balance_due > 0 ? `(Due: $${b.balance_due})` : '• Fully Paid'}
                      </span>
                    </div>
                  </div>

                  {/* Decision Trace or Rejection Reason Log */}
                  {b.rejection_reason && (
                    <div className="p-3 rounded-lg bg-[#111827] border border-white/5 text-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                        Engine Conflict & Decision Trace:
                      </span>
                      <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                        {b.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Event Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-[#1E293B] border border-white/10 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#111827]">
              <div>
                <h3 className="text-base font-bold text-white">Create New Event Reservation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated buffer generation and discrete multi-resource validation
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Summit 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date & Operating Hours Notice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Event Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Earliest: 08:30 (with 30m buffer)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    End Time (24h)
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Latest: 21:30 (with 30m buffer)</span>
                </div>
              </div>

              {/* Preferred Venue & Attendee Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preferred Venue
                  </label>
                  <select
                    value={preferredVenueId}
                    onChange={(e) => setPreferredVenueId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={attendees}
                    onChange={(e) => setAttendees(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {attendees > 200 && (
                    <span className="text-[10px] text-emerald-400 mt-0.5 block font-medium">
                      ✓ Auto-enforces minimum 2 staff (&gt;200 attendees rule)
                    </span>
                  )}
                </div>
              </div>

              {/* Resource Sliders: Projectors, Audio, Staff */}
              <div className="p-4 rounded-xl bg-[#0B0F17] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Equipment & Staffing Allocation
                  </span>
                  <span className="text-[11px] text-slate-500">Shared venue-level pool</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Projectors:</span>
                      <b className="text-emerald-400">{projectors}</b>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={projectors}
                      onChange={(e) => setProjectors(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Audio Systems:</span>
                      <b className="text-emerald-400">{audio}</b>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      value={audio}
                      onChange={(e) => setAudio(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Event Staff:</span>
                      <b className="text-emerald-400">{staff}</b>
                    </div>
                    <input
                      type="range"
                      min={attendees > 200 ? 2 : 0}
                      max="6"
                      value={staff}
                      onChange={(e) => setStaff(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Strict Venue Preference Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-white/5 text-xs">
                <div>
                  <span className="font-semibold text-white block">Strict Preferred Venue Only</span>
                  <span className="text-[11px] text-slate-400">
                    If enabled, enters Waitlist if preferred venue collides. If disabled, tries alphabetical fallback venues.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={strictPreference}
                  onChange={(e) => setStrictPreference(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Live Real-Time Pre-Validation Banner */}
              {preValidation && (
                <div
                  className={`p-3.5 rounded-lg border text-xs transition duration-200 ${
                    preValidation.is_feasible
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {preValidation.is_feasible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {preValidation.is_feasible
                          ? `Feasible! Can allocate ${preValidation.assigned_hall} at ${preValidation.assigned_venue}`
                          : 'Potential Collision / Waitlist Trigger Detected'}
                      </p>
                      <p className="text-[11px] leading-relaxed opacity-90 font-mono">
                        {preValidation.decision_trace}
                      </p>
                      {preValidation.costs && (
                        <p className="text-[11px] font-medium text-slate-300 pt-1">
                          Est. Total: <b>${preValidation.costs.total_cost}</b> • Advance Deposit: <b>${preValidation.costs.advance_deposit}</b>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow flex items-center gap-2"
                >
                  {loading ? 'Processing Allocation...' : 'Submit Event Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {activePaymentBooking && (
        <PaymentModal
          booking={activePaymentBooking}
          isWaitlistOffer={isWaitlistPayment}
          onClose={() => setActivePaymentBooking(null)}
          onSuccess={() => {
            onRefresh();
            onNotify({
              type: 'success',
              title: 'Payment Recorded',
              message: 'Deposit verified and status successfully updated.'
            });
          }}
        />
      )}
    </div>
  );
}
