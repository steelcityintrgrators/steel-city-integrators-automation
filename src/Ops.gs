function sendDailyOpsSummary() {
  const cfg=requireConfigured_(); if(!cfg.businessEmail)return;
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start.getTime());end.setDate(end.getDate()+1);
  const leads=getLeadRows_(),todaysLeads=leads.filter(function(lead){const created=lead["Created At"] instanceof Date?lead["Created At"]:new Date(lead["Created At"]);return created>=start&&created<end;}),openLeads=leads.filter(function(lead){return SCI.CLOSED_STAGES.indexOf(safeText_(lead["Stage"]))===-1;}),hotLeads=openLeads.filter(function(lead){return Number(lead["Score"]||0)>=60;}).sort(function(a,b){return Number(b["Score"]||0)-Number(a["Score"]||0);}).slice(0,5);
  const tomorrowStart=new Date(end.getTime()),tomorrowEnd=new Date(tomorrowStart.getTime());tomorrowEnd.setDate(tomorrowEnd.getDate()+1);
  const appointments=CalendarApp.getCalendarById(cfg.calendarId).getEvents(tomorrowStart,tomorrowEnd),lines=["Steel City Integrators Daily Operations Summary","","New leads today: "+todaysLeads.length,"Open leads: "+openLeads.length,"Hot leads (60+): "+hotLeads.length,"Appointments tomorrow: "+appointments.length,"Payments: "+(cfg.stripeSecretKey?"Stripe connected":"ACTION REQUIRED — connect Stripe"),"SMS: "+(cfg.smsWebhookUrl?"Connected":"Pending Voice/provider verification"),""];
  if(hotLeads.length){lines.push("Top active leads:");hotLeads.forEach(function(lead){lines.push("- "+lead["Lead ID"]+" | "+lead["Name"]+" | "+lead["Score"]+"/100 | "+lead["Services"]);});lines.push("");}
  if(appointments.length){lines.push("Tomorrow:");appointments.forEach(function(event){lines.push("- "+Utilities.formatDate(event.getStartTime(),Session.getScriptTimeZone(),"h:mm a")+" | "+event.getTitle());});}
  GmailApp.sendEmail(cfg.businessEmail,"SCI Daily Ops - "+Utilities.formatDate(now,Session.getScriptTimeZone(),"MMM d"),lines.join("\n"),{name:cfg.businessName});appendActivity_("","daily_ops_summary","email",cfg.businessEmail);
}

function systemStatus(){const cfg=sciConfig_();return{version:SCI.VERSION,configured:Boolean(cfg.crmSheetId&&cfg.leadFormId&&cfg.calendarId),businessHours:"07:00-21:00 Central",paymentConfigured:Boolean(cfg.stripeSecretKey),smsConfigured:Boolean(cfg.smsWebhookUrl),publicWebsite:cfg.websiteUrl};}
