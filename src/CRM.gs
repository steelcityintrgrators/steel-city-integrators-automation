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
