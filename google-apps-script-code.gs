const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'tripboard_states';

function setup() {
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['share_code', 'pin_hash', 'payload_json', 'updated_at', 'updated_by', 'version']);
  }
}

function doGet(e) {
  const params = e.parameter || {};
  const action = String(params.action || '').toLowerCase();
  try {
    if (action === 'load') return handleLoad_(params);
    if (action === 'metadata') return handleMetadata_(params);
    return jsonp_({ ok: true, message: 'TripBoard Google Sheets sync is ready.' }, params.callback);
  } catch (err) {
    return jsonp_({ ok: false, error: err.message || String(err) }, params.callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '').toLowerCase();
    if (action === 'save') return handleSave_(body);
    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err) });
  }
}

function handleSave_(body) {
  const shareCode = normalizeShareCode_(body.shareCode);
  const pin = String(body.pin || '');
  const updatedBy = String(body.updatedBy || 'Unknown').slice(0, 80);
  const appState = body.appState;
  if (!shareCode) throw new Error('Missing shareCode.');
  if (!pin) throw new Error('Missing PIN.');
  if (!appState || typeof appState !== 'object') throw new Error('Missing appState.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    ensureHeader_(sheet);
    const row = findRowByShareCode_(sheet, shareCode);
    const pinHash = hashPin_(shareCode, pin);
    const now = new Date().toISOString();
    const payloadJson = JSON.stringify(appState);
    const version = Date.now();

    if (row) {
      const existingHash = String(sheet.getRange(row, 2).getValue() || '');
      if (existingHash !== pinHash) throw new Error('PIN is incorrect.');
      sheet.getRange(row, 3, 1, 4).setValues([[payloadJson, now, updatedBy, version]]);
    } else {
      sheet.appendRow([shareCode, pinHash, payloadJson, now, updatedBy, version]);
    }
    return json_({ ok: true, updatedAt: now, updatedBy, version });
  } finally {
    lock.releaseLock();
  }
}

function handleLoad_(params) {
  const shareCode = normalizeShareCode_(params.shareCode);
  const pin = String(params.pin || '');
  if (!shareCode) throw new Error('Missing shareCode.');
  if (!pin) throw new Error('Missing PIN.');

  const sheet = getSheet_();
  ensureHeader_(sheet);
  const row = findRowByShareCode_(sheet, shareCode);
  if (!row) return jsonp_({ ok: true, appState: null, updatedAt: null }, params.callback);

  const pinHash = hashPin_(shareCode, pin);
  const existingHash = String(sheet.getRange(row, 2).getValue() || '');
  if (existingHash !== pinHash) throw new Error('PIN is incorrect.');

  const payloadJson = String(sheet.getRange(row, 3).getValue() || '');
  const updatedAt = String(sheet.getRange(row, 4).getValue() || '');
  const updatedBy = String(sheet.getRange(row, 5).getValue() || '');
  const version = sheet.getRange(row, 6).getValue();
  const appState = payloadJson ? JSON.parse(payloadJson) : null;
  return jsonp_({ ok: true, appState, updatedAt, updatedBy, version }, params.callback);
}

function handleMetadata_(params) {
  const shareCode = normalizeShareCode_(params.shareCode);
  const pin = String(params.pin || '');
  if (!shareCode) throw new Error('Missing shareCode.');
  if (!pin) throw new Error('Missing PIN.');

  const sheet = getSheet_();
  ensureHeader_(sheet);
  const row = findRowByShareCode_(sheet, shareCode);
  if (!row) return jsonp_({ ok: true, updatedAt: null, updatedBy: null, version: null }, params.callback);

  const pinHash = hashPin_(shareCode, pin);
  const existingHash = String(sheet.getRange(row, 2).getValue() || '');
  if (existingHash !== pinHash) throw new Error('PIN is incorrect.');

  return jsonp_({
    ok: true,
    updatedAt: String(sheet.getRange(row, 4).getValue() || ''),
    updatedBy: String(sheet.getRange(row, 5).getValue() || ''),
    version: sheet.getRange(row, 6).getValue()
  }, params.callback);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['share_code', 'pin_hash', 'payload_json', 'updated_at', 'updated_by', 'version']);
  }
}

function findRowByShareCode_(sheet, shareCode) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === shareCode) return i + 2;
  }
  return null;
}

function normalizeShareCode_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '-').slice(0, 80);
}

function hashPin_(shareCode, pin) {
  const raw = `${shareCode}:${pin}`;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return Utilities.base64Encode(bytes);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(obj, callback) {
  const cb = String(callback || 'callback').match(/^[A-Za-z_$][0-9A-Za-z_.$]*$/) ? callback : 'callback';
  return ContentService.createTextOutput(`${cb}(${JSON.stringify(obj)});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
