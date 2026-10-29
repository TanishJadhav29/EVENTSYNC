import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PresetScenarioBar from './components/PresetScenarioBar';
import LandingPage from './components/LandingPage';
import ClientDashboard from './components/ClientDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import VenueDirectory from './components/VenueDirectory';
import { getVenues, getBookings } from './api';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const MOCK_USERS = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    full_name: 'Sarah Chen (TechCorp Global)',
    email: 'client1@enterprise.io',
    role: 'CLIENT'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    full_name: 'David Miller (DevInnovate)',
    email: 'client2@enterprise.io',
    role: 'CLIENT'
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    full_name: 'Elena Rostova (Apex Ventures)',
    email: 'client3@enterprise.io',
    role: 'CLIENT'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000000',
    full_name: 'Alexander Vance (VP Operations)',
    email: 'admin@eventsync.io',
    role: 'EVENT_MANAGER'
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'client', 'manager', 'venues'
  const [currentUser, setCurrentUser] = useState(MOCK_USERS[0]);
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (toastData) => {
    setToast(toastData);
    setTimeout(() => {
      setToast((prev) => (prev === toastData ? null : prev));
    }, 6000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, bRes] = await Promise.all([
        getVenues(),
        getBookings()
      ]);
      setVenues(vRes.data);
      setBookings(bRes.data);
    } catch (err) {
      console.error('Failed fetching core data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Polling every 8s for live waitlist timer updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB] flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Hackathon Preset Scenario Quick-Action Bar */}
      <PresetScenarioBar onRefresh={fetchData} onNotify={showToast} />

      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={MOCK_USERS}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-xl bg-[#1E293B] border border-white/10 shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-mono">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            setCurrentView={setCurrentView}
            venues={venues}
          />
        )}

        {currentView === 'client' && (
          <ClientDashboard
            currentUser={currentUser}
            venues={venues}
            bookings={bookings}
            onRefresh={fetchData}
            onNotify={showToast}
          />
        )}

        {currentView === 'manager' && (
          <ManagerDashboard
            venues={venues}
            onRefresh={fetchData}
            onNotify={showToast}
          />
        )}

        {currentView === 'venues' && (
          <VenueDirectory
            venues={venues}
            onSelectVenueForBooking={(venueId) => {
              setCurrentView('client');
            }}
          />
        )}
      </main>
    </div>
  );
}
