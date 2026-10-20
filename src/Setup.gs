function setupSystem() {
  const props=PropertiesService.getScriptProperties();
  if (!props.getProperty("BUSINESS_NAME")) props.setProperty("BUSINESS_NAME","Steel City Integrators LLC");
  if (!props.getProperty("BUSINESS_EMAIL")) props.setProperty("BUSINESS_EMAIL",Session.getEffectiveUser().getEmail());
  if (!props.getProperty("SERVICE_RADIUS_MILES")) props.setProperty("SERVICE_RADIUS_MILES","80");
  if (!props.getProperty("HOME_BASE")) props.setProperty("HOME_BASE","Birmingham, Alabama");
  if (!props.getProperty("APPOINTMENT_MINUTES")) props.setProperty("APPOINTMENT_MINUTES","60");
  if (!props.getProperty("WEBSITE_URL")) props.setProperty("WEBSITE_URL",SCI.DEFAULT_PUBLIC_SITE_URL);
  let ss=props.getProperty("CRM_SHEET_ID") ? SpreadsheetApp.openById(props.getProperty("CRM_SHEET_ID")) : SpreadsheetApp.create("Steel City Integrators CRM");
  props.setProperty("CRM_SHEET_ID",ss.getId()); initializeCrmSheets_(ss);
  let form=props.getProperty("LEAD_FORM_ID") ? FormApp.openById(props.getProperty("LEAD_FORM_ID")) : buildLeadForm_();
  if (!props.getProperty("LEAD_FORM_ID")) { form.setDestination(FormApp.DestinationType.SPREADSHEET,ss.getId()); props.setProperty("LEAD_FORM_ID",form.getId()); }
  let calendar=props.getProperty("CALENDAR_ID") ? CalendarApp.getCalendarById(props.getProperty("CALENDAR_ID")) : CalendarApp.createCalendar("Steel City Integrators Bookings");
  props.setProperty("CALENDAR_ID",calendar.getId()); installProjectTriggers_(form); writeSettings_(ss,form,calendar);
  appendActivity_("","system_setup","system","Automation core configured or upgraded to " + SCI.VERSION);
  return {version:SCI.VERSION,crmUrl:ss.getUrl(),formUrl:form.getPublishedUrl(),calendarId:calendar.getId(),nextStep:"Configure Stripe and deploy a new web-app version."};
}

function upgradeSystemV12() {
  const cfg=requireConfigured_(),ss=SpreadsheetApp.openById(cfg.crmSheetId),form=FormApp.openById(cfg.leadFormId),calendar=CalendarApp.getCalendarById(cfg.calendarId);
  PropertiesService.getScriptProperties().setProperty("WEBSITE_URL",cfg.websiteUrl || SCI.DEFAULT_PUBLIC_SITE_URL);
  initializeCrmSheets_(ss); installProjectTriggers_(form); writeSettings_(ss,form,calendar);
  appendActivity_("","system_upgrade","system","Upgraded to " + SCI.VERSION);
  return {ok:true,version:SCI.VERSION,stripeConfigured:Boolean(sciConfig_().stripeSecretKey),webApp:ScriptApp.getService().getUrl()||""};
}

function initializeCrmSheets_(ss) {
  const leads=getOrCreateSheet_(ss,SCI.SHEETS.LEADS),activity=getOrCreateSheet_(ss,SCI.SHEETS.ACTIVITY),settings=getOrCreateSheet_(ss,SCI.SHEETS.SETTINGS),bookings=getOrCreateSheet_(ss,SCI.SHEETS.BOOKINGS);
  setHeaderIfNeeded_(leads,SCI.LEAD_HEADERS); setHeaderIfNeeded_(activity,SCI.ACTIVITY_HEADERS); setHeaderIfNeeded_(bookings,SCI.BOOKING_HEADERS);
  if (settings.getLastRow()===0) settings.getRange(1,1,1,2).setValues([["Setting","Value"]]);
  [leads,activity,settings,bookings].forEach(function(sheet){sheet.setFrozenRows(1);});
}
function getOrCreateSheet_(ss,name){return ss.getSheetByName(name)||ss.insertSheet(name);}
function setHeaderIfNeeded_(sheet,headers){if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);return;}const existing=sheet.getRange(1,1,1,headers.length).getValues()[0];if(existing.join("|")!==headers.join("|"))sheet.getRange(1,1,1,headers.length).setValues([headers]);}

