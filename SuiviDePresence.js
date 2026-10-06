/**
 * ============================
 * FONCTION PRINCIPALE
 * ============================
 */
function mettreAJourListesDuSuivi() {
  const config = ConfigService.get();
  const formId = config.FORMS.SUIVI.ID;
  const form = FormApp.openById(formId);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const personnesASuivre = FormsDataService.getPersonnesByStatut(spreadsheet, ConfigService.getStatut().EN_COURS, 'STATUT_INTEGRATION');
  const staffPhoning = FormsDataService.getStaffPhoning(spreadsheet);

  FormsDataService.mettreAJourQuestionsListe(form, {
    [config.FORMS.SUIVI.QUESTIONS.PERSONNE_SUIVIE]: personnesASuivre,
    [config.FORMS.SUIVI.QUESTIONS.MEMBRE_STAFF]: staffPhoning
  });
}

/**
 * NOTES : Les fonctions suivantes sont centralisees dans FormsDataService.js
 * - getPersonnesAContacter(spreadsheet)
 * - getStaffPhoning(spreadsheet)
 * - mettreAJourQuestionsListe(form, questionChoicesMap)
 * - getUniqueSortedValues(values)
 */
