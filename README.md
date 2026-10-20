# Steel City Integrators Automation

Autonomous lead intake, CRM, customer follow-up, booking, and operations system for **Steel City Integrators LLC**.

## Current build

**Core v1.1 is implemented** using a $0-first Google stack:

- Google Forms lead intake
- Website/API lead intake
- Google Sheets CRM
- Lead scoring and pipeline status
- Automatic Gmail acknowledgement
- Hourly follow-up engine
- 7:00 AM-9:00 PM Central operating window
- Google Calendar availability + booking
- Branded customer booking page
- Stable customer service-request redirect
- Public health response hardened to exclude internal Google resource IDs
- Daily operations summary
- SMS webhook adapter for phone/text provider integration
- Diagnostics and activity audit trail

## Five layers

1. **Capture** — Form + web/API lead intake
2. **CRM** — qualification, scoring, pipeline, activity
3. **Communication** — email now; SMS adapter ready
4. **Booking** — availability and appointment creation
5. **Operations** — scheduled follow-up and daily reporting

## Start here

See [docs/SETUP.md](docs/SETUP.md) for deployment instructions and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design.

After copying `src/` into a Google Apps Script project, run:

```javascript
setupSystem()
```

That one command creates the CRM spreadsheet, lead form, booking calendar, and automation triggers.

## Repository structure

- `src/` — deployable Google Apps Script source
- `docs/SETUP.md` — deployment and API examples
- `docs/ARCHITECTURE.md` — five-layer design
- `.clasp.json.example` — optional clasp deployment template

## Status

Core v1.1: **built; live deployment needs the latest dist/Code.gs bundle.**
