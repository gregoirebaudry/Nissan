const SHEET_NAME = 'CarLocation';
const HEADER = ['latitude', 'longitude', 'updatedBy', 'updatedAt'];

function doGet() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonOutput_({});
  }

  const values = sheet.getRange(lastRow, 1, 1, 4).getValues()[0];
  const payload = {
    latitude: values[0],
    longitude: values[1],
    updatedBy: values[2],
    updatedAt: values[3]
  };

  return jsonOutput_(payload);
}

function doPost(e) {
  try {
    const sheet = getSheet_();
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);

    if (body.latitude === undefined || body.longitude === undefined || !body.updatedBy) {
      return jsonOutput_({
        success: false,
        error: 'Missing latitude, longitude, or updatedBy'
      });
    }

    sheet.appendRow([
      Number(body.latitude),
      Number(body.longitude),
      String(body.updatedBy),
      new Date().toISOString()
    ]);

    return jsonOutput_({ success: true });
  } catch (err) {
    return jsonOutput_({
      success: false,
      error: String(err)
    });
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
