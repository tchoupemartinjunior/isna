function transferIntegratedRowstoDB() {
  const SOURCE_SHEET_NAME = "Phoning";
  const TARGET_SHEET_NAME = "Base_de_donnees";

  const COL_STATUT_INTEGRATION_SRC = 5; // G
  const COL_NOM_SRC = 7;                // H
  const COL_PRENOM_SRC = 8;             // I
  const COL_TELEPHONE_SRC = 9;          // J

  const COL_NOM_TGT = 1;                // B
  const COL_PRENOM_TGT = 2;             // C
  const COL_TELEPHONE_TGT = 4;          // E

  const COLUMNS_TO_SKIP_SRC = [2, 3, 4, 5, 6, 20];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);
  const targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);

  const sourceData = sourceSheet.getDataRange().getValues();
  const targetData = targetSheet.getDataRange().getValues();

  // Construire un set de clés existantes dans la cible
  const targetKeySet = new Set();
  targetData.slice(1).forEach(row => {
    const key = [
      (row[COL_NOM_TGT] || "").toString().trim().toLowerCase(),
      (row[COL_PRENOM_TGT] || "").toString().trim().toLowerCase(),
      (row[COL_TELEPHONE_TGT] || "").toString().trim().toLowerCase()
    ].join("|");
    targetKeySet.add(key);
  });

  // Filtrer les lignes "Intégré" et non présentes dans la cible
  const integratedRows = [];
  sourceData.slice(1).forEach((row, i) => {
    const statut = (row[COL_STATUT_INTEGRATION_SRC] || "").toString().trim().toLowerCase();
    const nom = (row[COL_NOM_SRC] || "").toString().trim();
    const prenom = (row[COL_PRENOM_SRC] || "").toString().trim();
    const tel = (row[COL_TELEPHONE_SRC] || "").toString().trim();

    if (statut === "intégré" && (nom || prenom || tel)) {
      const key = [nom.toLowerCase(), prenom.toLowerCase(), tel.toLowerCase()].join("|");
      if (!targetKeySet.has(key)) {
        integratedRows.push({ row, sourceIndex: i + 1 });
        targetKeySet.add(key);
      }
    }
  });

  if (integratedRows.length === 0) {
    Logger.log("Aucune nouvelle ligne 'Intégré' à ajouter.");
    return;
  }

  // Ajouter les nouvelles lignes à la fin de la cible
  integratedRows.forEach(item => {
    const rowToInsert = item.row.map((val, idx) => COLUMNS_TO_SKIP_SRC.includes(idx) ? "" : val);
    while (rowToInsert.length < targetSheet.getLastColumn()) rowToInsert.push("");
    targetSheet.appendRow(rowToInsert);

    // Mettre à jour le statut dans la source
    sourceSheet.getRange(item.sourceIndex, COL_STATUT_INTEGRATION_SRC + 1).setValue("Ajouté en bdd");
  });

  Logger.log(`${integratedRows.length} ligne(s) 'Intégré' ajoutée(s) à la base.`);
}


