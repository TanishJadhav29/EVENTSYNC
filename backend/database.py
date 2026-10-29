import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
    func
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./eventsync.db")

# For SQLite, enable check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Venue(Base):
    __tablename__ = "venues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    has_ac = Column(Boolean, default=True)
    image_url = Column(Text, nullable=True)

    halls = relationship("Hall", back_populates="venue", cascade="all, delete-orphan")
    resources = relationship("VenueResource", back_populates="venue", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="venue")

class Hall(Base):
    __tablename__ = "halls"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    venue_id = Column(String(36), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    hall_type = Column(String(50), default="Hall")  # 'Hall', 'Banquet', 'Auditorium'

    venue = relationship("Venue", back_populates="halls")
    bookings = relationship("Booking", back_populates="hall")

class VenueResource(Base):
    __tablename__ = "venue_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    venue_id = Column(String(36), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    resource_type = Column(String(50), nullable=False)  # 'projector', 'audio_system', 'staff'
    total_quantity = Column(Integer, nullable=False)

    venue = relationship("Venue", back_populates="resources")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # 'CLIENT' or 'EVENT_MANAGER'
    phone = Column(String(20), nullable=True)

    bookings = relationship("Booking", back_populates="client")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    client_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    hall_id = Column(String(36), ForeignKey("halls.id"), nullable=True)
    venue_id = Column(String(36), ForeignKey("venues.id"), nullable=False)
    title = Column(String(150), nullable=False)
    attendees = Column(Integer, nullable=False)
    event_start = Column(DateTime, nullable=False)
    event_end = Column(DateTime, nullable=False)
    reserved_start = Column(DateTime, nullable=False)
    reserved_end = Column(DateTime, nullable=False)
    projectors_requested = Column(Integer, default=0)
    audio_requested = Column(Integer, default=0)
    staff_requested = Column(Integer, default=0)
    special_notes = Column(Text, nullable=True)
    status = Column(String(30), nullable=False)  # 'CONFIRMED', 'WAITLISTED', 'WAITLIST_OFFERED', 'CANCELLED', 'REJECTED'
    rejection_reason = Column(Text, nullable=True)
    offer_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("User", back_populates="bookings")
    venue = relationship("Venue", back_populates="bookings")
    hall = relationship("Hall", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    booking_id = Column(String(36), ForeignKey("bookings.id"), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    payment_type = Column(String(30), nullable=False)  # 'ADVANCE_DEPOSIT', 'FINAL_SETTLEMENT'
    status = Column(String(20), nullable=False)  # 'SUCCESS', 'PENDING'
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="payments")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    booking_id = Column(String(36), ForeignKey("bookings.id"), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_database():
    """Initial seed data according to system specifications."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if venues already exist
    existing_venues = db.query(Venue).count()
    if existing_venues > 0:
        db.close()
        return

    # Seed Default Users
    clients = [
        User(
            id="c1111111-1111-1111-1111-111111111111",
            email="client1@enterprise.io",
            password_hash="mock_hash_1",
            full_name="Sarah Chen (TechCorp Global)",
            role="CLIENT",
            phone="+1 (555) 234-5678"
        ),
        User(
            id="c2222222-2222-2222-2222-222222222222",
            email="client2@enterprise.io",
            password_hash="mock_hash_2",
            full_name="David Miller (DevInnovate)",
            role="CLIENT",
            phone="+1 (555) 876-5432"
        ),
        User(
            id="c3333333-3333-3333-3333-333333333333",
            email="client3@enterprise.io",
            password_hash="mock_hash_3",
            full_name="Elena Rostova (Apex Ventures)",
            role="CLIENT",
            phone="+1 (555) 345-6789"
        ),
        User(
            id="a0000000-0000-0000-0000-000000000000",
            email="admin@eventsync.io",
            password_hash="admin_hash_0",
            full_name="Alexander Vance (VP Operations)",
            role="EVENT_MANAGER",
            phone="+1 (555) 000-1122"
        ),
    ]
    for u in clients:
        db.add(u)

    # 1. Venue A:
    # Hall A1 (Capacity: 60), Hall A2 (Capacity: 150)
    # Resources: 2 Projectors, 2 Audio Systems, 5 Staff
    venue_a = Venue(
        id="vaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        name="Venue A",
        location="One Financial Plaza, Downtown Tech Corridor",
        description="Flagship executive center featuring acoustic-treated auditoriums, premium ergonomic seating, and high-bandwidth fiber interconnect.",
        has_ac=True,
        image_url="https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80"
    )
    db.add(venue_a)
    db.flush()

    halls_a = [
        Hall(id="ha111111-1111-1111-1111-111111111111", venue_id=venue_a.id, name="Hall A1", capacity=60, hall_type="Hall"),
        Hall(id="ha222222-2222-2222-2222-222222222222", venue_id=venue_a.id, name="Hall A2", capacity=150, hall_type="Banquet"),
    ]
    for h in halls_a:
        db.add(h)

    res_a = [
        VenueResource(venue_id=venue_a.id, resource_type="projector", total_quantity=2),
        VenueResource(venue_id=venue_a.id, resource_type="audio_system", total_quantity=2),
        VenueResource(venue_id=venue_a.id, resource_type="staff", total_quantity=5),
    ]
    for r in res_a:
        db.add(r)

    # 2. Venue B:
    # Hall B1 (Capacity: 100), Hall B2 (Capacity: 200)
    # Resources: 2 Projectors, 1 Audio System, 4 Staff
    venue_b = Venue(
        id="vbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        name="Venue B",
        location="450 Innovation Parkway, Waterfront Science District",
        description="Modernist waterfront conference facility optimized for developer summits, symposiums, and keynote addresses.",
        has_ac=True,
        image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
    )
    db.add(venue_b)
    db.flush()

    halls_b = [
        Hall(id="hb111111-1111-1111-1111-111111111111", venue_id=venue_b.id, name="Hall B1", capacity=100, hall_type="Hall"),
        Hall(id="hb222222-2222-2222-2222-222222222222", venue_id=venue_b.id, name="Hall B2", capacity=200, hall_type="Auditorium"),
    ]
    for h in halls_b:
        db.add(h)

    res_b = [
        VenueResource(venue_id=venue_b.id, resource_type="projector", total_quantity=2),
        VenueResource(venue_id=venue_b.id, resource_type="audio_system", total_quantity=1),
        VenueResource(venue_id=venue_b.id, resource_type="staff", total_quantity=4),
    ]
    for r in res_b:
        db.add(r)

    # 3. Venue C:
    # Hall C1 (Capacity: 80), Hall C2 (Capacity: 250)
    # Resources: 3 Projectors, 2 Audio Systems, 6 Staff
    venue_c = Venue(
        id="vccccccc-cccc-cccc-cccc-cccccccccccc",
        name="Venue C",
        location="88 Metropolis Boulevard, Silicon Quarter",
        description="Large-capacity convention pavilion with modular stage configurations, automated ambient lighting, and dedicated AV technical staff.",
        has_ac=True,
        image_url="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80"
    )
    db.add(venue_c)
    db.flush()

    halls_c = [
        Hall(id="hc111111-1111-1111-1111-111111111111", venue_id=venue_c.id, name="Hall C1", capacity=80, hall_type="Hall"),
        Hall(id="hc222222-2222-2222-2222-222222222222", venue_id=venue_c.id, name="Hall C2", capacity=250, hall_type="Auditorium"),
    ]
    for h in halls_c:
        db.add(h)

    res_c = [
        VenueResource(venue_id=venue_c.id, resource_type="projector", total_quantity=3),
        VenueResource(venue_id=venue_c.id, resource_type="audio_system", total_quantity=2),
        VenueResource(venue_id=venue_c.id, resource_type="staff", total_quantity=6),
    ]
    for r in res_c:
        db.add(r)

    db.commit()
    db.close()


def reset_and_reseed():
    """Drops all tables and re-seeds cleanly."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database()
