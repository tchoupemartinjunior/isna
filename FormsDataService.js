const FormsDataService = {
    /**
     * Récupère la liste des personnes en fonction de leur statut (sans doublon, triée)
     * @param {SpreadsheetApp.Spreadsheet} spreadsheet
     * @param {string} statut - Le statut à filtrer (ex: 'A contacter', 'En Cours')
     * @param {string} statusType - Type de statut: 'STATUT_PHONING' (défaut) ou 'STATUT_INTEGRATION'
     * @returns {string[]}
     */
    getPersonnesByStatut(spreadsheet, statut, statusType = 'STATUT_PHONING') {
        const config = ConfigService.getSheet('PHONING');
        const sheet = spreadsheet.getSheetByName(config.NAME);
        const rows = sheet.getRange(config.RANGE_FOR_FORMS).getValues();
        const statusColumnIndex = config.INDEX_FOR_FORMS[statusType];
        const filteredRow = rows
            .filter(row => row[statusColumnIndex] === statut)
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
     * Met à jour plusieurs questions LIST et CHECKBOX d'un formulaire
     * @param {FormApp.Form} form
     * @param {Object<number, string[]>} questionChoicesMap - Map des indices de questions vers leurs choix
     */
    mettreAJourQuestionsListe(form, questionChoicesMap) {
        // Traite les questions de type LIST
        const listItems = form.getItems(FormApp.ItemType.LIST);
        listItems.forEach(item => {
            const listItem = item.asListItem();
            const questionIndex = listItem.getIndex();

            if (questionChoicesMap[questionIndex]) {
                listItem.setChoiceValues(questionChoicesMap[questionIndex]);
            }
        });

        // Traite les questions de type CHECKBOX
        const checkboxItems = form.getItems(FormApp.ItemType.CHECKBOX);
        checkboxItems.forEach(item => {
            const checkboxItem = item.asCheckboxItem();
            const questionIndex = checkboxItem.getIndex();

            if (questionChoicesMap[questionIndex]) {
                checkboxItem.setChoiceValues(questionChoicesMap[questionIndex]);
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
