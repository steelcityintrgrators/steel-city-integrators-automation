function getAvailability_(dateText) {
  const cfg = requireConfigured_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeText_(dateText))) throw new Error("Use date format YYYY-MM-DD.");

  const calendar = CalendarApp.getCalendarById(cfg.calendarId);
  const minutes = cfg.appointmentMinutes;
  const dayStart = localDateTime_(dateText, pad2_(SCI.BUSINESS_START_HOUR) + ":00");
  const dayEnd = localDateTime_(dateText, pad2_(SCI.BUSINESS_END_HOUR) + ":00");
  const events = calendar.getEvents(dayStart, dayEnd);
  const slots = [];

  for (let start = new Date(dayStart.getTime()); start.getTime() + minutes * 60000 <= dayEnd.getTime(); start = new Date(start.getTime() + minutes * 60000)) {
    const end = new Date(start.getTime() + minutes * 60000);
    const busy = events.some(function(event) {
      return event.getStartTime() < end && event.getEndTime() > start;
    });
    if (!busy && start > new Date()) {
      slots.push({
        date: dateText,
        time: Utilities.formatDate(start, Session.getScriptTimeZone(), "HH:mm"),
        label: Utilities.formatDate(start, Session.getScriptTimeZone(), "h:mm a")
      });
    }
  }
  return slots;
}

function bookAppointment_(payload) {
  payload = payload || {};
  const cfg = requireConfigured_();
  const name = safeText_(payload.name);
  const email = safeText_(payload.email);
  const dateText = safeText_(payload.date);
  const timeText = safeText_(payload.time);
  const leadId = safeText_(payload.leadId);

  if (!name || !email || !dateText || !/^\d{2}:\d{2}$/.test(timeText)) {
    throw new Error("name, email, date, and time are required.");
  }

  const open = getAvailability_(dateText).some(function(slot) { return slot.time === timeText; });
  if (!open) throw new Error("That appointment time is no longer available.");

  const start = localDateTime_(dateText, timeText);
  const end = new Date(start.getTime() + cfg.appointmentMinutes * 60000);
  const calendar = CalendarApp.getCalendarById(cfg.calendarId);
  const title = "SCI Consultation - " + name;
  const description = [
    "Steel City Integrators consultation",
    "Lead ID: " + leadId,
    "Email: " + email,
    "Phone: " + safeText_(payload.phone),
    "Services: " + safeText_(payload.services),
    "Meeting type: " + (safeText_(payload.meetingType) || "Consultation"),
    "Notes: " + safeText_(payload.notes)
  ].join("\n");

  const event = calendar.createEvent(title, start, end, {
    description: description,
    location: safeText_(payload.location),
    guests: email,
    sendInvites: true
  });

  if (leadId && getLeadById_(leadId)) {
    updateLeadFields_(leadId, {
      "Appointment ID": event.getId(),
      "Stage": "Scheduled",
      "Last Contact": new Date(),
      "Next Follow-Up": ""
    });
    appendActivity_(leadId, "appointment_booked", "calendar", dateText + " " + timeText);
  }

  GmailApp.sendEmail(email, "Your Steel City Integrators consultation is booked",
    "Your consultation is booked for " + Utilities.formatDate(start, Session.getScriptTimeZone(), "EEEE, MMMM d 'at' h:mm a") + ".",
    {name: cfg.businessName});

  return {
    ok: true,
    eventId: event.getId(),
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function localDateTime_(dateText, timeText) {
  const dateParts = dateText.split("-").map(Number);
  const timeParts = timeText.split(":").map(Number);
  return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0, 0);
}

function pad2_(n) {
  return String(n).padStart(2, "0");
}
