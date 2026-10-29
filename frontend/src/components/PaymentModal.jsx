import React, { useState } from 'react';
import { X, Shield, CreditCard, Receipt } from 'lucide-react';
import { recordPayment, confirmWaitlistOffer } from '../api';


export default function PaymentModal({ booking, onClose, onSuccess, isWaitlistOffer = false }) {
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState('ADVANCE_DEPOSIT');
  const [amount, setAmount] = useState(
    isWaitlistOffer ? booking.advance_deposit : booking.balance_due || booking.advance_deposit
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isWaitlistOffer) {
        await confirmWaitlistOffer(booking.id);
      } else {
        await recordPayment({
          booking_id: booking.id,
          amount: parseFloat(amount),
          payment_type: paymentType
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-[#1E293B] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Payment & Audit Ledger</h3>
              <p className="text-[11px] text-slate-400">Booking: {booking.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Summary Box */}
          <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Venue & Hall:</span>
              <span className="font-semibold text-white">
                {booking.venue_name} • {booking.hall_name || 'Allocating...'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Event Date & Hours:</span>
              <span className="text-slate-300">
                {booking.date_str} ({booking.start_time_str} - {booking.end_time_str})
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Attendees / Staff:</span>
              <span className="text-slate-300">
                {booking.attendees} guests • {booking.staff_requested} staff
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-medium">
              <span className="text-slate-300">Total Calculated Cost:</span>
              <span className="text-white font-mono font-bold">${booking.total_cost}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Advance Deposit Required (35%):</span>
              <span className="font-mono font-bold">${booking.advance_deposit}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-medium">
              <span>Total Already Paid:</span>
              <span className="text-slate-200 font-mono">${booking.total_paid || 0}</span>
            </div>
            <div className="flex justify-between text-amber-400 font-medium">
              <span>Remaining Balance:</span>
              <span className="font-mono font-bold">${booking.balance_due || 0}</span>
            </div>
          </div>

          {/* Offer Banner if Waitlist Offered */}
          {isWaitlistOffer && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Priority 15-Minute Window Active</p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  Confirming payment of the advance deposit (${booking.advance_deposit}) officially locks the hall and upgrades your status to CONFIRMED.
                </p>
              </div>
            </div>
          )}

          {/* Payment Type Selection */}
          {!isWaitlistOffer && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Payment Type
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ADVANCE_DEPOSIT">Advance Deposit (35%)</option>
                <option value="FINAL_SETTLEMENT">Final Settlement Balance</option>
              </select>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Payment Amount ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0B0F17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{loading ? 'Processing...' : isWaitlistOffer ? 'Pay Advance & Confirm Slot' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
