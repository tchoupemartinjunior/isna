/***********************************
 * 📌 Dispatching.js - Main Entry Point
 * Orchestration des actions phoning
 * Logique déléguée aux services spécialisés
 ***********************************/

/**
 * Point d'entrée: Initialisation du menu au démarrage
 */
function onOpen() {
  PhoningUIModule.initializeMenu();
}

/**
 * Action: Générer les liens WhatsApp pour appels normaux
 */
function genererLiensWhatsAppNormaux() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    WhatsAppService.generateWhatsAppLinks(config, repository, false);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('✅ WhatsApp links generated successfully');
  } catch (error) {
    Logger.log(`❌ Error generating WhatsApp links: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

/**
 * Action: Générer les rappels WhatsApp
 */
function genererLiensWhatsAppRappels() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    WhatsAppService.generateWhatsAppLinks(config, repository, true);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('✅ WhatsApp reminders generated successfully');
  } catch (error) {
    Logger.log(`❌ Error generating WhatsApp reminders: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

/**
 * Action: Envoyer le dispatching par email
 */
function envoyerDispatchingParMail() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    PhoningEmailService.sendDispatchingEmails(config, repository);
    mettreAJourListesCompteRenduPhoning();

    Logger.log('✅ Dispatching emails sent successfully');
    PhoningUIModule.showSuccessMessage('Les emails de dispatching ont été envoyés avec succès.');
  } catch (error) {
    Logger.log(`❌ Error sending dispatching emails: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}
