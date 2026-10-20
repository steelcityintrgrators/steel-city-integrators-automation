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
    businessHours: "07:00-21:00",
    smsConfigured: Boolean(cfg.smsWebhookUrl)
  };
}
