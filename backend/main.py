import logging
from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session


try:
    from database import (
        Base,
        Booking,
        Hall,
        Notification,
        Payment,
        User,
        Venue,
        VenueResource,
        engine,
        get_db,
        reset_and_reseed,
        seed_database,
    )
except ImportError:
    from backend.database import (
        Base,
        Booking,
        Hall,
        Notification,
        Payment,
        User,
        Venue,
        VenueResource,
        engine,
        get_db,
        reset_and_reseed,
        seed_database,
    )


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventsync")

app = FastAPI(
    title="EventSync Enterprise API",
    description="Intelligent Venue & Resource Allocation Platform with Setup Buffers and Dynamic Waitlist Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure database is created and seeded
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_database()


# -----------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------

class HallSchema(BaseModel):
    id: str
    venue_id: str
    name: str
    capacity: int
    hall_type: str

    class Config:
        from_attributes = True

class ResourceSchema(BaseModel):
    id: str
    venue_id: str
    resource_type: str
    total_quantity: int

    class Config:
        from_attributes = True

class VenueSchema(BaseModel):
    id: str
    name: str
    location: str
    description: Optional[str] = None
    has_ac: bool
    image_url: Optional[str] = None
    halls: List[HallSchema] = []
    resources: List[ResourceSchema] = []

    class Config:
        from_attributes = True

class VenueCreateSchema(BaseModel):
    name: str
    location: str
    description: Optional[str] = None
    has_ac: bool = True
    image_url: Optional[str] = None
    halls: List[Dict[str, Any]] = []  # [{name, capacity, hall_type}]
    resources: Dict[str, int] = {}    # {projector: 2, audio_system: 2, staff: 5}

class MergeVenuesSchema(BaseModel):
    primary_venue_id: str
    secondary_venue_id: str
    merged_name: Optional[str] = None

class BookingCreateRequest(BaseModel):
    client_id: Optional[str] = None
    client_email: Optional[str] = "client1@enterprise.io"
    preferred_venue_id: str
    title: str
    attendees: int = Field(gt=0)
    event_date: str  # YYYY-MM-DD
    start_time: str  # HH:MM (24h)
    end_time: str    # HH:MM (24h)
    projectors_requested: int = Field(default=0, ge=0)
    audio_requested: int = Field(default=0, ge=0)
    staff_requested: int = Field(default=0, ge=0)
    special_notes: Optional[str] = None
    allow_cross_venue_fallback: bool = False

class PreValidationRequest(BaseModel):
    preferred_venue_id: str
    attendees: int
    event_date: str
    start_time: str
    end_time: str
    projectors_requested: int = 0
    audio_requested: int = 0
    staff_requested: int = 0
    allow_cross_venue_fallback: bool = False


class PaymentRequest(BaseModel):
    booking_id: str
    amount: float
    payment_type: str = "ADVANCE_DEPOSIT"  # 'ADVANCE_DEPOSIT', 'FINAL_SETTLEMENT'


# -----------------------------------------------------------------------------
# CORE ALLOCATION ENGINE & CONFLICT RESOLUTION
# -----------------------------------------------------------------------------

SETUP_BUFFER_MINUTES = 30
OPERATING_HOUR_START = time(8, 0)   # 08:00 AM
OPERATING_HOUR_END = time(22, 0)    # 10:00 PM

def parse_datetimes(date_str: str, start_time_str: str, end_time_str: str):
    """Parses date and time strings into start, end, reserved_start, reserved_end."""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        t_start = datetime.strptime(start_time_str, "%H:%M").time()
        t_end = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time format: {str(e)}")

    if t_start >= t_end:
        raise HTTPException(status_code=400, detail="Event start time must precede end time.")

    event_start = datetime.combine(d, t_start)
    event_end = datetime.combine(d, t_end)

    # 30-minute buffer logic
    reserved_start = event_start - timedelta(minutes=SETUP_BUFFER_MINUTES)
    reserved_end = event_end + timedelta(minutes=SETUP_BUFFER_MINUTES)

    return event_start, event_end, reserved_start, reserved_end


def check_operating_window(reserved_start: datetime, reserved_end: datetime) -> Optional[str]:
    """
    Enforces Operating Window:
    The entire reserved interval [R_start, R_end] MUST lie strictly within 08:00–22:00.
    """
    r_start_time = reserved_start.time()
    r_end_time = reserved_end.time()

    # Must be on same calendar day
    if reserved_start.date() != reserved_end.date():
        return "Operating Window Violation: Event reservation spans across multiple calendar days."

    if r_start_time < OPERATING_HOUR_START:
        return (
            f"Operating Window Violation: Reserved setup begins at {r_start_time.strftime('%H:%M')}, "
            f"which is before platform opening hours ({OPERATING_HOUR_START.strftime('%H:%M')}). "
            f"Earliest event start permitted is 08:30."
        )

    if r_end_time > OPERATING_HOUR_END:
        return (
            f"Operating Window Violation: Reserved cleanup finishes at {r_end_time.strftime('%H:%M')}, "
            f"which exceeds platform closing hours ({OPERATING_HOUR_END.strftime('%H:%M')}). "
            f"Latest event end permitted is 21:30."
        )

    return None


def calculate_booking_costs(attendees: int, duration_hours: float, projectors: int, audio: int, staff: int) -> Dict[str, float]:
    """Calculates itemized cost and advance payment."""
    base_rate = 350.0 + (attendees * 2.5)
    equipment_rate = (projectors * 75.0) + (audio * 85.0)
    staff_rate = staff * 45.0 * duration_hours
    total_cost = round(base_rate + equipment_rate + staff_rate, 2)
    advance_deposit = round(total_cost * 0.35, 2)  # 35% advance
    remaining_balance = round(total_cost - advance_deposit, 2)

    return {
        "base_rate": base_rate,
        "equipment_rate": equipment_rate,
        "staff_rate": staff_rate,
        "total_cost": total_cost,
        "advance_deposit": advance_deposit,
        "remaining_balance": remaining_balance,
    }


def intervals_overlap(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> bool:
    """Standard interval overlap check: start1 < end2 and end1 > start2."""
    return start1 < end2 and end1 > start2


def get_venue_active_bookings(db: Session, venue_id: str, reserved_start: datetime, reserved_end: datetime, exclude_booking_id: Optional[str] = None) -> List[Booking]:
    """Finds all confirmed or waitlist-offered bookings overlapping with [reserved_start, reserved_end]."""
    q = db.query(Booking).filter(
        Booking.venue_id == venue_id,
        Booking.status.in_(["CONFIRMED", "WAITLIST_OFFERED"]),
        Booking.reserved_start < reserved_end,
        Booking.reserved_end > reserved_start,
    )
    if exclude_booking_id:
        q = q.filter(Booking.id != exclude_booking_id)
    return q.all()


def check_resource_collision(
    db: Session,
    venue: Venue,
    reserved_start: datetime,
    reserved_end: datetime,
    req_proj: int,
    req_audio: int,
    req_staff: int,
    exclude_booking_id: Optional[str] = None
) -> Optional[str]:
    """
    Checks if shared equipment/staff pool at venue will exceed maximum capacity
    at ANY discrete point in [reserved_start, reserved_end].
    Returns detailed mathematical conflict log if exceeded, else None.
    """
    # Map venue resources
    res_map = {r.resource_type: r.total_quantity for r in venue.resources}
    max_proj = res_map.get("projector", 0)
    max_audio = res_map.get("audio_system", 0)
    max_staff = res_map.get("staff", 0)

    # First check if standalone request exceeds venue ceiling
    if req_proj > max_proj:
        return f"Resource ceiling exceeded at {venue.name}: Requested {req_proj} projectors, but venue total inventory is {max_proj}."
    if req_audio > max_audio:
        return f"Resource ceiling exceeded at {venue.name}: Requested {req_audio} audio systems, but venue total inventory is {max_audio}."
    if req_staff > max_staff:
        return f"Resource ceiling exceeded at {venue.name}: Requested {req_staff} staff, but venue total inventory is {max_staff}."

    # Fetch all overlapping active bookings
    active_bookings = get_venue_active_bookings(db, venue.id, reserved_start, reserved_end, exclude_booking_id)
    if not active_bookings:
        return None

    # Discrete critical timeline checkpoints
    checkpoints = {reserved_start, reserved_end}
    for b in active_bookings:
        checkpoints.add(max(reserved_start, b.reserved_start))
        checkpoints.add(min(reserved_end, b.reserved_end))

    sorted_points = sorted(list(checkpoints))

    for i in range(len(sorted_points) - 1):
        midpoint = sorted_points[i] + (sorted_points[i + 1] - sorted_points[i]) / 2

        # Sum active resources at this instant
        concurrent_proj = 0
        concurrent_audio = 0
        concurrent_staff = 0
        conflicting_booking_refs = []

        for b in active_bookings:
            if b.reserved_start <= midpoint <= b.reserved_end:
                concurrent_proj += b.projectors_requested
                concurrent_audio += b.audio_requested
                concurrent_staff += b.staff_requested
                conflicting_booking_refs.append(f"#{b.id[:8]} ('{b.title}')")

        total_proj = concurrent_proj + req_proj
        total_audio = concurrent_audio + req_audio
        total_staff = concurrent_staff + req_staff

        window_str = f"{sorted_points[i].strftime('%H:%M')}-{sorted_points[i+1].strftime('%H:%M')}"
        conflict_refs_str = " and ".join(conflicting_booking_refs) if conflicting_booking_refs else "active reservations"

        if total_staff > max_staff:
            return (
                f"Conflict at {venue.name}: Requested {req_staff} staff during {window_str}, "
                f"but {concurrent_staff}/{max_staff} staff were already allocated to Booking {conflict_refs_str}. "
                f"Total required: {total_staff} > {max_staff} available."
            )

        if total_proj > max_proj:
            return (
                f"Conflict at {venue.name}: Requested {req_proj} projectors during {window_str}, "
                f"but {concurrent_proj}/{max_proj} projectors were already allocated to Booking {conflict_refs_str}. "
                f"Total required: {total_proj} > {max_proj} available."
            )

        if total_audio > max_audio:
            return (
                f"Conflict at {venue.name}: Requested {req_audio} audio systems during {window_str}, "
                f"but {concurrent_audio}/{max_audio} audio systems were already allocated to Booking {conflict_refs_str}. "
                f"Total required: {total_audio} > {max_audio} available."
            )

    return None


def match_hall_and_resources(
    db: Session,
    preferred_venue_id: str,
    attendees: int,
    reserved_start: datetime,
    reserved_end: datetime,
    req_proj: int,
    req_audio: int,
    req_staff: int,
    exclude_booking_id: Optional[str] = None,
    allow_fallback: bool = False
) -> Dict[str, Any]:
    """
    Core Match Engine applying:
    1. Operating window checks
    2. Preferred venue first (smallest fitting hall)
    3. Fallback to other venues alphabetically if allow_fallback=True
    4. Hall collision checks
    5. Shared resource pool sufficiency checks
    Returns {success: bool, hall: Hall, venue: Venue, trace: str, reason: str}
    """
    # 1. Operating Window Check
    window_violation = check_operating_window(reserved_start, reserved_end)
    if window_violation:
        return {
            "success": False,
            "hall": None,
            "venue": None,
            "trace": window_violation,
            "reason": window_violation,
            "can_waitlist": False
        }

    # 2. Minimum staff constraint for headcount > 200
    if attendees > 200 and req_staff < 2:
        req_staff = 2

    # Query preferred venue
    preferred_venue = db.query(Venue).filter(Venue.id == preferred_venue_id).first()
    if not preferred_venue:
        return {
            "success": False,
            "hall": None,
            "venue": None,
            "trace": "Preferred venue ID not found in system.",
            "reason": "Preferred venue ID not found.",
            "can_waitlist": False
        }

    ordered_venues = [preferred_venue]
    if allow_fallback:
        other_venues = (
            db.query(Venue)
            .filter(Venue.id != preferred_venue_id)
            .order_by(Venue.name.asc())
            .all()
        )
        ordered_venues.extend(other_venues)

    detailed_traces = []


    for venue in ordered_venues:
        # Check matching halls: capacity >= attendees, sorted by capacity ASC, name ASC
        eligible_halls = (
            db.query(Hall)
            .filter(Hall.venue_id == venue.id, Hall.capacity >= attendees)
            .order_by(Hall.capacity.asc(), Hall.name.asc())
            .all()
        )

        if not eligible_halls:
            # Check maximum capacity at this venue
            max_hall = (
                db.query(Hall)
                .filter(Hall.venue_id == venue.id)
                .order_by(Hall.capacity.desc())
                .first()
            )
            max_cap = max_hall.capacity if max_hall else 0
            detailed_traces.append(
                f"{venue.name}: No hall meets attendee count ({attendees}). Max hall capacity is {max_cap}."
            )
            continue

        for hall in eligible_halls:
            # 1. Check Hall collision
            hall_collision = (
                db.query(Booking)
                .filter(
                    Booking.hall_id == hall.id,
                    Booking.status.in_(["CONFIRMED", "WAITLIST_OFFERED"]),
                    Booking.reserved_start < reserved_end,
                    Booking.reserved_end > reserved_start,
                )
            )
            if exclude_booking_id:
                hall_collision = hall_collision.filter(Booking.id != exclude_booking_id)
            existing_hall_booking = hall_collision.first()

            if existing_hall_booking:
                detailed_traces.append(
                    f"Hall collision at {venue.name} ({hall.name}): Occupied by Booking #{existing_hall_booking.id[:8]} "
                    f"('{existing_hall_booking.title}') from {existing_hall_booking.reserved_start.strftime('%H:%M')} "
                    f"to {existing_hall_booking.reserved_end.strftime('%H:%M')} (including 30m buffers)."
                )
                continue

            # 2. Check Resource Sufficiency at this venue
            resource_conflict = check_resource_collision(
                db=db,
                venue=venue,
                reserved_start=reserved_start,
                reserved_end=reserved_end,
                req_proj=req_proj,
                req_audio=req_audio,
                req_staff=req_staff,
                exclude_booking_id=exclude_booking_id
            )

            if resource_conflict:
                detailed_traces.append(resource_conflict)
                continue

            # Found a valid hall and resource allocation!
            is_fallback = venue.id != preferred_venue_id
            match_msg = (
                f"Successfully matched to {hall.name} at {venue.name} (Capacity: {hall.capacity} >= {attendees})"
                + (" via alphabetical fallback routing." if is_fallback else ".")
            )
            return {
                "success": True,
                "hall": hall,
                "venue": venue,
                "trace": match_msg,
                "reason": None,
                "can_waitlist": True
            }

    combined_reason = " | ".join(detailed_traces) if detailed_traces else "No available venue/hall or resources could accommodate request."
    return {
        "success": False,
        "hall": None,
        "venue": preferred_venue,
        "trace": combined_reason,
        "reason": combined_reason,
        "can_waitlist": True
    }


def process_waitlist_queue(db: Session, venue_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Triggered when a booking is cancelled.
    Searches waitlisted events (created_at ASC) that can now legally fit into the freed gap.
    Sets status = WAITLIST_OFFERED and offer_expires_at = now + 15 min.
    """
    now = datetime.utcnow()

    # First clean up expired offers: if offer_expires_at < now and status == WAITLIST_OFFERED, revert to WAITLISTED
    expired_offers = (
        db.query(Booking)
        .filter(Booking.status == "WAITLIST_OFFERED", Booking.offer_expires_at < now)
        .all()
    )
    for exp in expired_offers:
        exp.status = "WAITLISTED"
        exp.offer_expires_at = None
        exp.rejection_reason = "Previous waitlist offer expired after 15-minute window without confirmation."
    db.commit()

    # Query waitlisted bookings sorted by created_at ASC
    q = db.query(Booking).filter(Booking.status == "WAITLISTED")
    if venue_id:
        q = q.filter(Booking.venue_id == venue_id)
    waitlisted_candidates = q.order_by(Booking.created_at.asc()).all()

    promoted = []

    for candidate in waitlisted_candidates:
        match_res = match_hall_and_resources(
            db=db,
            preferred_venue_id=candidate.venue_id,
            attendees=candidate.attendees,
            reserved_start=candidate.reserved_start,
            reserved_end=candidate.reserved_end,
            req_proj=candidate.projectors_requested,
            req_audio=candidate.audio_requested,
            req_staff=candidate.staff_requested,
            exclude_booking_id=candidate.id
        )

        if match_res["success"]:
            # Legally fits! Promote to WAITLIST_OFFERED
            candidate.status = "WAITLIST_OFFERED"
            candidate.hall_id = match_res["hall"].id
            candidate.offer_expires_at = now + timedelta(minutes=15)
            candidate.rejection_reason = (
                f"Waitlist offer extended for {match_res['hall'].name} at {match_res['venue'].name}. "
                f"Valid for 15 minutes until {candidate.offer_expires_at.strftime('%H:%M:%S UTC')}."
            )

            # Create notification
            notif = Notification(
                user_id=candidate.client_id,
                booking_id=candidate.id,
                title="Priority Waitlist Offer Extended!",
                message=(
                    f"A scheduling slot has opened for '{candidate.title}'! You have been allocated "
                    f"{match_res['hall'].name} at {match_res['venue'].name}. Please confirm and pay "
                    f"the advance deposit within 15 minutes before this slot is released."
                ),
            )
            db.add(notif)
            promoted.append({
                "booking_id": candidate.id,
                "title": candidate.title,
                "hall_name": match_res["hall"].name,
                "venue_name": match_res["venue"].name,
                "offer_expires_at": candidate.offer_expires_at.isoformat()
            })

    db.commit()
    return promoted


# -----------------------------------------------------------------------------
# API ROUTES
# -----------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {
        "status": "operational",
        "service": "EventSync Enterprise Allocation Engine",
        "timestamp": datetime.utcnow().isoformat(),
        "operating_hours": "08:00 - 22:00",
        "setup_buffer_minutes": SETUP_BUFFER_MINUTES
    }


@app.get("/api/venues", response_model=List[VenueSchema])
def list_venues(db: Session = Depends(get_db)):
    venues = db.query(Venue).all()
    return venues


@app.post("/api/venues")
def create_venue(payload: VenueCreateSchema, db: Session = Depends(get_db)):
    new_venue = Venue(
        name=payload.name,
        location=payload.location,
        description=payload.description,
        has_ac=payload.has_ac,
        image_url=payload.image_url or "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80"
    )
    db.add(new_venue)
    db.flush()

    for h in payload.halls:
        hall = Hall(
            venue_id=new_venue.id,
            name=h.get("name", "Main Hall"),
            capacity=int(h.get("capacity", 100)),
            hall_type=h.get("hall_type", "Hall")
        )
        db.add(hall)

    for r_type, qty in payload.resources.items():
        res = VenueResource(
            venue_id=new_venue.id,
            resource_type=r_type,
            total_quantity=qty
        )
        db.add(res)

    db.commit()
    return {"message": "Venue created successfully", "venue_id": new_venue.id}


@app.post("/api/venues/merge")
def merge_venues(payload: MergeVenuesSchema, db: Session = Depends(get_db)):
    """Groups/links resources and halls across dual venues."""
    v1 = db.query(Venue).filter(Venue.id == payload.primary_venue_id).first()
    v2 = db.query(Venue).filter(Venue.id == payload.secondary_venue_id).first()

    if not v1 or not v2:
        raise HTTPException(status_code=404, detail="One or both venues not found")

    if payload.merged_name:
        v1.name = payload.merged_name
    else:
        v1.name = f"{v1.name} & {v2.name} (Combined Campus)"

    # Move halls from v2 to v1
    for h in v2.halls:
        h.venue_id = v1.id
        h.name = f"{v2.name} - {h.name}"

    # Pool resources from v2 into v1
    v1_res_map = {r.resource_type: r for r in v1.resources}
    for r2 in v2.resources:
        if r2.resource_type in v1_res_map:
            v1_res_map[r2.resource_type].total_quantity += r2.total_quantity
        else:
            new_r = VenueResource(
                venue_id=v1.id,
                resource_type=r2.resource_type,
                total_quantity=r2.total_quantity
            )
            db.add(new_r)

    # Delete v2
    db.delete(v2)
    db.commit()

    return {"message": f"Successfully merged venues into {v1.name}", "primary_venue_id": v1.id}


@app.post("/api/bookings/prevalidate")
def prevalidate_booking(payload: PreValidationRequest, db: Session = Depends(get_db)):
    """Runs a dry-run check of the booking rules and returns instant feasibility feedback."""
    event_start, event_end, reserved_start, reserved_end = parse_datetimes(
        payload.event_date, payload.start_time, payload.end_time
    )

    staff_req = payload.staff_requested
    auto_staff_note = None
    if payload.attendees > 200 and staff_req < 2:
        staff_req = 2
        auto_staff_note = "Enforced: Minimum 2 staff required for events exceeding 200 attendees."

    match_res = match_hall_and_resources(
        db=db,
        preferred_venue_id=payload.preferred_venue_id,
        attendees=payload.attendees,
        reserved_start=reserved_start,
        reserved_end=reserved_end,
        req_proj=payload.projectors_requested,
        req_audio=payload.audio_requested,
        req_staff=staff_req,
        allow_fallback=payload.allow_cross_venue_fallback
    )

    duration_hours = (event_end - event_start).total_seconds() / 3600.0
    costs = calculate_booking_costs(
        attendees=payload.attendees,
        duration_hours=duration_hours,
        projectors=payload.projectors_requested,
        audio=payload.audio_requested,
        staff=staff_req
    )

    return {
        "is_feasible": match_res["success"],
        "assigned_hall": match_res["hall"].name if match_res["hall"] else None,
        "assigned_venue": match_res["venue"].name if match_res["venue"] else None,
        "decision_trace": match_res["trace"],
        "auto_staff_note": auto_staff_note,
        "reserved_start": reserved_start.strftime("%H:%M"),
        "reserved_end": reserved_end.strftime("%H:%M"),
        "costs": costs
    }


@app.post("/api/bookings")
def create_booking(payload: BookingCreateRequest, db: Session = Depends(get_db)):
    """Creates a booking and routes it through the allocation and waitlist engines."""
    event_start, event_end, reserved_start, reserved_end = parse_datetimes(
        payload.event_date, payload.start_time, payload.end_time
    )

    # Resolve or create client
    client = None
    if payload.client_id:
        client = db.query(User).filter(User.id == payload.client_id).first()
    if not client:
        client = db.query(User).filter(User.email == payload.client_email).first()
    if not client:
        client = User(
            email=payload.client_email,
            password_hash="auto_gen",
            full_name=payload.client_email.split("@")[0].capitalize(),
            role="CLIENT"
        )
        db.add(client)
        db.flush()

    staff_req = payload.staff_requested
    if payload.attendees > 200 and staff_req < 2:
        staff_req = 2

    # Run allocation engine
    match_res = match_hall_and_resources(
        db=db,
        preferred_venue_id=payload.preferred_venue_id,
        attendees=payload.attendees,
        reserved_start=reserved_start,
        reserved_end=reserved_end,
        req_proj=payload.projectors_requested,
        req_audio=payload.audio_requested,
        req_staff=staff_req,
        allow_fallback=payload.allow_cross_venue_fallback
    )


    duration_hours = (event_end - event_start).total_seconds() / 3600.0
    costs = calculate_booking_costs(
        attendees=payload.attendees,
        duration_hours=duration_hours,
        projectors=payload.projectors_requested,
        audio=payload.audio_requested,
        staff=staff_req
    )

    booking_id = str(uuid.uuid4())

    if match_res["success"]:
        # CONFIRMED
        status_val = "CONFIRMED"
        hall_id_val = match_res["hall"].id
        venue_id_val = match_res["venue"].id
        rejection_val = None
    else:
        # If can_waitlist, enter WAITLISTED, otherwise REJECTED
        if match_res.get("can_waitlist", True):
            status_val = "WAITLISTED"
            hall_id_val = None
            venue_id_val = payload.preferred_venue_id
            rejection_val = match_res["reason"]
        else:
            status_val = "REJECTED"
            hall_id_val = None
            venue_id_val = payload.preferred_venue_id
            rejection_val = match_res["reason"]

    booking = Booking(
        id=booking_id,
        client_id=client.id,
        hall_id=hall_id_val,
        venue_id=venue_id_val,
        title=payload.title,
        attendees=payload.attendees,
        event_start=event_start,
        event_end=event_end,
        reserved_start=reserved_start,
        reserved_end=reserved_end,
        projectors_requested=payload.projectors_requested,
        audio_requested=payload.audio_requested,
        staff_requested=staff_req,
        special_notes=payload.special_notes,
        status=status_val,
        rejection_reason=rejection_val,
        created_at=datetime.utcnow()
    )
    db.add(booking)
    db.flush()

    # If confirmed, automatically record initial advance deposit
    if status_val == "CONFIRMED":
        advance_payment = Payment(
            booking_id=booking.id,
            amount_paid=Decimal(str(costs["advance_deposit"])),
            payment_type="ADVANCE_DEPOSIT",
            status="SUCCESS"
        )
        db.add(advance_payment)

    db.commit()

    return {
        "booking_id": booking.id,
        "status": status_val,
        "assigned_hall": match_res["hall"].name if match_res["hall"] else None,
        "assigned_venue": match_res["venue"].name if match_res["venue"] else None,
        "decision_trace": match_res["trace"],
        "costs": costs
    }


@app.get("/api/bookings")
def list_bookings(
    client_id: Optional[str] = None,
    venue_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Process any expired waitlist offers before returning list
    process_waitlist_queue(db)

    q = db.query(Booking)
    if client_id:
        q = q.filter(Booking.client_id == client_id)
    if venue_id:
        q = q.filter(Booking.venue_id == venue_id)
    if status_filter:
        q = q.filter(Booking.status == status_filter)

    bookings = q.order_by(Booking.event_start.asc(), Booking.created_at.desc()).all()

    results = []
    for b in bookings:
        venue_obj = b.venue
        hall_obj = b.hall
        client_obj = b.client

        # Remaining seconds on active offer
        seconds_left = None
        if b.status == "WAITLIST_OFFERED" and b.offer_expires_at:
            delta = (b.offer_expires_at - datetime.utcnow()).total_seconds()
            seconds_left = max(0, int(delta))

        # Total payments made
        total_paid = sum([float(p.amount_paid) for p in b.payments if p.status == "SUCCESS"])

        duration_hours = max(1.0, (b.event_end - b.event_start).total_seconds() / 3600.0)
        costs = calculate_booking_costs(
            attendees=b.attendees,
            duration_hours=duration_hours,
            projectors=b.projectors_requested,
            audio=b.audio_requested,
            staff=b.staff_requested
        )

        results.append({
            "id": b.id,
            "title": b.title,
            "client_name": client_obj.full_name if client_obj else "Unknown",
            "client_email": client_obj.email if client_obj else "",
            "venue_name": venue_obj.name if venue_obj else "Unknown",
            "venue_id": b.venue_id,
            "hall_name": hall_obj.name if hall_obj else None,
            "hall_id": b.hall_id,
            "attendees": b.attendees,
            "event_start": b.event_start.isoformat(),
            "event_end": b.event_end.isoformat(),
            "reserved_start": b.reserved_start.isoformat(),
            "reserved_end": b.reserved_end.isoformat(),
            "start_time_str": b.event_start.strftime("%H:%M"),
            "end_time_str": b.event_end.strftime("%H:%M"),
            "reserved_start_str": b.reserved_start.strftime("%H:%M"),
            "reserved_end_str": b.reserved_end.strftime("%H:%M"),
            "date_str": b.event_start.strftime("%Y-%m-%d"),
            "projectors_requested": b.projectors_requested,
            "audio_requested": b.audio_requested,
            "staff_requested": b.staff_requested,
            "status": b.status,
            "rejection_reason": b.rejection_reason,
            "offer_expires_at": b.offer_expires_at.isoformat() if b.offer_expires_at else None,
            "offer_seconds_left": seconds_left,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "total_cost": costs["total_cost"],
            "advance_deposit": costs["advance_deposit"],
            "total_paid": round(total_paid, 2),
            "balance_due": round(max(0.0, costs["total_cost"] - total_paid), 2)
        })

    return results


@app.post("/api/bookings/{booking_id}/cancel")
@app.put("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, db: Session = Depends(get_db)):

    """
    Cancels an active booking and immediately invokes process_waitlist_queue(venue_id)
    to fill the gap with the highest-priority waitlisted candidate.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    venue_id = booking.venue_id
    booking.status = "CANCELLED"
    booking.rejection_reason = "Cancelled by client/organizer."
    db.commit()

    # Re-allocation engine trigger
    promoted_candidates = process_waitlist_queue(db, venue_id=venue_id)

    return {
        "message": f"Booking '{booking.title}' cancelled successfully.",
        "venue_id": venue_id,
        "promoted_waitlist_count": len(promoted_candidates),
        "promoted_candidates": promoted_candidates
    }


@app.post("/api/bookings/{booking_id}/confirm-offer")
def confirm_waitlist_offer(booking_id: str, db: Session = Depends(get_db)):
    """
    When client clicks 'Pay Advance & Confirm' on a WAITLIST_OFFERED booking,
    this verifies the 15-minute window, transitions status to CONFIRMED, and records advance payment.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "WAITLIST_OFFERED":
        raise HTTPException(status_code=400, detail=f"Booking is in status '{booking.status}', not WAITLIST_OFFERED.")

    now = datetime.utcnow()
    if booking.offer_expires_at and booking.offer_expires_at < now:
        booking.status = "WAITLISTED"
        booking.offer_expires_at = None
        booking.rejection_reason = "Offer expired before payment confirmation."
        db.commit()
        raise HTTPException(status_code=400, detail="Offer window (15 minutes) has expired.")

    # Confirm booking
    booking.status = "CONFIRMED"
    booking.offer_expires_at = None

    duration_hours = max(1.0, (booking.event_end - booking.event_start).total_seconds() / 3600.0)
    costs = calculate_booking_costs(
        attendees=booking.attendees,
        duration_hours=duration_hours,
        projectors=booking.projectors_requested,
        audio=booking.audio_requested,
        staff=booking.staff_requested
    )

    payment = Payment(
        booking_id=booking.id,
        amount_paid=Decimal(str(costs["advance_deposit"])),
        payment_type="ADVANCE_DEPOSIT",
        status="SUCCESS"
    )
    db.add(payment)
    db.commit()

    return {
        "message": f"Offer confirmed! Booking '{booking.title}' is now officially CONFIRMED.",
        "booking_id": booking.id,
        "advance_paid": costs["advance_deposit"]
    }


@app.post("/api/payments")
def record_payment(payload: PaymentRequest, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    payment = Payment(
        booking_id=booking.id,
        amount_paid=Decimal(str(payload.amount)),
        payment_type=payload.payment_type,
        status="SUCCESS"
    )
    db.add(payment)
    db.commit()

    return {"message": "Payment recorded successfully", "payment_id": payment.id}


@app.get("/api/notifications/{user_id}")
def get_user_notifications(user_id: str, db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat()
        }
        for n in notifs
    ]


# -----------------------------------------------------------------------------
# DECISION VISIBILITY & AUDIT ENGINE (JUDGE / PROFESSOR VIEW)
# -----------------------------------------------------------------------------

@app.get("/api/analytics/timeline")
def get_timeline_data(venue_id: Optional[str] = None, event_date: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns timeline and Gantt visualization data:
    Active bookings, 30-min setup buffer block, 30-min cleanup buffer block, and capacity metrics.
    """
    q = db.query(Booking).filter(Booking.status.in_(["CONFIRMED", "WAITLIST_OFFERED"]))
    if venue_id:
        q = q.filter(Booking.venue_id == venue_id)

    bookings = q.all()

    timeline_items = []
    for b in bookings:
        venue_obj = b.venue
        hall_obj = b.hall

        # Main Event Block
        timeline_items.append({
            "id": f"{b.id}-event",
            "booking_id": b.id,
            "title": b.title,
            "type": "event",
            "venue_name": venue_obj.name if venue_obj else "",
            "hall_name": hall_obj.name if hall_obj else "Unassigned",
            "start": b.event_start.isoformat(),
            "end": b.event_end.isoformat(),
            "start_str": b.event_start.strftime("%H:%M"),
            "end_str": b.event_end.strftime("%H:%M"),
            "attendees": b.attendees,
            "status": b.status,
            "resources": {
                "projectors": b.projectors_requested,
                "audio": b.audio_requested,
                "staff": b.staff_requested
            }
        })

        # Setup Buffer Block
        timeline_items.append({
            "id": f"{b.id}-setup",
            "booking_id": b.id,
            "title": f"Setup ({b.title[:15]}...)",
            "type": "buffer_setup",
            "venue_name": venue_obj.name if venue_obj else "",
            "hall_name": hall_obj.name if hall_obj else "Unassigned",
            "start": b.reserved_start.isoformat(),
            "end": b.event_start.isoformat(),
            "start_str": b.reserved_start.strftime("%H:%M"),
            "end_str": b.event_start.strftime("%H:%M"),
            "status": b.status
        })

        # Cleanup Buffer Block
        timeline_items.append({
            "id": f"{b.id}-cleanup",
            "booking_id": b.id,
            "title": f"Cleanup ({b.title[:15]}...)",
            "type": "buffer_cleanup",
            "venue_name": venue_obj.name if venue_obj else "",
            "hall_name": hall_obj.name if hall_obj else "Unassigned",
            "start": b.event_end.isoformat(),
            "end": b.reserved_end.isoformat(),
            "start_str": b.event_end.strftime("%H:%M"),
            "end_str": b.reserved_end.strftime("%H:%M"),
            "status": b.status
        })

    return timeline_items


@app.get("/api/analytics/decision-traces")
def get_decision_traces(db: Session = Depends(get_db)):
    """Returns detailed decision trace logs for waitlisted or rejected bookings."""
    traces = (
        db.query(Booking)
        .filter(Booking.status.in_(["WAITLISTED", "REJECTED", "CANCELLED", "WAITLIST_OFFERED"]))
        .order_by(Booking.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": b.id,
            "title": b.title,
            "client_name": b.client.full_name if b.client else "Client",
            "venue_name": b.venue.name if b.venue else "N/A",
            "attendees": b.attendees,
            "requested_window": f"{b.event_start.strftime('%H:%M')} - {b.event_end.strftime('%H:%M')} (Reserved: {b.reserved_start.strftime('%H:%M')} - {b.reserved_end.strftime('%H:%M')})",
            "status": b.status,
            "trace_log": b.rejection_reason or "No specific conflict logged.",
            "projectors": b.projectors_requested,
            "audio": b.audio_requested,
            "staff": b.staff_requested,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in traces
    ]


@app.get("/api/waitlist/queue")
@app.get("/api/waitlist")
def get_waitlist_queue(db: Session = Depends(get_db)):

    """Returns real-time waitlist queue state with offer countdowns."""
    process_waitlist_queue(db)

    entries = (
        db.query(Booking)
        .filter(Booking.status.in_(["WAITLISTED", "WAITLIST_OFFERED"]))
        .order_by(Booking.created_at.asc())
        .all()
    )

    results = []
    now = datetime.utcnow()
    for idx, e in enumerate(entries):
        seconds_left = None
        if e.status == "WAITLIST_OFFERED" and e.offer_expires_at:
            seconds_left = max(0, int((e.offer_expires_at - now).total_seconds()))

        results.append({
            "queue_position": idx + 1,
            "id": e.id,
            "title": e.title,
            "client_name": e.client.full_name if e.client else "Client",
            "venue_name": e.venue.name if e.venue else "N/A",
            "attendees": e.attendees,
            "time_window": f"{e.event_start.strftime('%H:%M')} - {e.event_end.strftime('%H:%M')}",
            "status": e.status,
            "rejection_reason": e.rejection_reason,
            "offer_seconds_left": seconds_left,
            "created_at": e.created_at.isoformat() if e.created_at else None
        })

    return results


# -----------------------------------------------------------------------------
# QUICK-ACTION PRESET SCENARIO ENGINE FOR LIVE DEMONSTRATION
# -----------------------------------------------------------------------------

@app.post("/api/presets/reset")
def preset_reset(db: Session = Depends(get_db)):
    """Resets the database and seeds fresh default data."""
    reset_and_reseed()
    return {"message": "Database reset and re-seeded successfully."}


@app.post("/api/presets/step-1")
def preset_step_1(db: Session = Depends(get_db)):
    """
    Scenario Step 1:
    Client 1 requests Conference (120 guests, 10:00–13:00, 1 proj, 3 staff at Venue A).
    Expectation: Assigned Hall A2 (Capacity: 150). CONFIRMED.
    """
    venue_a = db.query(Venue).filter(Venue.name.like("%Venue A%")).first()
    client_1 = db.query(User).filter(User.email == "client1@enterprise.io").first()

    today_str = date.today().isoformat()
    req = BookingCreateRequest(
        client_id=client_1.id,
        preferred_venue_id=venue_a.id,
        title="Global Tech Leaders Conference",
        attendees=120,
        event_date=today_str,
        start_time="10:00",
        end_time="13:00",
        projectors_requested=1,
        audio_requested=1,
        staff_requested=3,
        special_notes="Keynote conference with executive presentations."
    )
    return create_booking(req, db)


@app.post("/api/presets/step-2")
def preset_step_2(db: Session = Depends(get_db)):
    """
    Scenario Step 2:
    Client 2 requests Workshop (50 guests, 11:00–14:00, 1 proj, 2 staff at Venue A).
    Expectation: Assigned Hall A1 (Capacity: 60).
    Resources check:
    At 11:00-13:30 (overlap with Step 1):
    Projectors: 1 + 1 = 2 <= 2 available.
    Staff: 3 + 2 = 5 <= 5 available.
    Expectation: CONFIRMED.
    """
    venue_a = db.query(Venue).filter(Venue.name.like("%Venue A%")).first()
    client_2 = db.query(User).filter(User.email == "client2@enterprise.io").first()

    today_str = date.today().isoformat()
    req = BookingCreateRequest(
        client_id=client_2.id,
        preferred_venue_id=venue_a.id,
        title="AI Engineering Deep Dive Workshop",
        attendees=50,
        event_date=today_str,
        start_time="11:00",
        end_time="14:00",
        projectors_requested=1,
        audio_requested=1,
        staff_requested=2,
        special_notes="Hands-on breakout lab session."
    )
    return create_booking(req, db)


@app.post("/api/presets/step-3")
def preset_step_3(db: Session = Depends(get_db)):
    """
    Scenario Step 3:
    Client 3 requests Product Launch (100 guests, 13:15–15:15, 1 proj, 3 staff at Venue A).
    Constraint verification:
    Needs Hall A2 (capacity 150 >= 100).
    Event 13:15–15:15 -> Reserved: 12:45–15:45.
    Hall A2 is occupied by Step 1 until 13:30 (10:00-13:00 event + 30m buffer)!
    Overlap between 12:45 and 13:30 causes Hall Collision + Staff Resource Collision (3+2+3 = 8 > 5)!
    Expectation: WAITLISTED with explicit conflict log!
    """
    venue_a = db.query(Venue).filter(Venue.name.like("%Venue A%")).first()
    client_3 = db.query(User).filter(User.email == "client3@enterprise.io").first()

    today_str = date.today().isoformat()
    req = BookingCreateRequest(
        client_id=client_3.id,
        preferred_venue_id=venue_a.id,
        title="Next-Gen Enterprise Cloud Launch",
        attendees=100,
        event_date=today_str,
        start_time="13:15",
        end_time="15:15",
        projectors_requested=1,
        audio_requested=1,
        staff_requested=3,
        special_notes="Product announcement keynote."
    )
    return create_booking(req, db)


@app.post("/api/presets/step-4")
def preset_step_4_cancel_step_1(db: Session = Depends(get_db)):
    """
    Scenario Step 4:
    Cancels Client 1's Conference!
    Trigger: Automatically processes waitlist queue.
    Expectation: Client 3's Product Launch is immediately offered the freed slot (WAITLIST_OFFERED)
    with a 15-minute countdown timer!
    """
    step1_booking = (
        db.query(Booking)
        .filter(Booking.title.like("%Global Tech Leaders%"), Booking.status == "CONFIRMED")
        .first()
    )
    if not step1_booking:
        raise HTTPException(status_code=400, detail="Step 1 booking not found or already cancelled.")

    return cancel_booking(step1_booking.id, db)
