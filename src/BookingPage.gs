function publicAvailability(dateText) {
  return getAvailability_(safeText_(dateText));
}

function publicBookAppointment(payload) {
  payload = payload || {};
  if (!payload.contactConsent) throw new Error("Contact consent is required.");

  let lead = findLeadByContact_(payload.email, payload.phone);
  if (!lead) {
    lead = createLead_({
      name: payload.name,
      organization: payload.organization,
      customerType: payload.customerType || "Other",
      email: payload.email,
      phone: payload.phone,
      location: payload.location,
      services: payload.services,
      budget: payload.budget || "",
      timeline: payload.timeline || "",
      preferredContact: payload.preferredContact || "Email",
      summary: payload.summary || ("Consultation booking: " + safeText_(payload.meetingType))
    }, "Booking Page");

    sendLeadAcknowledgement_(lead);
    sendInternalLeadAlert_(lead);
  }

  payload.leadId = lead["Lead ID"];
  return bookAppointment_(payload);
}

function findLeadByContact_(email, phone) {
  const targetEmail = safeText_(email).toLowerCase();
  const targetPhone = safeText_(phone).replace(/\D/g, "");
  const leads = getLeadRows_().slice().reverse();

  for (let i = 0; i < leads.length; i++) {
    const leadEmail = safeText_(leads[i]["Email"]).toLowerCase();
    const leadPhone = safeText_(leads[i]["Phone"]).replace(/\D/g, "");
    if ((targetEmail && leadEmail === targetEmail) || (targetPhone && leadPhone === targetPhone)) {
      return leads[i];
    }
  }
  return null;
}

function serviceFormPage_() {
  const cfg = requireConfigured_();
  const url = FormApp.openById(cfg.leadFormId).getPublishedUrl();
  const escaped = htmlEscape_(url);
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="refresh" content="0;url=' + escaped + '">' +
    '<title>Steel City Integrators Service Request</title></head><body>' +
    '<p>Opening the Steel City Integrators service request form...</p>' +
    '<p><a href="' + escaped + '" target="_top">Tap here if the form does not open.</a></p>' +
    '</body></html>'
  ).setTitle("Steel City Integrators Service Request");
}

