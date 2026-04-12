const PhoningUIModule = (function () {
    const UI_TITLE = 'Actions Intégration ICC Le Mans';

    function initializeMenu() {
        try {
            const ui = SpreadsheetApp.getUi();

            ui.createMenu(UI_TITLE)
                .addItem('Generate WhatsApp messages', 'genererLiensWhatsAppNormaux')
                .addItem('Send Dispatching by Email', 'envoyerDispatchingParMail')
                .addItem('Add integrated people to database', 'transferIntegratedRowstoDB')
                .addItem('Update contacts list', 'mettreAJourListesCompteRenduPhoning')
                .addToUi();

            Logger.log('Menu initialized successfully');
        } catch (error) {
            Logger.log(`Error initializing menu: ${error.message}`);
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
            ui.alert('Success', message, ui.ButtonSet.OK);
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
