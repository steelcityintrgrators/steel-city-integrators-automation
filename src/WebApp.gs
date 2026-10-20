function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = safeText_(params.action) || "health";
    if (action === "health") return jsonResponse_({ok: true, status: systemStatus()});
    if (action === "booking") return bookingPage_(params);
    if (action === "service") return serviceFormPage_();
    if (action === "availability") {
      const payment = verifyStripeCheckoutSession_(safeText_(params.session_id));
      return jsonResponse_({ok: true, slots: getAvailability_(safeText_(params.date), payment.service.durationMinutes)});
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
    if (action === "checkout") return checkoutRedirectPage_(safeText_(payload.service));
    enforceRateLimit_(payload);
    if (action === "lead") return jsonResponse_(handleWebLead_(payload));
    if (action === "book") return jsonResponse_(publicBookAppointment(payload));
    return jsonResponse_({ok: false, error: "Unknown action"});
  } catch (err) {
    const action = safeText_(e && e.parameter && e.parameter.action);
    if (action === "checkout") return errorPage_(err.message);
    return jsonResponse_({ok: false, error: err.message});
  }
}

function parseRequestBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    const type = safeText_(e.postData.type).toLowerCase();
    if (type.indexOf("application/json") !== -1) return JSON.parse(e.postData.contents);
  }
  const obj = {};
  Object.keys(e.parameter || {}).forEach(function(key) { obj[key] = e.parameter[key]; });
  return obj;
}

function enforceRateLimit_(payload) {
  const identity = [safeText_(payload.email).toLowerCase(),safeText_(payload.phone),safeText_(payload.name).toLowerCase()].join("|");
  if (!identity.replace(/\|/g, "")) return;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, identity);
  const key = "rl:" + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
  const cache = CacheService.getScriptCache();
  const current = Number(cache.get(key) || "0");
  if (current >= 5) throw new Error("Too many requests. Please try again later.");
  cache.put(key, String(current + 1), 3600);
}

function jsonResponse_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function errorPage_(message) {
  const cfg = sciConfig_();
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steel City Integrators</title><style>body{font-family:Arial;background:#07111c;color:#fff;padding:40px}.card{max-width:640px;margin:auto;padding:30px;border:1px solid #294258;border-radius:18px;background:#0d1c2b}a{color:#ff6b2c}</style></head><body><div class="card"><h1>We could not open checkout.</h1><p>' + htmlEscape_(message) + '</p><p><a href="' + htmlEscape_(cfg.websiteUrl) + '/book.html" target="_top">Return to pricing and booking</a></p></div></body></html>');
}
