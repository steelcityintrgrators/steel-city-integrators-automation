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
