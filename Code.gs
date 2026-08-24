const SHEET_NAME = 'CarLocation';
const CAR_LIST_SHEET = 'CarList';
const HEADER = ['latitude', 'longitude', 'updatedBy', 'updatedAt', 'carName'];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  // Return car list
  if (params.action === 'carlist') {
    return jsonOutput_({ cars: getCarList_() });
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  // History request
  if (params.history) {
    const count = Math.min(parseInt(params.history) || 5, 50);
    const carName = params.car || null;
    const items = getHistory_(sheet, count, carName);
    return jsonOutput_({ items });
  }

  // Latest position
  if (lastRow < 2) {
    return jsonOutput_({});
  }

  const carName = params.car || null;
  const row = getLatestRow_(sheet, carName);
  if (!row) return jsonOutput_({});

  return jsonOutput_({
    latitude:  row[0],
    longitude: row[1],
    updatedBy: row[2],
    updatedAt: row[3],
    carName:   row[4] || ''
  });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);

    // Add new car to CarList
    if (body.action === 'addCar') {
      if (!body.carName || !body.carName.trim()) {
        return jsonOutput_({ success: false, error: 'Missing carName' });
      }
      addCarToList_(body.carName.trim());
      return jsonOutput_({ success: true, cars: getCarList_() });
    }

    // Save location
    const sheet = getSheet_();
    if (body.latitude === undefined || body.longitude === undefined || !body.updatedBy) {
      return jsonOutput_({ success: false, error: 'Missing latitude, longitude, or updatedBy' });
    }

    sheet.appendRow([
      Number(body.latitude),
      Number(body.longitude),
      String(body.updatedBy),
      new Date().toISOString(),
      String(body.carName || '')
    ]);

    return jsonOutput_({ success: true });
  } catch (err) {
    return jsonOutput_({ success: false, error: String(err) });
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function getLatestRow_(sheet, carName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  if (!carName) {
    const vals = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
    return vals;
  }
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][4]).toLowerCase() === carName.toLowerCase()) return data[i];
  }
  return null;
}

function getHistory_(sheet, count, carName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues().reverse();
  const filtered = carName
    ? data.filter(r => String(r[4]).toLowerCase() === carName.toLowerCase())
    : data;
  return filtered.slice(0, count).map(r => ({
    latitude:  r[0],
    longitude: r[1],
    updatedBy: r[2],
    updatedAt: r[3],
    carName:   r[4] || ''
  }));
}

function getCarList_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CAR_LIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CAR_LIST_SHEET);
    sheet.getRange(1, 1).setValue('carName');
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(Boolean);
}

function addCarToList_(carName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CAR_LIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CAR_LIST_SHEET);
    sheet.getRange(1, 1).setValue('carName');
  }
  // Avoid duplicates (case-insensitive)
  const existing = getCarList_().map(c => c.toLowerCase());
  if (!existing.includes(carName.toLowerCase())) {
    sheet.appendRow([carName]);
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
  }
  return sheet;
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
