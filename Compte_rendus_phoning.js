/**
 * ============================
 * FONCTION PRINCIPALE
 * ============================
 */
function mettreAJourListesCompteRenduPhoning() {
  const formConfig = ConfigService.getForm('COMPTE_RENDU_PHONING');
  const form = FormApp.openById(formConfig.ID);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const personnesAContacter = FormsDataService.getPersonnesByStatut(spreadsheet, ConfigService.getStatut().A_CONTACTER);
  const staffPhoning = FormsDataService.getStaffPhoning(spreadsheet);

  FormsDataService.mettreAJourQuestionsListe(form, {
    [formConfig.QUESTIONS.PERSONNE_A_CONTACTER]: personnesAContacter,
    [formConfig.QUESTIONS.PERSONNE_QUI_CONTACTE]: staffPhoning
  });
}

/**
 * NOTES : Les fonctions suivantes sont centralisees dans FormsDataService.js
 * - getPersonnesAContacter(spreadsheet)
 * - getStaffPhoning(spreadsheet)
 * - mettreAJourQuestionsListe(form, questionChoicesMap)
 * - getUniqueSortedValues(values)
 */
