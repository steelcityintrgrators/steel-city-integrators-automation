# Autonomous System Architecture

The $0-first release is organized into five operating layers.

## 1. Lead capture

**Inputs**
- Google Form created by `setupSystem()`
- Website/API POST endpoint

**Automation**
- Validates lead details
- Stores the lead in the CRM spreadsheet
- Scores the opportunity
- Sends an acknowledgement
- Sends an internal lead alert

## 2. CRM + qualification

The **Leads** tab is the system of record.

Each lead receives:
- Unique SCI lead ID
- Source
- Contact and organization data
- Customer type
- Requested services
- Budget and timeline
- Lead score
- Pipeline stage
- Follow-up state
- Appointment ID

Current target customer types:
- Churches
- Funeral homes
- Daycares
- Small businesses

## 3. Communication + follow-up

The hourly follow-up engine operates only between **7:00 AM and 9:00 PM Central**.

Sequence:
1. First follow-up
2. Second follow-up
3. Final follow-up

Email works immediately through Gmail. Text messaging automatically becomes available when an SMS webhook is configured.

## 4. Booking

The web app exposes:
- Availability lookup
- Appointment booking

Bookings are written to the dedicated **Steel City Integrators Bookings** calendar and invite the customer by email.

## 5. Operations

A daily operations summary emails:
- New leads
- Open leads
- Hot leads scoring 60+
- Next-day appointments

The **Activity** tab creates an audit trail of system activity.

## Cost model

The core uses:
- Google Apps Script
- Google Sheets
- Google Forms
- Gmail
- Google Calendar

There is no required paid software for the core. SMS/voice can be connected later without redesigning the rest of the system.

## Next build layer

After deployment and authorization:
1. Connect the public website lead form to the web app.
2. Connect SMS/voice after provider verification.
3. Add estimates/proposals and job pipeline automation.
4. Add lead-source tracking for Google Ads/Search campaigns.
5. Add service-radius qualification and route planning.
