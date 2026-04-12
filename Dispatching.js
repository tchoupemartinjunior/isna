/***
 * Dispatching.js - Main Entry Point
 * Orchestration of phoning actions
 ***/

function onOpen() {
  PhoningUIModule.initializeMenu();
}

function genererLiensWhatsAppNormaux() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    WhatsAppService.generateWhatsAppLinks(config, repository, false);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('WhatsApp links generated successfully');
    PhoningUIModule.showSuccessMessage('WhatsApp links generated successfully');
  } catch (error) {
    Logger.log(`Error generating WhatsApp links: ${error.message}`);
    PhoningUIModule.showErrorDialog('Error', error.message);
  }
}

function genererLiensWhatsAppRappels() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    WhatsAppService.generateWhatsAppLinks(config, repository, true);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('WhatsApp reminders generated successfully');
  } catch (error) {
    Logger.log(`Error generating WhatsApp reminders: ${error.message}`);
    PhoningUIModule.showErrorDialog('Error', error.message);
  }
}

function envoyerDispatchingParMail() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    PhoningEmailService.sendDispatchingEmails(config, repository);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('Dispatching emails sent successfully');
    PhoningUIModule.showSuccessMessage('Dispatching emails sent successfully');
  } catch (error) {
    Logger.log(`Error sending dispatching emails: ${error.message}`);
    PhoningUIModule.showErrorDialog('Error', error.message);
  }
}
