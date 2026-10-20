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
