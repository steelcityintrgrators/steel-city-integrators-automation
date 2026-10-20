function runAppointmentReminders() {
  const sheet = bookingsSheet_();
  if (sheet.getLastRow() < 2) return {processed:0};
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,SCI.BOOKING_HEADERS.length).getValues();
  const now = new Date(); let processed = 0;
  rows.forEach(function(row,index) {
    const booking = bookingObject_(row);
    if (booking.status !== "Scheduled" || !(booking.start instanceof Date)) return;
    const hours = (booking.start.getTime() - now.getTime()) / 3600000;
    if (!booking.reminder24 && hours > 23 && hours <= 25) { sendReminder_(booking,"24 hours"); sheet.getRange(index+2,15).setValue(new Date()); processed++; }
    if (!booking.reminder2 && hours > 1 && hours <= 3) { sendReminder_(booking,"2 hours"); sheet.getRange(index+2,16).setValue(new Date()); processed++; }
  });
  return {processed:processed};
}

function runPostServiceFollowUp() {
  const sheet=bookingsSheet_();
  if (sheet.getLastRow()<2) return {processed:0};
  const rows=sheet.getRange(2,1,sheet.getLastRow()-1,SCI.BOOKING_HEADERS.length).getValues();
  const now=new Date(); let processed=0;
  rows.forEach(function(row,index){
    const booking=bookingObject_(row);
    if (booking.status!=="Scheduled" || booking.followUp || !(booking.end instanceof Date)) return;
    const hours=(now.getTime()-booking.end.getTime())/3600000;
    if (hours>=20 && hours<=48) {
      const cfg=sciConfig_();
      const body=["Hi " + booking.name + ",","Thank you for choosing Steel City Integrators for " + booking.serviceName + ".","","Reply to this email if you need a next step, estimate or follow-up visit. Your feedback also helps us improve the service experience.","","Steel City Integrators LLC","(659) 223-4118",cfg.businessEmail].join("\n");
      GmailApp.sendEmail(booking.email,"Following up on your Steel City Integrators service",body,{name:cfg.businessName});
      sheet.getRange(index+2,17).setValue(new Date()); processed++;
    }
  });
  return {processed:processed};
}

function sendReminder_(booking,windowLabel) {
  const cfg=sciConfig_();
  const when=Utilities.formatDate(booking.start,Session.getScriptTimeZone(),"EEEE, MMMM d 'at' h:mm a z");
  const message=["Reminder: your Steel City Integrators " + booking.serviceName + " appointment is in about " + windowLabel + ".","","Scheduled: " + when,booking.location ? "Location: " + booking.location : "","","Need help? Call (659) 223-4118 or reply to this email."].filter(String).join("\n");
  GmailApp.sendEmail(booking.email,"Reminder: " + booking.serviceName + " — " + when,message,{name:cfg.businessName});
  if (booking.phone) sendSmsIfConfigured_(booking.phone,"Steel City Integrators reminder: " + booking.serviceName + " is scheduled " + when + ".","");
}

function bookingsSheet_() {
  const sheet=crm_().getSheetByName(SCI.SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Bookings sheet is missing. Run upgradeSystemV12() once.");
  return sheet;
}

function bookingObject_(row) {
  return {sessionId:safeText_(row[0]),serviceCode:safeText_(row[2]),serviceName:safeText_(row[3]),amount:Number(row[4]||0),name:safeText_(row[5]),email:safeText_(row[6]),phone:safeText_(row[7]),organization:safeText_(row[8]),location:safeText_(row[9]),start:row[10],end:row[11],eventId:safeText_(row[12]),confirmation:row[13],reminder24:row[14],reminder2:row[15],followUp:row[16],status:safeText_(row[17])};
}
