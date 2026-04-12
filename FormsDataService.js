/**
 * ============================
 * FormsDataService
 * ============================
 * Service centralisé pour la gestion des données et mise à jour des formulaires
 * Utilisé par : SuiviDePresence.js et Compte_rendus_phoning.gs.js
 */

const FormsDataService = {
    /**
     * Récupère la liste des personnes en fonction de leur statut (sans doublon, triée)
     * @param {SpreadsheetApp.Spreadsheet} spreadsheet
     * @param {string} statut - Le statut à filtrer (ex: 'A contacter', 'En Cours')
     * @returns {string[]}
     */
    getPersonnesByStatut(spreadsheet, statut) {
        const config = ConfigService.getSheet('PHONING');
        const sheet = spreadsheet.getSheetByName(config.NAME);
        const rows = sheet.getRange(config.RANGE_FOR_FORMS).getValues();
        const filteredRow = rows
            .filter(row => row[config.INDEX_FOR_FORMS.STATUT] === statut)
            .map(row => row[config.INDEX_FOR_FORMS.PERSONNE]);

        return this.getUniqueSortedValues(filteredRow);
    },

    /**
     * Récupère la liste des membres du staff phoning (sans doublon, triée)
     * @param {SpreadsheetApp.Spreadsheet} spreadsheet
     * @returns {string[]}
     */
    getStaffPhoning(spreadsheet) {
        const config = ConfigService.getSheet('STAFF_PHONING');
        const sheet = spreadsheet.getSheetByName(config.NAME);
        const values = sheet
            .getRange(config.RANGE)
            .getValues()
            .flat()
            .filter(Boolean);

        return this.getUniqueSortedValues(values);
    },

    /**
     * Met à jour plusieurs questions LIST d'un formulaire
     * @param {FormApp.Form} form
     * @param {Object<number, string[]>} questionChoicesMap - Map des indices de questions vers leurs choix
     */
    mettreAJourQuestionsListe(form, questionChoicesMap) {
        const listItems = form.getItems(FormApp.ItemType.LIST);

        listItems.forEach(item => {
            const listItem = item.asListItem();
            const questionIndex = listItem.getIndex();

            if (questionChoicesMap[questionIndex]) {
                listItem.setChoiceValues(questionChoicesMap[questionIndex]);
            }
        });
    },

    /**
     * Supprime les doublons, trie et nettoie un tableau
     * @param {any[]} values
     * @returns {string[]}
     */
    getUniqueSortedValues(values) {
        return [...new Set(values)]
            .filter(Boolean)
            .sort((a, b) => a.toString().localeCompare(b.toString(), 'fr', { sensitivity: 'base' }));
    }
};
