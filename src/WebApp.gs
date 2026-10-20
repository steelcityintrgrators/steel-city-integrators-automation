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

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
