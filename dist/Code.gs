// Steel City Integrators Automation — single-file Apps Script bundle
// Generated from src/ for easier mobile deployment.
// Branch: build/autonomous-core-v1

// ===== Config.gs =====
const SCI = Object.freeze({
  VERSION: "1.0.0",
  SHEETS: Object.freeze({
    LEADS: "Leads",
    ACTIVITY: "Activity",
    SETTINGS: "Settings"
  }),
  LEAD_HEADERS: Object.freeze([
    "Lead ID","Created At","Source","Name","Organization","Customer Type","Email","Phone",
    "Location","Services","Budget","Timeline","Preferred Contact","Project Summary","Score",
    "Stage","Last Contact","Next Follow-Up","Follow-Up Count","Appointment ID","Notes"
  ]),
  ACTIVITY_HEADERS: Object.freeze(["Timestamp","Lead ID","Type","Channel","Details"]),
  SERVICES: Object.freeze([
    "Live Streaming",
    "Permanent Sound Installation",
    "Lighting",
    "LED Walls",
    "CCTV",
    "Confidence Monitors",
    "Structured Cabling",
    "Access Control",
    "Commercial Video Displays",
    "WiFi / Network",
    "Streaming Audio Mixing - On-site",
    "Streaming Audio Mixing - Remote",
    "Other"
  ]),
  CLOSED_STAGES: Object.freeze(["Scheduled","Won","Lost"]),
  BUSINESS_START_HOUR: 7,
  BUSINESS_END_HOUR: 21,
  FOLLOW_UP_GAPS_DAYS: Object.freeze([1, 2, 4]),
  DEFAULT_APPOINTMENT_MINUTES: 60
});

function sciConfig_() {
  const p = PropertiesService.getScriptProperties();
  return {
    businessName: p.getProperty("BUSINESS_NAME") || "Steel City Integrators LLC",
    businessEmail: p.getProperty("BUSINESS_EMAIL") || Session.getEffectiveUser().getEmail(),
    crmSheetId: p.getProperty("CRM_SHEET_ID") || "",
    leadFormId: p.getProperty("LEAD_FORM_ID") || "",
    calendarId: p.getProperty("CALENDAR_ID") || "",
    websiteUrl: p.getProperty("WEBSITE_URL") || "",
    serviceRadiusMiles: Number(p.getProperty("SERVICE_RADIUS_MILES") || "80"),
    homeBase: p.getProperty("HOME_BASE") || "Birmingham, Alabama",
    appointmentMinutes: Number(p.getProperty("APPOINTMENT_MINUTES") || String(SCI.DEFAULT_APPOINTMENT_MINUTES)),
    smsWebhookUrl: p.getProperty("SMS_WEBHOOK_URL") || "",
    smsWebhookToken: p.getProperty("SMS_WEBHOOK_TOKEN") || ""
  };
}

function requireConfigured_() {
  const cfg = sciConfig_();
  if (!cfg.crmSheetId || !cfg.leadFormId || !cfg.calendarId) {
    throw new Error("System is not configured. Run setupSystem() once from Apps Script.");
  }
  return cfg;
}