function buildLeadForm_(){
  const form=FormApp.create("Steel City Integrators Service Request");
  form.setDescription("Request AV, live streaming, sound, lighting, networking, CCTV, access control, structured cabling, or commercial display service within approximately 80 miles of Birmingham, Alabama.");
  form.setConfirmationMessage("Thank you. Steel City Integrators received your request and will follow up shortly.");
  form.addTextItem().setTitle("Name").setRequired(true); form.addTextItem().setTitle("Organization / Business");
  form.addMultipleChoiceItem().setTitle("Customer Type").setChoiceValues(["Church","Funeral Home","Daycare","Small Business","Residential","Other"]).setRequired(true);
  form.addTextItem().setTitle("Email"); form.addTextItem().setTitle("Phone"); form.addTextItem().setTitle("Project Location").setRequired(true);
  form.addCheckboxItem().setTitle("Services Needed").setChoiceValues(SCI.SERVICES).setRequired(true);
  form.addMultipleChoiceItem().setTitle("Budget Range").setChoiceValues(["Not sure yet","Under $1,000","$1,000-$2,500","$2,500-$5,000","$5,000-$10,000","$10,000+"]);
  form.addMultipleChoiceItem().setTitle("Desired Timeline").setChoiceValues(["Emergency / ASAP","Within 1 week","Within 30 days","1-3 months","Planning / researching"]);
  form.addMultipleChoiceItem().setTitle("Preferred Contact").setChoiceValues(["Email","Phone","Text"]); form.addParagraphTextItem().setTitle("Project Summary").setRequired(true);
  form.addCheckboxItem().setTitle("Contact Consent").setChoiceValues(["I agree to be contacted about this service request."]).setRequired(true); return form;
}

function installProjectTriggers_(form) {
  const handlers=["onLeadFormSubmit","runFollowUpEngine","sendDailyOpsSummary","runAppointmentReminders","runPostServiceFollowUp"];
  ScriptApp.getProjectTriggers().forEach(function(trigger){if(handlers.indexOf(trigger.getHandlerFunction())!==-1)ScriptApp.deleteTrigger(trigger);});
  ScriptApp.newTrigger("onLeadFormSubmit").forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger("runFollowUpEngine").timeBased().everyHours(1).create(); ScriptApp.newTrigger("runAppointmentReminders").timeBased().everyHours(1).create();
  ScriptApp.newTrigger("runPostServiceFollowUp").timeBased().everyHours(1).create(); ScriptApp.newTrigger("sendDailyOpsSummary").timeBased().atHour(20).everyDays(1).create();
}

function writeSettings_(ss,form,calendar) {
  const cfg=sciConfig_(),sheet=ss.getSheetByName(SCI.SHEETS.SETTINGS),rows=[["Version",SCI.VERSION],["Business Name",cfg.businessName],["Business Email",cfg.businessEmail],["Website",cfg.websiteUrl],["Home Base",cfg.homeBase],["Service Radius Miles",cfg.serviceRadiusMiles],["Operating Hours","7:00 AM - 9:00 PM Central"],["Lead Form",form.getPublishedUrl()],["Calendar ID",calendar.getId()],["Payments",cfg.stripeSecretKey ? "Stripe configured" : "Stripe authorization required"],["SMS Status",cfg.smsWebhookUrl ? "Configured" : "Pending Google Voice/provider verification"]];
  if(sheet.getMaxRows()>1)sheet.getRange(2,1,sheet.getMaxRows()-1,2).clearContent(); sheet.getRange(2,1,rows.length,2).setValues(rows);
}
