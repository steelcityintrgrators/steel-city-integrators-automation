# Steel City Integrators Automation — Setup

This first release uses Google Apps Script, Google Sheets, Google Forms, Gmail, and Google Calendar so the core can run at $0.

## What setupSystem() creates

- **Steel City Integrators CRM** spreadsheet
- **Steel City Integrators Service Request** Google Form
- **Steel City Integrators Bookings** Google Calendar
- Hourly autonomous follow-up trigger
- Daily operations email trigger
- 7:00 AM–9:00 PM follow-up operating window

## Deploy

1. Create a new Google Apps Script project at script.google.com.
2. Copy the files from `src/` into the Apps Script project, or use `clasp` with the included `.clasp.json.example`.
3. Run `setupSystem()` once.
4. Approve the requested Google permissions.
5. Open the execution result and save the returned Form URL.
6. In Apps Script choose **Deploy → New deployment → Web app**.
7. Execute as **Me**. Choose the audience appropriate for your website/API use.
8. Copy the Web App URL. It becomes the lead + availability + booking endpoint.

## Website API

### Health
`GET <WEB_APP_URL>?action=health`

### Availability
`GET <WEB_APP_URL>?action=availability&date=2026-10-21`

### Lead intake
POST JSON:

```json
{
  "action": "lead",
  "name": "Jane Smith",
  "organization": "Example Church",
  "customerType": "Church",
  "email": "jane@example.com",
  "phone": "205-555-0100",
  "location": "Birmingham, AL",
  "services": ["Live Streaming", "Permanent Sound Installation"],
  "budget": "$5,000-$10,000",
  "timeline": "Within 30 days",
  "preferredContact": "Email",
  "summary": "Upgrade sanctuary streaming and audio."
}
```

### Book appointment
POST JSON:

```json
{
  "action": "book",
  "leadId": "SCI-...",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "205-555-0100",
  "date": "2026-10-22",
  "time": "14:00",
  "meetingType": "On-site",
  "location": "Birmingham, AL"
}
```

## SMS / phone integration

SMS is intentionally adapter-based so the core build does not depend on a paid provider. When your phone/SMS provider is ready, add these Script Properties:

- `SMS_WEBHOOK_URL`
- `SMS_WEBHOOK_TOKEN` (optional)

The follow-up engine automatically uses SMS when the lead prefers text and the webhook is configured.

## Script Properties

Optional values:

- `BUSINESS_NAME`
- `BUSINESS_EMAIL`
- `WEBSITE_URL`
- `SERVICE_RADIUS_MILES` (default 80)
- `HOME_BASE` (default Birmingham, Alabama)
- `APPOINTMENT_MINUTES` (default 60)


## Customer-facing routes

After deploying the web app, these routes are available:

- `?action=health` — minimal public health check; internal Google IDs are not exposed.
- `?action=service` — stable customer service-request link that forwards to the current Google Form.
- `?action=booking` — branded consultation booking page with live Calendar availability.

The booking page can create a CRM lead when a matching email or phone number does not already exist, then books the appointment, updates the lead to Scheduled, sends the calendar invitation, and sends a booking confirmation email.
