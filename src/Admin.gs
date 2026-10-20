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
