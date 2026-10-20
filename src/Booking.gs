function getAvailability_(dateText, durationMinutes) {
  const cfg = requireConfigured_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeText_(dateText))) throw new Error("Use date format YYYY-MM-DD.");
  const minutes = Math.max(20, Number(durationMinutes || cfg.appointmentMinutes));
  const calendar = CalendarApp.getCalendarById(cfg.calendarId);
  const dayStart = localDateTime_(dateText, pad2_(SCI.BUSINESS_START_HOUR) + ":00");
  const dayEnd = localDateTime_(dateText, pad2_(SCI.BUSINESS_END_HOUR) + ":00");
  const events = calendar.getEvents(dayStart, dayEnd);
  const slots = [];
  for (let start = new Date(dayStart.getTime()); start.getTime() + minutes * 60000 <= dayEnd.getTime(); start = new Date(start.getTime() + 30 * 60000)) {
    const end = new Date(start.getTime() + minutes * 60000);
    const busy = events.some(function(event) { return event.getStartTime() < end && event.getEndTime() > start; });
    if (!busy && start > new Date()) slots.push({date:dateText,time:Utilities.formatDate(start,Session.getScriptTimeZone(),"HH:mm"),label:Utilities.formatDate(start,Session.getScriptTimeZone(),"h:mm a")});
  }
  return slots;
}

function bookAppointment_(payload, payment) {
  payload = payload || {};
  payment = payment || verifyStripeCheckoutSession_(safeText_(payload.paymentSessionId));
  const cfg = requireConfigured_();
  const name = safeText_(payload.name) || payment.customer.name;
  const email = safeText_(payload.email) || payment.customer.email;
  const dateText = safeText_(payload.date);
  const timeText = safeText_(payload.time);
  const leadId = safeText_(payload.leadId);
  const location = safeText_(payload.location);
  if (!name || !email || !dateText || !/^\d{2}:\d{2}$/.test(timeText)) throw new Error("Name, email, date and time are required.");
  if (payment.customer.email && email.toLowerCase() !== payment.customer.email.toLowerCase()) throw new Error("The booking email must match the email used at checkout.");
  if (payment.service.code.indexOf("onsite_") === 0 && !location) throw new Error("The on-site service address is required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (paymentAlreadyBooked_(payment.id)) throw new Error("This payment has already been used to schedule an appointment.");
    const open = getAvailability_(dateText, payment.service.durationMinutes).some(function(slot) { return slot.time === timeText; });
    if (!open) throw new Error("That appointment time is no longer available.");

    const start = localDateTime_(dateText, timeText);
    const end = new Date(start.getTime() + payment.service.durationMinutes * 60000);
    const calendar = CalendarApp.getCalendarById(cfg.calendarId);
    const title = "SCI — " + payment.service.name + " — " + name;
    const description = [
      "PREPAID STEEL CITY INTEGRATORS APPOINTMENT",
      "Service: " + payment.service.name,
      "Payment session: " + payment.id,
      "Payment intent: " + payment.paymentIntentId,
      "Amount paid: " + money_(payment.amountTotal),
      "Lead ID: " + leadId,
      "Email: " + email,
      "Phone: " + safeText_(payload.phone || payment.customer.phone),
      "Organization: " + safeText_(payload.organization),
      "Notes: " + safeText_(payload.notes || payload.summary),
      "Policy: Reservation fee is non-refundable after booking except when Steel City Integrators cancels or applicable law requires otherwise."
    ].join("\n");
    const event = calendar.createEvent(title, start, end, {description:description,location:location,guests:email,sendInvites:true});
    recordBooking_(payment,payload,start,end,event.getId());
    if (leadId && getLeadById_(leadId)) {
      updateLeadFields_(leadId,{"Appointment ID":event.getId(),"Stage":"Scheduled","Last Contact":new Date(),"Next Follow-Up":""});
      appendActivity_(leadId,"appointment_booked","calendar",payment.service.name + " | " + dateText + " " + timeText);
    }
    sendBookingConfirmation_(payment,payload,start,end);
    return {ok:true,eventId:event.getId(),start:start.toISOString(),end:end.toISOString(),service:payment.service.name};
  } finally { lock.releaseLock(); }
}

function recordBooking_(payment,payload,start,end,eventId) {
  const sheet = crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Bookings sheet is missing. Run upgradeSystemV12() once.");
  sheet.appendRow([
    payment.id,payment.paymentIntentId,payment.service.code,payment.service.name,payment.amountTotal / 100,
    safeText_(payload.name) || payment.customer.name,safeText_(payload.email) || payment.customer.email,
    safeText_(payload.phone) || payment.customer.phone,safeText_(payload.organization),safeText_(payload.location),
    start,end,eventId,new Date(),"","","","Scheduled",new Date()
  ]);
}

function sendBookingConfirmation_(payment,payload,start,end) {
  const cfg = sciConfig_();
  const email = safeText_(payload.email) || payment.customer.email;
  const when = Utilities.formatDate(start,Session.getScriptTimeZone(),"EEEE, MMMM d 'at' h:mm a z");
  const body = [
    "Your Steel City Integrators appointment is confirmed.","",payment.service.name,when,
    safeText_(payload.location) ? "Location: " + safeText_(payload.location) : "",
    "Amount paid: " + money_(payment.amountTotal),"",
    "One reschedule is allowed with at least 24 hours' notice, subject to availability.",
    "Reservation fees are non-refundable after booking except when Steel City Integrators cancels or applicable law requires otherwise.","",
    "Steel City Integrators LLC","(659) 223-4118",cfg.businessEmail
  ].filter(String).join("\n");
  GmailApp.sendEmail(email,"Confirmed: " + payment.service.name + " — " + when,body,{name:cfg.businessName});
  GmailApp.sendEmail(cfg.businessEmail,"[PAID BOOKING] " + payment.service.name + " — " + when,body + "\n\nCustomer: " + (safeText_(payload.name) || payment.customer.name),{name:cfg.businessName});
}

function localDateTime_(dateText,timeText) {
  const d=dateText.split("-").map(Number),t=timeText.split(":").map(Number);
  return new Date(d[0],d[1]-1,d[2],t[0],t[1],0,0);
}
function pad2_(n) { return String(n).padStart(2,"0"); }
