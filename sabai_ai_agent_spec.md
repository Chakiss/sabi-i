# Saba-i Massage

# AI Agent Implementation Specification

## MVP Therapist Calendar Booking Board

------------------------------------------------------------------------

# 1. System Overview

## System Name

Saba-i Booking Board

## Objective

Build a lightweight internal scheduling system for a massage shop that
allows receptionists to quickly determine therapist availability and
block time slots.

This MVP focuses only on **therapist occupancy**, not full booking
management.

The system intentionally does NOT store: - Customer information -
Service type - Payment data - Booking source

The system tracks only: - Therapist availability - Time blocks

------------------------------------------------------------------------

# 2. Core Concept

The application behaves as a **Therapist Occupancy Board**.

Calendar layout:

Columns = Therapist\
Rows = Time

Example:

  Time    May      Ann    Bee      Fon
  ------- -------- ------ -------- ------
  10:00   Booked   Free   Booked   Free
  10:30   Booked   Free   Booked   Free
  11:00   Free     Free   Booked   Free

Empty cells indicate available therapists.

------------------------------------------------------------------------

# 3. Target Device Constraints

The system will be used primarily on: - Old iPad devices - Safari
browser

Constraints: - Limited CPU power - Limited RAM - Slower JavaScript
engines

Therefore the system must: - Load quickly - Use minimal JavaScript -
Avoid heavy frameworks - Use touch‑friendly UI

------------------------------------------------------------------------

# 4. Recommended Technology Stack

## Hosting

Firebase Hosting

## Database

Cloud Firestore

## Frontend

Preferred: - Vanilla JavaScript

Optional helpers: - Alpine.js - HTMX

Avoid: - Heavy SPA frameworks - Large UI libraries - Complex calendar
frameworks

------------------------------------------------------------------------

# 5. System Architecture

Client (iPad Safari)

↓ HTTPS

Firebase Hosting

↓

Cloud Firestore Database

Optional later: Cloud Functions for backend logic.

------------------------------------------------------------------------

# 6. Firestore Data Model

## Collection: therapists

Path: therapists/{therapistId}

Fields:

-   name: string
-   status: "active" \| "inactive"
-   displayOrder: number
-   createdAt: timestamp

Example:

{ "name": "May", "status": "active", "displayOrder": 1 }

------------------------------------------------------------------------

## Collection: bookings

Path: bookings/{bookingId}

Fields:

-   therapistId: string
-   startTime: timestamp
-   endTime: timestamp
-   dateKey: string (YYYY-MM-DD)
-   note: string
-   createdAt: timestamp

Example:

{ "therapistId": "may", "startTime": "2026-03-07T14:00:00", "endTime":
"2026-03-07T16:00:00", "dateKey": "2026-03-07", "note": "" }

------------------------------------------------------------------------

# 7. Firestore Indexing

Required composite index:

Collection: bookings

Fields: - dateKey - therapistId

Purpose: Efficiently query bookings for a single day.

------------------------------------------------------------------------

# 8. Time Model

Shop opening hours:

10:00 -- 22:00

Time resolution:

30 minutes

Example slots:

10:00\
10:30\
11:00\
11:30\
...\
22:00

------------------------------------------------------------------------

# 9. Calendar UI Layout

Main interface: Daily Calendar

Example structure:

  Time    May   Ann    Bee    Fon
  ------- ----- ------ ------ -----
  10:00                \###   
  10:30         \###   \###   
  11:00                       

Legend:

-   Empty cell = free slot
-   Colored cell = booked slot

------------------------------------------------------------------------

# 10. Booking Block Model

Each booking represents a **continuous time block**.

Example:

Therapist: May\
Start: 14:00\
End: 16:00

All calendar cells between those times must be rendered as occupied.

------------------------------------------------------------------------

# 11. User Actions

## Create Booking

User taps an empty slot.

Display modal form:

Fields: - Therapist - Start Time - Duration - Note (optional)

Duration options:

30\
60\
90\
120 minutes

After confirmation: Create Firestore booking document.

------------------------------------------------------------------------

## Edit Booking

User taps existing booking block.

Options: - Edit - Delete

Editable fields: - Start Time - Duration - Note

------------------------------------------------------------------------

## Delete Booking

Remove the booking document from Firestore.

------------------------------------------------------------------------

# 12. Overlap Detection

Before saving a booking, check if it conflicts with an existing booking.

Conflict rule:

if newStart \< existingEnd AND newEnd \> existingStart\
→ conflict

If conflict occurs: Display error message:

"Time slot already booked"

------------------------------------------------------------------------

# 13. Firestore Query Strategy

Load bookings using:

WHERE dateKey == selectedDate

This returns all bookings for that day.

Client groups bookings by therapist.

------------------------------------------------------------------------

# 14. Rendering Algorithm

Steps:

1.  Fetch therapist list
2.  Fetch bookings for selected date
3.  Generate time slots
4.  Render calendar grid
5.  Fill booking ranges

Pseudo logic:

for each therapist: for each time slot: check if slot overlaps booking

------------------------------------------------------------------------

# 15. Performance Requirements

DOM limits:

Maximum rows: 24\
Maximum therapists: 10

Realtime listeners should subscribe only to:

bookings where dateKey == selectedDate

JavaScript bundle target:

\<150KB

------------------------------------------------------------------------

# 16. UI Interaction Guidelines

Touch targets:

Minimum 44px height

Font size:

Minimum 16px

Scrolling:

-   Vertical scroll for time
-   Horizontal scroll for therapists

------------------------------------------------------------------------

# 17. Error Handling

System must handle:

-   Network failure
-   Write conflicts
-   Invalid time ranges

User message example:

"Unable to save booking. Please try again."

------------------------------------------------------------------------

# 18. Offline Behavior (Optional)

If Firestore offline persistence is enabled:

-   Writes are queued locally
-   Sync occurs when network returns

------------------------------------------------------------------------

# 19. Security Rules (MVP)

Temporary rules:

allow read, write: if true;

For production: Add authentication and role restrictions.

------------------------------------------------------------------------

# 20. Deployment Steps

1.  Create Firebase project
2.  Enable Firestore
3.  Configure Firebase Hosting
4.  Deploy frontend

Commands:

firebase init\
firebase deploy

------------------------------------------------------------------------

# 21. Future Expansion

Phase 2: - Add service type - Add customer name - Add booking source

Phase 3: - Online booking - LINE integration - Payments - Notifications

------------------------------------------------------------------------

# 22. Success Criteria

The system is successful if:

-   Receptionist can see therapist availability instantly
-   Time blocks can be created quickly
-   No double booking occurs
-   Interface runs smoothly on old iPad devices
