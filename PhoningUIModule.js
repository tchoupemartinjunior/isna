/**
 * ============================
 * PhoningUIModule
 * ============================
 * Gère l'interface utilisateur (Menu, affichage)
 * Responsabilité unique: UI
 * ============================
 */

const PhoningUIModule = (function () {
    const UI_TITLE = 'Actions Intégration ICC Le Mans';

    /**
     * Initialise le menu dans Google Sheets
     */
    function initializeMenu() {
        try {
            const ui = SpreadsheetApp.getUi();

            ui.createMenu(UI_TITLE)
                .addItem('📲 Générer les messages Whatsapp', 'genererLiensWhatsAppNormaux')
                .addItem('📧 Envoyer Dispatching par Mail', 'envoyerDispatchingParMail')
                .addItem('➕ Ajouter les personnes intégrées en Base de données', 'transferIntegratedRowstoDB')
                .addItem('📝 CR - Mettre à jour la liste des personnes à contacter', 'mettreAJourListesCompteRenduPhoning')
                .addToUi();

            Logger.log('Menu initialized successfully');
        } catch (error) {
            Logger.log(`Error initializing menu: ${error.message}`);
        }
    }

    /**
     * Affiche un message d'erreur à l'utilisateur
     * @param {string} title - Titre du message
     * @param {string} message - Texte du message
     */
    function showErrorDialog(title, message) {
        try {
            const ui = SpreadsheetApp.getUi();
            ui.alert(title, message, ui.ButtonSet.OK);
        } catch (error) {
            Logger.log(`Error showing dialog: ${error.message}`);
        }
    }

    /**
     * Affiche un message de succès
     * @param {string} message - Texte du message
     */
    function showSuccessMessage(message) {
        try {
            const ui = SpreadsheetApp.getUi();
            ui.alert('✅ Succès', message, ui.ButtonSet.OK);
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
