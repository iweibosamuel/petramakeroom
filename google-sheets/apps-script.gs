/**
 * Petra "Make Room" giving → Google Sheet sync.
 *
 * Paste this into the sheet's Extensions → Apps Script editor and deploy it
 * as a web app (see google-sheets/README.md). The website POSTs each
 * submission here as JSON:
 *
 *   { token, sheet, id, row: { "Header": value, ... } }
 *
 * Each record is upserted by its ID (the first column): an existing row is
 * updated in place, otherwise a new row is appended. Tabs and header columns
 * are created automatically, and new columns are added if the site starts
 * sending extra fields.
 */

const ALLOWED_SHEETS = ["Pledges", "Payments", "Groups", "Group members"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const payload = JSON.parse(e.postData.contents);

    const expectedToken = PropertiesService.getScriptProperties().getProperty("SHEET_TOKEN");
    if (expectedToken && payload.token !== expectedToken) {
      return respond({ ok: false, error: "bad token" });
    }
    if (ALLOWED_SHEETS.indexOf(payload.sheet) === -1 || !payload.id || !payload.row) {
      return respond({ ok: false, error: "bad payload" });
    }

    upsertRow(payload.sheet, String(payload.id), payload.row);
    return respond({ ok: true });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function upsertRow(sheetName, id, row) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  const fields = Object.keys(row);

  // Make sure every field has a header column, adding any new ones.
  let headers =
    sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];
  const missing = fields.filter((field) => headers.indexOf(field) === -1);
  if (missing.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  // Find this record's row by the ID in column A.
  let rowIndex = -1;
  if (sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) {
        rowIndex = i + 2;
        break;
      }
    }
  }
  if (rowIndex === -1) rowIndex = sheet.getLastRow() + 1;

  const existing =
    rowIndex <= sheet.getLastRow()
      ? sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]
      : headers.map(() => "");
  const values = headers.map((header, i) =>
    Object.prototype.hasOwnProperty.call(row, header) ? row[header] : existing[i],
  );
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
}

function respond(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
