const PhoningUIModule = (function () {
    const UI_TITLE = 'Actions Intégration ICC Le Mans';

function initializeMenu() {
    try {
        const ui = SpreadsheetApp.getUi();

        ui.createMenu(UI_TITLE)
            .addItem('Générer les messages WhatsApp', 'genererLiensWhatsAppNormaux')
            .addItem('Générer les invitations FI / FIJ (WhatsApp)', 'genererInvitationsFamilles')
            .addItem('Envoyer le dispatching par e-mail', 'envoyerDispatchingParMail')
            .addItem('Ajouter les personnes intégrées à la base de données', 'transferIntegratedRowstoDB')
            .addItem('Nettoyer / migrer la base de données', 'migrerBaseDeDonnees')
            .addItem('Mettre à jour la liste des contacts', 'mettreAJourListesCompteRenduPhoning')
            .addSeparator()
            .addSubMenu(ui.createMenu('Automatisation')
                .addItem('Traiter les nouveaux visiteurs maintenant', 'traiterNouveauxVisiteursMaintenant')
                .addItem('Mettre à jour la table des quartiers', 'mettreAJourTableQuartiers')
                .addSeparator()
                .addItem('Activer (à chaque formulaire d\'accueil)', 'activerAutomatisation')
                .addItem('Désactiver', 'desactiverAutomatisation'))
            .addToUi();

        Logger.log('Menu initialisé avec succès');
    } catch (error) {
        Logger.log(`Erreur lors de l'initialisation du menu : ${error.message}`);
    }
}

    function showErrorDialog(title, message) {
        try {
            const ui = SpreadsheetApp.getUi();
            ui.alert(title, message, ui.ButtonSet.OK);
        } catch (error) {
            Logger.log(`Error showing dialog: ${error.message}`);
        }
    }

    function showSuccessMessage(message) {
        try {
            const ui = SpreadsheetApp.getUi();
            ui.alert('Succès', message, ui.ButtonSet.OK);
        } catch (error) {
            Logger.log(`Error showing success: ${error.message}`);
        }
    }

    return {
        initializeMenu,
        showErrorDialog,
        showSuccessMessage
    };
})();