function bookingPage_() {
  return HtmlService.createHtmlOutput(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Book a Consultation | Steel City Integrators</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; background: #f5f6f7; color: #17191c; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 28px 18px 48px; }
    .card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .sub { margin: 0 0 24px; color: #5d6269; line-height: 1.45; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    label { display: block; font-weight: 700; margin-bottom: 6px; }
    input, select, textarea, button { width: 100%; font: inherit; }
    input, select, textarea { padding: 12px; border: 1px solid #cdd2d8; border-radius: 10px; background: #fff; }
    textarea { min-height: 90px; resize: vertical; }
    button { padding: 13px 16px; border: 0; border-radius: 10px; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
    button.secondary { background: #e9ecef; color: #17191c; }
    button:disabled { opacity: .55; cursor: wait; }
    .consent { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; }
    .consent input { width: auto; margin-top: 3px; }
    #message { margin-top: 16px; padding: 12px; border-radius: 10px; display: none; }
    #message.ok { display:block; background:#eaf7ee; }
    #message.err { display:block; background:#fdecec; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .full { grid-column: 1; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Book a Consultation</h1>
      <p class="sub">Choose an available time with Steel City Integrators. Appointments are scheduled in Central Time.</p>
      <form id="bookingForm">
        <div class="grid">
          <div>
            <label for="name">Name</label>
            <input id="name" required>
          </div>
          <div>
            <label for="organization">Organization / Business</label>
            <input id="organization">
          </div>
          <div>
            <label for="customerType">Customer Type</label>
            <select id="customerType">
              <option>Church</option><option>Funeral Home</option><option>Daycare</option>
              <option>Small Business</option><option>Other</option>
            </select>
          </div>
          <div>
            <label for="service">Primary Service</label>
            <select id="service">
              <option>Live Streaming</option><option>Permanent Sound Installation</option>
              <option>Lighting</option><option>LED Walls</option><option>CCTV</option>
              <option>Confidence Monitors</option><option>Structured Cabling</option>
              <option>Access Control</option><option>Commercial Video Displays</option>
              <option>WiFi / Network</option><option>Streaming Audio Mixing - On-site</option>
              <option>Streaming Audio Mixing - Remote</option><option>Other</option>
            </select>
          </div>
          <div>
            <label for="email">Email</label>
            <input id="email" type="email" required>
          </div>
          <div>
            <label for="phone">Phone</label>
            <input id="phone" type="tel">
          </div>
          <div class="full">
            <label for="location">Project Location</label>
            <input id="location" placeholder="City, AL or project address" required>
          </div>
          <div>
            <label for="meetingType">Meeting Type</label>
            <select id="meetingType">
              <option>Phone consultation</option>
              <option>Remote session</option>
              <option>On-site consultation</option>
              <option>In-person meeting</option>
            </select>
          </div>
          <div>
            <label for="date">Date</label>
            <input id="date" type="date" required>
          </div>
          <div class="full">
            <button class="secondary" type="button" id="loadTimes">Show Available Times</button>
          </div>
          <div class="full">
            <label for="time">Available Time</label>
            <select id="time" required disabled>
              <option value="">Choose a date first</option>
            </select>
          </div>
          <div class="full">
            <label for="summary">Project Notes</label>
            <textarea id="summary" placeholder="Tell us what you need help with."></textarea>
          </div>
          <div class="full">
            <label class="consent">
              <input id="contactConsent" type="checkbox" required>
              <span>I agree to be contacted by Steel City Integrators about this consultation and service request.</span>
            </label>
          </div>
          <div class="full">
            <button id="submitBtn" type="submit">Book Consultation</button>
          </div>
        </div>
      </form>
      <div id="message"></div>
    </div>
  </div>
<script>
(function () {
  var form = document.getElementById("bookingForm");
  var date = document.getElementById("date");
  var time = document.getElementById("time");
  var load = document.getElementById("loadTimes");
  var submit = document.getElementById("submitBtn");
  var msg = document.getElementById("message");

  var d = new Date();
  d.setDate(d.getDate() + 1);
  date.min = d.toISOString().slice(0, 10);

  function show(text, ok) {
    msg.className = ok ? "ok" : "err";
    msg.textContent = text;
  }

  load.addEventListener("click", function () {
    if (!date.value) { show("Choose a date first.", false); return; }
    load.disabled = true;
    load.textContent = "Checking...";
    google.script.run
      .withSuccessHandler(function (slots) {
        time.innerHTML = "";
        if (!slots || !slots.length) {
          var empty = document.createElement("option");
          empty.value = "";
          empty.textContent = "No times available";
          time.appendChild(empty);
          time.disabled = true;
          show("No appointment times are available for that date.", false);
        } else {
          var first = document.createElement("option");
          first.value = "";
          first.textContent = "Select a time";
          time.appendChild(first);
          slots.forEach(function (slot) {
            var option = document.createElement("option");
            option.value = slot.time;
            option.textContent = slot.label;
            time.appendChild(option);
          });
          time.disabled = false;
          msg.style.display = "none";
        }
        load.disabled = false;
        load.textContent = "Show Available Times";
      })
      .withFailureHandler(function (err) {
        load.disabled = false;
        load.textContent = "Show Available Times";
        show(err.message || String(err), false);
      })
      .publicAvailability(date.value);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!time.value) { show("Choose an available time.", false); return; }
    submit.disabled = true;
    submit.textContent = "Booking...";

    var payload = {
      name: document.getElementById("name").value,
      organization: document.getElementById("organization").value,
      customerType: document.getElementById("customerType").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      location: document.getElementById("location").value,
      services: document.getElementById("service").value,
      meetingType: document.getElementById("meetingType").value,
      date: date.value,
      time: time.value,
      summary: document.getElementById("summary").value,
      preferredContact: "Email",
      contactConsent: document.getElementById("contactConsent").checked
    };

    google.script.run
      .withSuccessHandler(function () {
        show("Your consultation is booked. Check your email for the calendar invitation.", true);
        submit.disabled = false;
        submit.textContent = "Book Consultation";
        form.reset();
        time.disabled = true;
        time.innerHTML = '<option value="">Choose a date first</option>';
      })
      .withFailureHandler(function (err) {
        submit.disabled = false;
        submit.textContent = "Book Consultation";
        show(err.message || String(err), false);
      })
      .publicBookAppointment(payload);
  });
})();
</script>
</body>
</html>`).setTitle("Book a Consultation | Steel City Integrators");
}
