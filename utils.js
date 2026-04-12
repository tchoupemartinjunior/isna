function getConstants() {
  return {
    STATUS_A_CONTACTER: ConfigService.getStatut().A_CONTACTER,
    COLONNES: ConfigService.getSheet('PHONING').COLONNES,
    ONGLETS: ConfigService.get().ONGLET
  };
}

function getSheetDataAsObjects(sheetName,numCols) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  const lastRow = sheet.getLastRow();
  const lastCol = numCols;

  // Lire l'en-tête (1ère ligne)
  const rawHeaders = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  const headers = normaliserHeaders(rawHeaders);

  // Lire toutes les lignes de données (depuis la ligne 2)
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // Transformer chaque ligne en objet {Header1: valeur1, Header2: valeur2, ...}
  const data = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  return data;
}

function normaliserHeaders(headers) {
  return headers.map(h => normaliserRow(h));
}

function normaliserRow(header) {
  if (!header) return "";

  // Supprimer espaces début/fin
  header = header.trim();

  // Remplacer espaces, apostrophes, tirets par _
  header = header.replace(/[ \'\-–]/g, "_");

  // Supprimer caractères spéciaux non alphanumériques
  header = header.replace(/[^\w]/g, "");

  return header;
}
