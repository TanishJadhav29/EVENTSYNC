import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => api.get('/health');
export const getVenues = () => api.get('/venues');
export const createVenue = (data) => api.post('/venues', data);
export const mergeVenues = (data) => api.post('/venues/merge', data);

export const prevalidateBooking = (data) => api.post('/bookings/prevalidate', data);
export const createBooking = (data) => api.post('/bookings', data);
export const getBookings = (params) => api.get('/bookings', { params });
export const cancelBooking = (id) => api.post(`/bookings/${id}/cancel`);
export const confirmWaitlistOffer = (id) => api.post(`/bookings/${id}/confirm-offer`);

export const recordPayment = (data) => api.post('/payments', data);
export const getNotifications = (userId) => api.get(`/notifications/${userId}`);

export const getTimelineData = (params) => api.get('/analytics/timeline', { params });
export const getDecisionTraces = () => api.get('/analytics/decision-traces');
export const getWaitlistQueue = () => api.get('/waitlist/queue');

// Presets
export const resetDatabase = () => api.post('/presets/reset');
export const runPresetStep1 = () => api.post('/presets/step-1');
export const runPresetStep2 = () => api.post('/presets/step-2');
export const runPresetStep3 = () => api.post('/presets/step-3');
export const runPresetStep4 = () => api.post('/presets/step-4');

export default api;
