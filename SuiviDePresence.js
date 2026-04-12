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