function crm_() {
  const cfg = requireConfigured_();
  return SpreadsheetApp.openById(cfg.crmSheetId);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function safeText_(value) {
  return value == null ? "" : String(value).trim();
}


// ===== CRM.gs =====
function createLead_(payload, source) {
  const ss = crm_();
  const sheet = ss.getSheetByName(SCI.SHEETS.LEADS);
  const id = newLeadId_();
  const created = new Date();
  const services = Array.isArray(payload.services) ? payload.services.join(", ") : safeText_(payload.services);
  const score = scoreLead_(payload);
  const nextFollowUp = addDays_(created, SCI.FOLLOW_UP_GAPS_DAYS[0]);

  const row = [
    id,
    created,
    safeText_(source || "unknown"),
    safeText_(payload.name),
    safeText_(payload.organization),
    safeText_(payload.customerType),
    safeText_(payload.email),
    safeText_(payload.phone),
    safeText_(payload.location),
    services,
    safeText_(payload.budget),
    safeText_(payload.timeline),
    safeText_(payload.preferredContact),
    safeText_(payload.summary),
    score,
    "New",
    "",
    nextFollowUp,
    0,
    "",
    ""
  ];

  sheet.appendRow(row);
  appendActivity_(id, "lead_created", "system", "Lead created from " + safeText_(source));
  return getLeadById_(id);
}

function scoreLead_(payload) {
  let score = 10;
  const type = safeText_(payload.customerType).toLowerCase();
  const timeline = safeText_(payload.timeline).toLowerCase();
  const budget = safeText_(payload.budget).toLowerCase();
  const services = (Array.isArray(payload.services) ? payload.services.join(" ") : safeText_(payload.services)).toLowerCase();

  if (["church","funeral home","daycare","small business"].indexOf(type) !== -1) score += 15;
  if (timeline.indexOf("asap") !== -1 || timeline.indexOf("1 week") !== -1) score += 20;
  else if (timeline.indexOf("30 days") !== -1) score += 12;

  if (budget.indexOf("10,000+") !== -1) score += 25;
  else if (budget.indexOf("5,000") !== -1) score += 18;
  else if (budget.indexOf("2,500") !== -1) score += 12;
  else if (budget.indexOf("1,000") !== -1) score += 8;

  ["led wall","sound","structured cabling","access control","cctv","live streaming"].forEach(function(keyword) {
    if (services.indexOf(keyword) !== -1) score += 5;
  });

  if (safeText_(payload.email)) score += 5;
  if (safeText_(payload.phone)) score += 5;
  return Math.min(score, 100);
}

function getLeadById_(leadId) {
  const leads = getLeadRows_();
  for (let i = 0; i < leads.length; i++) {
    if (leads[i]["Lead ID"] === leadId) return leads[i];
  }
  return null;
}

function getLeadRows_() {
  const sheet = crm_().getSheetByName(SCI.SHEETS.LEADS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(function(row, index) {
    const obj = {_row: index + 2};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
    return obj;
  });
}

function updateLeadFields_(leadId, updates) {
  const sheet = crm_().getSheetByName(SCI.SHEETS.LEADS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lead = getLeadById_(leadId);
  if (!lead) throw new Error("Lead not found: " + leadId);

  Object.keys(updates).forEach(function(key) {
    const index = headers.indexOf(key);
    if (index !== -1) sheet.getRange(lead._row, index + 1).setValue(updates[key]);
  });
}

function appendActivity_(leadId, type, channel, details) {
  const cfg = sciConfig_();
  if (!cfg.crmSheetId) return;
  const ss = SpreadsheetApp.openById(cfg.crmSheetId);
  const sheet = ss.getSheetByName(SCI.SHEETS.ACTIVITY);
  if (!sheet) return;
  sheet.appendRow([new Date(), safeText_(leadId), safeText_(type), safeText_(channel), safeText_(details)]);
}

function newLeadId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return "SCI-" + stamp + "-" + suffix;
}

function addDays_(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + Number(days || 0));
  return copy;
}


// ===== Intake.gs =====
function onLeadFormSubmit(e) {
  if (!e || !e.response) throw new Error("Form submit event is required.");
  const answers = {};
  e.response.getItemResponses().forEach(function(itemResponse) {
    answers[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  const payload = {
    name: answers["Name"],
    organization: answers["Organization / Business"],
    customerType: answers["Customer Type"],
    email: answers["Email"],
    phone: answers["Phone"],
    location: answers["Project Location"],
    services: answers["Services Needed"],
    budget: answers["Budget Range"],
    timeline: answers["Desired Timeline"],
    preferredContact: answers["Preferred Contact"],
    summary: answers["Project Summary"]
  };

  const lead = createLead_(payload, "Google Form");
  sendLeadAcknowledgement_(lead);
  sendInternalLeadAlert_(lead);
  return lead;
}

function handleWebLead_(payload) {
  payload = payload || {};
  if (safeText_(payload.website)) return {ok: true}; // honeypot
  if (!safeText_(payload.name)) throw new Error("Name is required.");
  if (!safeText_(payload.email) && !safeText_(payload.phone)) throw new Error("Email or phone is required.");
  if (!safeText_(payload.location)) throw new Error("Project location is required.");

  const lead = createLead_(payload, "Website API");
  sendLeadAcknowledgement_(lead);
  sendInternalLeadAlert_(lead);
  return {ok: true, leadId: lead["Lead ID"], score: lead["Score"]};
}

function sendLeadAcknowledgement_(lead) {
  const email = safeText_(lead["Email"]);
  if (!email) return false;
  const cfg = sciConfig_();
  const subject = "We received your Steel City Integrators request";
  const services = safeText_(lead["Services"]) || "your requested service";
  const body =
    "Hi " + safeText_(lead["Name"]) + ",\n\n" +
    "We received your request for " + services + ". " +
    "We will review the details and follow up with the next step.\n\n" +
    "Steel City Integrators LLC\n" + cfg.businessEmail;

  GmailApp.sendEmail(email, subject, body, {
    name: cfg.businessName,
    htmlBody:
      "<p>Hi " + htmlEscape_(lead["Name"]) + ",</p>" +
      "<p>We received your request for <strong>" + htmlEscape_(services) + "</strong>.</p>" +
      "<p>We will review the details and follow up with the next step.</p>" +
      "<p>Steel City Integrators LLC<br>" + htmlEscape_(cfg.businessEmail) + "</p>"
  });
  updateLeadFields_(lead["Lead ID"], {"Last Contact": new Date(), "Stage": "Contacted"});
  appendActivity_(lead["Lead ID"], "acknowledgement_sent", "email", email);
  return true;
}

function sendInternalLeadAlert_(lead) {
  const cfg = sciConfig_();
  if (!cfg.businessEmail) return;
  const subject = "[SCI Lead " + lead["Score"] + "/100] " + safeText_(lead["Name"]) + " - " + safeText_(lead["Services"]);
  const body = [
    "New lead: " + safeText_(lead["Lead ID"]),
    "Name: " + safeText_(lead["Name"]),
    "Organization: " + safeText_(lead["Organization"]),
    "Type: " + safeText_(lead["Customer Type"]),
    "Phone: " + safeText_(lead["Phone"]),
    "Email: " + safeText_(lead["Email"]),
    "Location: " + safeText_(lead["Location"]),
    "Services: " + safeText_(lead["Services"]),
    "Budget: " + safeText_(lead["Budget"]),
    "Timeline: " + safeText_(lead["Timeline"]),
    "Score: " + safeText_(lead["Score"]),
    "",
    safeText_(lead["Project Summary"])
  ].join("\n");
  GmailApp.sendEmail(cfg.businessEmail, subject, body, {name: cfg.businessName});
  appendActivity_(lead["Lead ID"], "internal_alert", "email", cfg.businessEmail);
}

function htmlEscape_(value) {
  return safeText_(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ===== FollowUp.gs =====
function runFollowUpEngine() {
  requireConfigured_();
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, Session.getScriptTimeZone(), "H"));
  if (hour < SCI.BUSINESS_START_HOUR || hour >= SCI.BUSINESS_END_HOUR) {
    return {skipped: true, reason: "outside_business_hours"};
  }

  const leads = getLeadRows_();
  let processed = 0;

  leads.forEach(function(lead) {
    if (SCI.CLOSED_STAGES.indexOf(safeText_(lead["Stage"])) !== -1) return;

    const count = Number(lead["Follow-Up Count"] || 0);
    if (count >= SCI.FOLLOW_UP_GAPS_DAYS.length) return;

    const due = lead["Next Follow-Up"] instanceof Date ? lead["Next Follow-Up"] : new Date(lead["Next Follow-Up"]);
    if (!due || isNaN(due.getTime()) || due > now) return;

    const sent = sendAutomatedFollowUp_(lead, count);
    if (!sent) return;

    const nextCount = count + 1;
    const updates = {
      "Follow-Up Count": nextCount,
      "Last Contact": new Date(),
      "Stage": safeText_(lead["Stage"]) === "New" ? "Contacted" : safeText_(lead["Stage"])
    };

    if (nextCount < SCI.FOLLOW_UP_GAPS_DAYS.length) {
      updates["Next Follow-Up"] = addDays_(new Date(), SCI.FOLLOW_UP_GAPS_DAYS[nextCount]);
    } else {
      updates["Next Follow-Up"] = "";
    }

    updateLeadFields_(lead["Lead ID"], updates);
    processed++;
  });

  return {processed: processed};
}

function sendAutomatedFollowUp_(lead, sequenceIndex) {
  const preferred = safeText_(lead["Preferred Contact"]).toLowerCase();
  const email = safeText_(lead["Email"]);
  const phone = safeText_(lead["Phone"]);

  if (preferred === "text" && phone && sendSmsIfConfigured_(phone, followUpText_(lead, sequenceIndex), lead["Lead ID"])) {
    return true;
  }

  if (email) {
    const cfg = sciConfig_();
    const subject = followUpSubject_(sequenceIndex);
    const message = followUpText_(lead, sequenceIndex);
    GmailApp.sendEmail(email, subject, message, {name: cfg.businessName});
    appendActivity_(lead["Lead ID"], "follow_up_sent", "email", "Sequence " + (sequenceIndex + 1));
    return true;
  }

  if (phone && sendSmsIfConfigured_(phone, followUpText_(lead, sequenceIndex), lead["Lead ID"])) {
    return true;
  }

  appendActivity_(lead["Lead ID"], "follow_up_pending", "manual", "No automated email/SMS channel available");
  return false;
}

function followUpSubject_(index) {
  return [
    "Following up on your Steel City Integrators request",
    "Still planning your AV / low-voltage project?",
    "Final follow-up on your Steel City Integrators request"
  ][index] || "Steel City Integrators follow-up";
}

function followUpText_(lead, index) {
  const name = safeText_(lead["Name"]) || "there";
  const services = safeText_(lead["Services"]) || "your project";
  const messages = [
    "Hi " + name + ", this is Steel City Integrators following up on your request for " + services + ". Reply with the best time to talk and we can help plan the next step.",
    "Hi " + name + ", checking back on " + services + ". If the project is still active, we can help with scope, scheduling, and an estimate.",
    "Hi " + name + ", one last follow-up on " + services + ". If you are still planning the project, reply anytime and we can pick it back up."
  ];
  return messages[index] || messages[0];
}

function sendSmsIfConfigured_(phone, message, leadId) {
  const cfg = sciConfig_();
  if (!cfg.smsWebhookUrl) return false;

  const options = {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({to: phone, body: message, leadId: leadId})
  };
  if (cfg.smsWebhookToken) {
    options.headers = {Authorization: "Bearer " + cfg.smsWebhookToken};
  }

  const response = UrlFetchApp.fetch(cfg.smsWebhookUrl, options);
  const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  appendActivity_(leadId, ok ? "follow_up_sent" : "follow_up_failed", "sms", "HTTP " + response.getResponseCode());
  return ok;
}


// ===== Booking.gs =====
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


// ===== Ops.gs =====
function sendDailyOpsSummary() {
  const cfg = requireConfigured_();
  if (!cfg.businessEmail) return;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 1);

  const leads = getLeadRows_();
  const todaysLeads = leads.filter(function(lead) {
    const created = lead["Created At"] instanceof Date ? lead["Created At"] : new Date(lead["Created At"]);
    return created >= start && created < end;
  });
  const openLeads = leads.filter(function(lead) {
    return SCI.CLOSED_STAGES.indexOf(safeText_(lead["Stage"])) === -1;
  });
  const hotLeads = openLeads
    .filter(function(lead) { return Number(lead["Score"] || 0) >= 60; })
    .sort(function(a, b) { return Number(b["Score"] || 0) - Number(a["Score"] || 0); })
    .slice(0, 5);

  const tomorrowStart = new Date(end.getTime());
  const tomorrowEnd = new Date(tomorrowStart.getTime());
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const calendar = CalendarApp.getCalendarById(cfg.calendarId);
  const appointments = calendar.getEvents(tomorrowStart, tomorrowEnd);

  const lines = [
    "Steel City Integrators Daily Operations Summary",
    "",
    "New leads today: " + todaysLeads.length,
    "Open leads: " + openLeads.length,
    "Hot leads (60+): " + hotLeads.length,
    "Appointments tomorrow: " + appointments.length,
    ""
  ];

  if (hotLeads.length) {
    lines.push("Top active leads:");
    hotLeads.forEach(function(lead) {
      lines.push("- " + lead["Lead ID"] + " | " + lead["Name"] + " | " + lead["Score"] + "/100 | " + lead["Services"]);
    });
    lines.push("");
  }

  if (appointments.length) {
    lines.push("Tomorrow:");
    appointments.forEach(function(event) {
      lines.push("- " + Utilities.formatDate(event.getStartTime(), Session.getScriptTimeZone(), "h:mm a") + " | " + event.getTitle());
    });
  }

  GmailApp.sendEmail(cfg.businessEmail, "SCI Daily Ops - " + Utilities.formatDate(now, Session.getScriptTimeZone(), "MMM d"), lines.join("\n"), {
    name: cfg.businessName
  });
  appendActivity_("", "daily_ops_summary", "email", cfg.businessEmail);
}

function systemStatus() {
  const cfg = sciConfig_();
  return {
    version: SCI.VERSION,
    configured: Boolean(cfg.crmSheetId && cfg.leadFormId && cfg.calendarId),
    crmSheetId: cfg.crmSheetId,
    leadFormId: cfg.leadFormId,
    calendarId: cfg.calendarId,
    businessHours: "07:00-21:00",
    smsConfigured: Boolean(cfg.smsWebhookUrl)
  };
}


// ===== Admin.gs =====
function configureBusinessProfile(options) {
  options = options || {};
  const props = PropertiesService.getScriptProperties();
  const allowed = {
    businessName: "BUSINESS_NAME",
    businessEmail: "BUSINESS_EMAIL",
    websiteUrl: "WEBSITE_URL",
    serviceRadiusMiles: "SERVICE_RADIUS_MILES",
    homeBase: "HOME_BASE",
    appointmentMinutes: "APPOINTMENT_MINUTES"
  };

  Object.keys(allowed).forEach(function(key) {
    if (options[key] !== undefined && options[key] !== null && String(options[key]).trim() !== "") {
      props.setProperty(allowed[key], String(options[key]).trim());
    }
  });
  return sciConfig_();
}

function configureSmsWebhook(webhookUrl, token) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("SMS_WEBHOOK_URL", safeText_(webhookUrl));
  if (safeText_(token)) props.setProperty("SMS_WEBHOOK_TOKEN", safeText_(token));
  else props.deleteProperty("SMS_WEBHOOK_TOKEN");
  return {smsConfigured: Boolean(safeText_(webhookUrl))};
}

function getSystemLinks() {
  const cfg = requireConfigured_();
  const ss = SpreadsheetApp.openById(cfg.crmSheetId);
  const form = FormApp.openById(cfg.leadFormId);
  return {
    crm: ss.getUrl(),
    leadForm: form.getPublishedUrl(),
    calendarId: cfg.calendarId
  };
}

function runDiagnostics() {
  const cfg = sciConfig_();
  const checks = [];

  checks.push({name:"CRM configured", ok:Boolean(cfg.crmSheetId)});
  checks.push({name:"Lead form configured", ok:Boolean(cfg.leadFormId)});
  checks.push({name:"Calendar configured", ok:Boolean(cfg.calendarId)});

  if (cfg.crmSheetId) {
    const ss = SpreadsheetApp.openById(cfg.crmSheetId);
    [SCI.SHEETS.LEADS, SCI.SHEETS.ACTIVITY, SCI.SHEETS.SETTINGS].forEach(function(name) {
      checks.push({name:"Sheet: " + name, ok:Boolean(ss.getSheetByName(name))});
    });
  }

  if (cfg.leadFormId) {
    const form = FormApp.openById(cfg.leadFormId);
    checks.push({name:"Lead form accessible", ok:Boolean(form.getId())});
  }

  if (cfg.calendarId) {
    checks.push({name:"Booking calendar accessible", ok:Boolean(CalendarApp.getCalendarById(cfg.calendarId))});
  }

  const triggerHandlers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  ["onLeadFormSubmit","runFollowUpEngine","sendDailyOpsSummary"].forEach(function(handler) {
    checks.push({name:"Trigger: " + handler, ok:triggerHandlers.indexOf(handler) !== -1});
  });

  return {
    ok: checks.every(function(check) { return check.ok; }),
    checks: checks,
    smsConfigured: Boolean(cfg.smsWebhookUrl)
  };
}


// ===== Setup.gs =====
function setupSystem() {
  const props = PropertiesService.getScriptProperties();

  if (!props.getProperty("BUSINESS_NAME")) props.setProperty("BUSINESS_NAME", "Steel City Integrators LLC");
  if (!props.getProperty("BUSINESS_EMAIL")) props.setProperty("BUSINESS_EMAIL", Session.getEffectiveUser().getEmail());
  if (!props.getProperty("SERVICE_RADIUS_MILES")) props.setProperty("SERVICE_RADIUS_MILES", "80");
  if (!props.getProperty("HOME_BASE")) props.setProperty("HOME_BASE", "Birmingham, Alabama");
  if (!props.getProperty("APPOINTMENT_MINUTES")) props.setProperty("APPOINTMENT_MINUTES", "60");

  let ss;
  if (props.getProperty("CRM_SHEET_ID")) {
    ss = SpreadsheetApp.openById(props.getProperty("CRM_SHEET_ID"));
  } else {
    ss = SpreadsheetApp.create("Steel City Integrators CRM");
    props.setProperty("CRM_SHEET_ID", ss.getId());
  }
  initializeCrmSheets_(ss);

  let form;
  if (props.getProperty("LEAD_FORM_ID")) {
    form = FormApp.openById(props.getProperty("LEAD_FORM_ID"));
  } else {
    form = buildLeadForm_();
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    props.setProperty("LEAD_FORM_ID", form.getId());
  }

  let calendar;
  if (props.getProperty("CALENDAR_ID")) {
    calendar = CalendarApp.getCalendarById(props.getProperty("CALENDAR_ID"));
  } else {
    calendar = CalendarApp.createCalendar("Steel City Integrators Bookings");
    props.setProperty("CALENDAR_ID", calendar.getId());
  }

  installProjectTriggers_(form);
  writeSettings_(ss, form, calendar);

  appendActivity_("", "system_setup", "system", "Automation core configured");
  return {
    version: SCI.VERSION,
    crmUrl: ss.getUrl(),
    formUrl: form.getPublishedUrl(),
    calendarId: calendar.getId()
  };
}

function initializeCrmSheets_(ss) {
  const leads = getOrCreateSheet_(ss, SCI.SHEETS.LEADS);
  const activity = getOrCreateSheet_(ss, SCI.SHEETS.ACTIVITY);
  const settings = getOrCreateSheet_(ss, SCI.SHEETS.SETTINGS);

  setHeaderIfNeeded_(leads, SCI.LEAD_HEADERS);
  setHeaderIfNeeded_(activity, SCI.ACTIVITY_HEADERS);

  if (settings.getLastRow() === 0) {
    settings.getRange(1, 1, 1, 2).setValues([["Setting","Value"]]);
    settings.setFrozenRows(1);
  }

  leads.setFrozenRows(1);
  activity.setFrozenRows(1);
  leads.autoResizeColumns(1, SCI.LEAD_HEADERS.length);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setHeaderIfNeeded_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing.join("|") !== headers.join("|")) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function buildLeadForm_() {
  const form = FormApp.create("Steel City Integrators Service Request");
  form.setDescription(
    "Request AV, live streaming, sound, lighting, networking, CCTV, access control, structured cabling, or commercial display service within approximately 80 miles of Birmingham, Alabama."
  );
  form.setConfirmationMessage("Thank you. Steel City Integrators received your request and will follow up shortly.");

  form.addTextItem().setTitle("Name").setRequired(true);
  form.addTextItem().setTitle("Organization / Business");
  form.addMultipleChoiceItem()
    .setTitle("Customer Type")
    .setChoiceValues(["Church","Funeral Home","Daycare","Small Business","Other"])
    .setRequired(true);
  form.addTextItem().setTitle("Email");
  form.addTextItem().setTitle("Phone");
  form.addTextItem().setTitle("Project Location").setRequired(true);
  form.addCheckboxItem().setTitle("Services Needed").setChoiceValues(SCI.SERVICES).setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle("Budget Range")
    .setChoiceValues(["Not sure yet","Under $1,000","$1,000-$2,500","$2,500-$5,000","$5,000-$10,000","$10,000+"]);
  form.addMultipleChoiceItem()
    .setTitle("Desired Timeline")
    .setChoiceValues(["Emergency / ASAP","Within 1 week","Within 30 days","1-3 months","Planning / researching"]);
  form.addMultipleChoiceItem()
    .setTitle("Preferred Contact")
    .setChoiceValues(["Email","Phone","Text"]);
  form.addParagraphTextItem().setTitle("Project Summary").setRequired(true);
  form.addCheckboxItem()
    .setTitle("Contact Consent")
    .setChoiceValues(["I agree to be contacted about this service request."])
    .setRequired(true);
  return form;
}

function installProjectTriggers_(form) {
  const handlers = ["onLeadFormSubmit", "runFollowUpEngine", "sendDailyOpsSummary"];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger("onLeadFormSubmit").forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger("runFollowUpEngine").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("sendDailyOpsSummary").timeBased().atHour(20).everyDays(1).create();
}

function writeSettings_(ss, form, calendar) {
  const cfg = sciConfig_();
  const sheet = ss.getSheetByName(SCI.SHEETS.SETTINGS);
  const rows = [
    ["Version", SCI.VERSION],
    ["Business Name", cfg.businessName],
    ["Business Email", cfg.businessEmail],
    ["Home Base", cfg.homeBase],
    ["Service Radius Miles", cfg.serviceRadiusMiles],
    ["Operating Hours", "7:00 AM - 9:00 PM"],
    ["Lead Form", form.getPublishedUrl()],
    ["Calendar ID", calendar.getId()],
    ["SMS Status", cfg.smsWebhookUrl ? "Configured" : "Pending provider / ID verification"]
  ];
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 2).clearContent();
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}


// ===== WebApp.gs =====
function doGet(e) {
  try {
    const action = safeText_(e && e.parameter && e.parameter.action) || "health";
    if (action === "health") return jsonResponse_({ok: true, status: systemStatus()});
    if (action === "availability") {
      return jsonResponse_({ok: true, slots: getAvailability_(safeText_(e.parameter.date))});
    }
    return jsonResponse_({ok: false, error: "Unknown action"});
  } catch (err) {
    return jsonResponse_({ok: false, error: err.message});
  }
}

function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const action = safeText_(payload.action);
    enforceRateLimit_(payload);

    if (action === "lead") return jsonResponse_(handleWebLead_(payload));
    if (action === "book") return jsonResponse_(bookAppointment_(payload));
    return jsonResponse_({ok: false, error: "Unknown action"});
  } catch (err) {
    return jsonResponse_({ok: false, error: err.message});
  }
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const type = safeText_(e.postData.type).toLowerCase();
  if (type.indexOf("application/json") !== -1) return JSON.parse(e.postData.contents);
  const obj = {};
  Object.keys(e.parameter || {}).forEach(function(key) { obj[key] = e.parameter[key]; });
  return obj;
}

function enforceRateLimit_(payload) {
  const identity = [
    safeText_(payload.email).toLowerCase(),
    safeText_(payload.phone),
    safeText_(payload.name).toLowerCase()
  ].join("|");

  if (!identity.replace(/\|/g, "")) return;

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity);
  const key = "rl:" + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || "0");
  if (current >= 5) throw new Error("Too many requests. Please try again later.");
  cache.put(key, String(current + 1), 3600);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
