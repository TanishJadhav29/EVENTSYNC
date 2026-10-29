import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import { runPresetStep1, runPresetStep2, runPresetStep3, runPresetStep4, resetDatabase } from '../api';


export default function PresetScenarioBar({ onRefresh, onNotify }) {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const handleStep = async (stepNumber, runner, label) => {
    try {
      setLoading(true);
      const res = await runner();
      setActiveStep(stepNumber);
      if (onNotify) {
        onNotify({
          type: 'success',
          title: `Preset Step ${stepNumber} Executed: ${label}`,
          message: res.data.decision_trace || res.data.message || 'Operation processed successfully.'
        });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (onNotify) {
        onNotify({
          type: 'error',
          title: `Step ${stepNumber} Execution Failed`,
          message: err.response?.data?.detail || err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await resetDatabase();
      setActiveStep(0);
      if (onNotify) {
        onNotify({
          type: 'info',
          title: 'Database Re-seeded',
          message: 'All tables reset to clean initial seed data (Venues A, B, C).'
        });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (onNotify) {
        onNotify({
          type: 'error',
          title: 'Reset Failed',
          message: err.response?.data?.detail || err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111827] border-b border-white/10 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-3 h-3 mr-1" />
            Hackathon Preset Scenarios
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Quick-run core test harness to verify buffer calculation and waitlist engine:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleStep(1, runPresetStep1, 'Conference @ Venue A (120 Guests)')}
            disabled={loading}
            className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 border ${
              activeStep === 1
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
            }`}
          >
            <span>1. Step 1: Conf (120p)</span>
          </button>

          <button
            onClick={() => handleStep(2, runPresetStep2, 'Workshop @ Venue A (50 Guests)')}
            disabled={loading}
            className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 border ${
              activeStep === 2
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700'
            }`}
          >
            <span>2. Step 2: Workshop (50p)</span>
          </button>

          <button
            onClick={() => handleStep(3, runPresetStep3, 'Product Launch (Collision Test)')}
            disabled={loading}
            className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 border ${
              activeStep === 3
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>3. Step 3: Collide & Waitlist</span>
          </button>

          <button
            onClick={() => handleStep(4, runPresetStep4, 'Cancel Step 1 -> Promote Waitlist')}
            disabled={loading}
            className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1 border ${
              activeStep === 4
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 text-emerald-300 border-emerald-500/30 hover:bg-slate-700'
            }`}
          >
            <ArrowRight className="w-3 h-3 text-emerald-400" />
            <span>4. Step 4: Cancel & Trigger Offer</span>
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            title="Reset database to initial seed data"
            className="px-2 py-1 rounded bg-slate-800/80 text-slate-400 hover:text-white border border-white/10 hover:bg-slate-700 transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
