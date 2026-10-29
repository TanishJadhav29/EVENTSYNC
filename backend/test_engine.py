import unittest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, Venue, Hall, VenueResource, User, Booking, Payment, reset_and_reseed, seed_database
from backend.main import (
    app,
    match_hall_and_resources,
    process_waitlist_queue,
    parse_datetimes,
    check_operating_window,
    BookingCreateRequest,
    create_booking,
    cancel_booking,
    confirm_waitlist_offer
)
from backend.database import SessionLocal

class TestEventSyncEngine(unittest.TestCase):
    def setUp(self):
        reset_and_reseed()
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_operating_window_buffer(self):
        """Buffer rule: 08:00-22:00. Event starting at 08:00 has buffer 07:30 -> Violation."""
        today = date.today().isoformat()
        _, _, r_start, r_end = parse_datetimes(today, "08:00", "11:00")
        violation = check_operating_window(r_start, r_end)
        self.assertIsNotNone(violation)
        self.assertIn("before platform opening hours", violation)

        # Event from 08:30 to 11:00 has buffer 08:00 to 11:30 -> Legal
        _, _, r_start2, r_end2 = parse_datetimes(today, "08:30", "11:00")
        violation2 = check_operating_window(r_start2, r_end2)
        self.assertIsNone(violation2)

    def test_three_scenario_steps_and_waitlist_lifecycle(self):
        """Tests the exact Hackathon multi-step workflow."""
        venue_a = self.db.query(Venue).filter(Venue.name.like("%Venue A%")).first()
        client_1 = self.db.query(User).filter(User.email == "client1@enterprise.io").first()
        client_2 = self.db.query(User).filter(User.email == "client2@enterprise.io").first()
        client_3 = self.db.query(User).filter(User.email == "client3@enterprise.io").first()
        today = date.today().isoformat()

        # Step 1: Client 1 Conference (120 guests, 10:00-13:00, 1 proj, 3 staff)
        req1 = BookingCreateRequest(
            client_id=client_1.id,
            preferred_venue_id=venue_a.id,
            title="Global Tech Leaders Conference",
            attendees=120,
            event_date=today,
            start_time="10:00",
            end_time="13:00",
            projectors_requested=1,
            audio_requested=1,
            staff_requested=3
        )
        res1 = create_booking(req1, self.db)
        self.assertEqual(res1["status"], "CONFIRMED")
        self.assertEqual(res1["assigned_hall"], "Hall A2")

        # Step 2: Client 2 Workshop (50 guests, 11:00-14:00, 1 proj, 2 staff)
        req2 = BookingCreateRequest(
            client_id=client_2.id,
            preferred_venue_id=venue_a.id,
            title="AI Engineering Deep Dive Workshop",
            attendees=50,
            event_date=today,
            start_time="11:00",
            end_time="14:00",
            projectors_requested=1,
            audio_requested=1,
            staff_requested=2
        )
        res2 = create_booking(req2, self.db)
        self.assertEqual(res2["status"], "CONFIRMED")
        self.assertEqual(res2["assigned_hall"], "Hall A1")

        # Step 3: Client 3 Product Launch (100 guests, 13:15-15:15, 1 proj, 3 staff)
        # Hall A2 is occupied until 13:30 (10:00-13:00 + 30m buffer)
        # Event reserved start is 12:45 -> overlaps with Hall A2!
        req3 = BookingCreateRequest(
            client_id=client_3.id,
            preferred_venue_id=venue_a.id,
            title="Next-Gen Enterprise Cloud Launch",
            attendees=100,
            event_date=today,
            start_time="13:15",
            end_time="15:15",
            projectors_requested=1,
            audio_requested=1,
            staff_requested=3
        )
        res3 = create_booking(req3, self.db)
        self.assertEqual(res3["status"], "WAITLISTED")
        self.assertIn("Hall collision", res3["decision_trace"])

        # Step 4: Cancel Step 1 Booking -> triggers waitlist re-allocation
        cancel_res = cancel_booking(res1["booking_id"], self.db)
        self.assertGreaterEqual(cancel_res["promoted_waitlist_count"], 1)

        # Verify Client 3 is now WAITLIST_OFFERED with 15-minute offer window
        b3 = self.db.query(Booking).filter(Booking.id == res3["booking_id"]).first()
        self.assertEqual(b3.status, "WAITLIST_OFFERED")
        self.assertIsNotNone(b3.offer_expires_at)
        self.assertIsNotNone(b3.hall_id)

        # Step 5: Confirm offer with advance deposit
        confirm_res = confirm_waitlist_offer(b3.id, self.db)
        self.assertEqual(b3.status, "CONFIRMED")
        self.assertIn("advance_paid", confirm_res)

if __name__ == "__main__":
    unittest.main()
