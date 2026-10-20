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
