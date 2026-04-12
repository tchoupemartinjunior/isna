const StaffService = (() => {
  const CONFIG = {
    SHEET_NAME: 'Staff_phoning',
    RANGE: 'A2:E',
    COL_NAME: 3,      // Colonne D (0-indexed)
    COL_PHONE: 2,     // Colonne C (0-indexed)
    COL_EMAIL: 4      // Colonne E (0-indexed)
  };

  /**
   * Récupère les données staff brutes depuis la feuille
   * @private
   * @returns {Array<Array>} Lignes de données staff
   */
  function getStaffData() {
    try {
      const staffSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
      return staffSheet.getRange(CONFIG.RANGE).getValues();
    } catch (error) {
      Logger.log(`Error fetching staff data: ${error.message}`);
      return [];
    }
  }

  /**
   * Construit une map { nom staff normalisé -> téléphone }
   * @returns {Object} Map des noms normalisés vers numéro de téléphone
   */
  function construireStaffPhoneMap() {
    const map = {};
    const staff = getStaffData();

    for (let i = 0; i < staff.length; i++) {
      const nom = StringNormalizer.normalizeName(staff[i][CONFIG.COL_NAME]);
      const tel = staff[i][CONFIG.COL_PHONE];

      if (nom && tel) {
        map[nom] = tel;
      }
    }

    Logger.log(`Staff phone map built with ${Object.keys(map).length} entries`);
    return map;
  }

  /**
   * Construit une map { nom staff normalisé -> { tel, email } }
   * @returns {Object} Map des noms normalisés vers { tel, email }
   */
  function construireStaffMap() {
    const map = {};
    const staff = getStaffData();

    for (let i = 0; i < staff.length; i++) {
      const nom = StringNormalizer.normalizeName(staff[i][CONFIG.COL_NAME]);
      const tel = staff[i][CONFIG.COL_PHONE];
      const email = staff[i][CONFIG.COL_EMAIL];

      if (nom && (tel || email)) {
        map[nom] = {
          tel: tel || null,
          email: email || null
        };
      }
    }

    Logger.log(`Staff map built with ${Object.keys(map).length} entries`);
    return map;
  }

  return {
    construireStaffPhoneMap,
    construireStaffMap
  };

})();

