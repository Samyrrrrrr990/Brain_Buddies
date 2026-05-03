const SPREADSHEET_ID = "1_6zOvem8LeSNIwARYaQryO8-_rA-L6-b8dw0M_XqdRQ";
const SHEET_NAME = "Leads";

function doPost(event) {
  const payload = parsePayload_(event);
  appendLead_(payload);
  return jsonResponse_({ ok: true });
}

function doGet(event) {
  const params = event.parameter || {};
  const callback = sanitizeCallback_(params.callback || "callback");

  if (params.action === "verify") {
    return javascriptResponse_(callback, {
      ok: hasRequestId_(params.requestId || "")
    });
  }

  return javascriptResponse_(callback, { ok: true, sheet: SHEET_NAME });
}

function appendLead_(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    sheet.appendRow([
      payload.timestamp || new Date().toISOString(),
      payload.studentName || "",
      payload.email || "",
      payload.grade || "",
      payload.subject || "",
      payload.format || "",
      payload.location || "",
      payload.goal || "",
      payload.pageUrl || "",
      payload.userAgent || "",
      "New",
      payload.requestId ? "Website lead | " + payload.requestId : "Website lead"
    ]);
  } finally {
    lock.releaseLock();
  }
}

function parsePayload_(event) {
  try {
    return JSON.parse(event.postData.contents || "{}");
  } catch (error) {
    return {};
  }
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function javascriptResponse_(callback, value) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(value) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function sanitizeCallback_(callback) {
  return /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)
    ? callback
    : "callback";
}

function hasRequestId_(requestId) {
  if (!requestId) {
    return false;
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  return Boolean(sheet.createTextFinder(requestId).matchCase(true).findNext());
}
