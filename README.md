# EventSync Enterprise — Intelligent Venue & Resource Allocation Platform

> **12-Hour ESE Hackathon Prototype**  
> An intelligent corporate venue & resource allocation platform with discrete multi-resource collision math, 30-minute automatic setup/cleanup buffers, and a 15-minute dynamic waitlist re-allocation engine.

---

## 🏛️ Executive Design System & Aesthetics
- **Aesthetic:** Deep Corporate Slate / Dark Minimalist Executive Dashboard (inspired by Linear, Vercel, and Stripe dashboards).
- **Background Base:** `#0B0F17` (Deep Obsidian) and `#111827` (Dark Slate).
- **Surface Cards:** `#1E293B` (Slate 800) with subtle `1px solid rgba(255, 255, 255, 0.08)` borders.
- **Primary Actions:** Emerald / Teal (`#059669` primary button, `#10B981` hover) and Warm Amber (`#D97706`).
- **Status Indicators:**
  - `CONFIRMED`: `#059669` (Emerald Pill)
  - `WAITLISTED`: `#D97706` (Amber Pill)
  - `WAITLIST_OFFERED`: Amber/Emerald Pulse Pill with 15-minute countdown timer
  - `CANCELLED` / `REJECTED`: `#DC2626` (Rose Pill)
- **Gantt Hatched Buffers:** Hatched diagonal styling representing 30-minute pre-event setup and post-event cleanup intervals.

---

## 📐 Core Business Rules & Mathematical Constraints

### 1. Operating Window & Setup Buffers
- **Daily Operating Window:** `08:00` (8:00 AM) to `22:00` (10:00 PM).
- **Buffer Formula:** Every event $[T_{\text{start}}, T_{\text{end}}]$ reserves physical hall and shared venue equipment for:
  $$[R_{\text{start}}, R_{\text{end}}] = [T_{\text{start}} - 30\text{min},\; T_{\text{end}} + 30\text{min}]$$
- **Boundary Constraint:** The entire reserved interval $[R_{\text{start}}, R_{\text{end}}]$ must lie strictly within `08:00 – 22:00`.
  - Earliest legal event start: `08:30` (buffer begins at `08:00`).
  - Latest legal event end: `21:30` (buffer completes at `22:00`).

### 2. Hall & Multi-Resource Allocation Engine
- **Capacity Requirement:** Assigned hall capacity $\ge$ attendees. Smallest fitting hall is selected to maximize utilization.
- **Staffing Threshold Rule:** If attendees $> 200$, the system automatically enforces a minimum of 2 staff (`staff_requested >= 2`).
- **Hierarchy & Routing:**
  1. Preferred Venue evaluated first.
  2. Fallback to other venues sorted alphabetically by `Venue Name ASC` $\rightarrow$ `Hall Name ASC` (if cross-venue fallback is enabled).
- **Discrete Sub-Interval Resource Check:**
  For any venue $V$, sum of requested equipment/staff across ALL overlapping active bookings must never exceed total venue capacity at any discrete point in time $t \in [R_{\text{start}}, R_{\text{end}}]$:
  $$\sum \text{Staff}(t) \le \text{Total\_Staff}(V),\quad \sum \text{Proj}(t) \le \text{Total\_Proj}(V),\quad \sum \text{Audio}(t) \le \text{Total\_Audio}(V)$$

### 3. Dynamic Waitlist & Re-Allocation Engine
- When an event collides, it enters `WAITLISTED` with an exact mathematical conflict log.
- **Cancellation Event:** When an active booking is cancelled, the engine invokes `process_waitlist_queue(venue_id)`:
  1. Checks waitlisted events in chronological order (`created_at ASC`).
  2. Tests if the candidate legally fits in the newly freed time gap.
  3. If eligible, status transitions to `WAITLIST_OFFERED` with an expiry timestamp:
     $$\text{offer\_expires\_at} = \text{now} + 15\text{ minutes}$$
  4. Client has 15 minutes to pay the advance deposit (35%) and lock the booking to `CONFIRMED`.
  5. If the 15-minute window expires without confirmation, the offer cascades to the next candidate.

---

## ⚡ Live Hackathon Preset Scenarios (One-Click Verification)

The application includes interactive preset buttons on the top bar:

| Preset | Action | Parameters | Expected Result |
| :--- | :--- | :--- | :--- |
| **Step 1** | Client 1 Conference | 120 guests, 10:00–13:00, 1 proj, 3 staff @ Venue A | **CONFIRMED** in Hall A2 (Cap: 150). Reserved: 09:30–13:30. |
| **Step 2** | Client 2 Workshop | 50 guests, 11:00–14:00, 1 proj, 2 staff @ Venue A | **CONFIRMED** in Hall A1 (Cap: 60). Reserved: 10:30–14:30. Staff peak: $3+2=5 \le 5$. |
| **Step 3** | Client 3 Product Launch | 100 guests, 13:15–15:15, 1 proj, 3 staff @ Venue A | **WAITLISTED** with exact conflict trace (Hall A2 collision from 12:45–13:30). |
| **Step 4** | Cancel Step 1 Booking | Cancels Client 1 Conference | Triggers `process_waitlist_queue` $\rightarrow$ Client 3 receives **WAITLIST_OFFERED** with **15-minute countdown**! |
| **Confirm** | Pay Advance & Confirm | Client 3 pays advance deposit ($360.50) | Transitions to **CONFIRMED** with payment audit record. |

---

## 🗄️ Database Architecture

Implemented with SQLAlchemy 2.0 ORM:
- `venues`: Venue names, locations, descriptions, HVAC/AC status, high-res photos.
- `halls`: Hall names, capacities, hall types (`Hall`, `Banquet`, `Auditorium`).
- `venue_resources`: Shared venue inventory (`projector`, `audio_system`, `staff`).
- `users`: Client and Event Manager accounts with role-based access.
- `bookings`: Reserved intervals $[R_{\text{start}}, R_{\text{end}}]$, event intervals $[T_{\text{start}}, T_{\text{end}}]$, attendee counts, resource requests, status badges, conflict trace logs, and offer expiration timestamps.
- `payments`: Financial ledger recording advance deposits (35%) and final settlements.
- `notifications`: Priority waitlist alerts and status notifications.

---

## 🚀 Running the Project Locally

### Prerequisites
- Python 3.9+ (or Python 3.11+)
- Node.js 18+ and npm

### 1. Start FastAPI Backend
```bash
# From workspace root
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Backend will be live at `http://localhost:8000` with Swagger documentation at `http://localhost:8000/docs`.

### 2. Start Vite Frontend
```bash
# In a new terminal window
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:5173`.

### 3. Run Backend Test Suite
```bash
./venv/bin/python3 -m unittest backend/test_engine.py
```
Validates operating window boundaries, setup buffer calculations, multi-resource peaks, and waitlist lifecycle transitions.
