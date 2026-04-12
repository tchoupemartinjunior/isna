/***********************************
 * 📌 StaffService
 ***********************************/
const StaffService = (() => {
  
  /**
   * 🔹 Construit une map { nom staff normalisé -> téléphone }
   * @returns {Object} Map des noms normalisés vers numéro de téléphone
   */
  function construireStaffPhoneMap() {
    const map = {};
    const staffSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Staff_phoning");
    const staff = staffSheet.getRange('A2:D').getValues(); // C = tel, D = nom complet

    for (let i = 0; i < staff.length; i++) {
      const nom = normaliserNom(staff[i][3]); // colonne D
      const tel = staff[i][2];
      if (nom && tel) {
        map[nom] = tel;
      }
    }
    return map;
  }

  /**
 * 🔹 Construit une map { nom staff normalisé -> { tel, email } }
 * @returns {Object} Map des noms normalisés vers { tel, email }
 */
function construireStaffMap() {
  const map = {};
  const staffSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Staff_phoning");

  // ⚠️ suppose la structure :
  // Colonne C = téléphone
  // Colonne D = nom complet
  // Colonne E = email (à ajuster selon ton fichier)
  const staff = staffSheet.getRange('A2:E').getValues();

  for (let i = 0; i < staff.length; i++) {
    const nom = normaliserNom(staff[i][3]); // colonne D : Nom complet
    const tel = staff[i][2];                // colonne C : Téléphone
    const email = staff[i][4];              // colonne E : Email

    if (nom && (tel || email)) {
      map[nom] = {
        tel: tel || null,
        email: email || null
      };
    }
  }
  return map;
}


  return {
    construireStaffPhoneMap,
    construireStaffMap
  };

})();
