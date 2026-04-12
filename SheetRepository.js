
const SheetRepository = (function () {
    const DEFAULT_HEADER_ROW = 1;
    const DEFAULT_START_ROW = DEFAULT_HEADER_ROW + 1;
    const DEFAULT_START_COL = 1;

    /**
     * Initialise le repository avec un spreadsheet
     * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Sheet Google à utiliser
     */
    function create(spreadsheet) {
        if (!spreadsheet) {
            spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        }

        return {
            /**
             * Récupère une feuille par son nom
             * @param {string} sheetName - Nom de la feuille
             * @returns {SpreadsheetApp.Sheet}
             * @throws {Error} Si la feuille n'existe pas
             */
            getSheet(sheetName) {
                const sheet = spreadsheet.getSheetByName(sheetName);
                if (!sheet) {
                    throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
                }
                return sheet;
            },

            /**
             * Récupère toutes les données d'une feuille
             * @param {string} sheetName - Nom de la feuille
             * @param {number} headerRow - Numéro de la ligne d'en-tête (défaut: 1)
             * @param {number} numCols - Nombre de colonnes à récupérer
             * @returns {Array<Array>} Lignes de données
             */
            getData(sheetName, headerRow = DEFAULT_HEADER_ROW, numCols = null) {
                const sheet = this.getSheet(sheetName);
                const lastRow = sheet.getLastRow();

                if (lastRow <= headerRow) {
                    return [];
                }

                const numRows = lastRow - headerRow;
                const cols = numCols || sheet.getLastColumn();

                return sheet.getRange(DEFAULT_START_ROW + headerRow - 1, DEFAULT_START_COL, numRows, cols).getValues();
            },

            /**
             * Récupère une plage spécifique
             * @param {string} sheetName - Nom de la feuille
             * @param {string} rangeNotation - Notation plage (ex: "A1:Z100")
             * @returns {SpreadsheetApp.Range}
             */
            getRange(sheetName, rangeNotation) {
                const sheet = this.getSheet(sheetName);
                return sheet.getRange(rangeNotation);
            },

            /**
             * Écrit une valeur dans une cellule
             * @param {string} sheetName - Nom de la feuille
             * @param {number} row - Numéro de ligne
             * @param {number} col - Numéro de colonne
             * @param {any} value - Valeur à écrire
             */
            setValue(sheetName, row, col, value) {
                const sheet = this.getSheet(sheetName);
                sheet.getRange(row, col).setValue(value);
            },

            /**
             * Écrit une formule dans une cellule
             * @param {string} sheetName - Nom de la feuille
             * @param {number} row - Numéro de ligne
             * @param {number} col - Numéro de colonne
             * @param {string} formula - Formule à écrire (ex: "=HYPERLINK(...)")
             */
            setFormula(sheetName, row, col, formula) {
                const sheet = this.getSheet(sheetName);
                sheet.getRange(row, col).setFormula(formula);
            },

            /**
             * Ajoute une ligne à une feuille
             * @param {string} sheetName - Nom de la feuille
             * @param {Array} rowValues - Valeurs de la ligne
             * @returns {number} Numéro de la ligne ajoutée
             */
            appendRow(sheetName, rowValues) {
                const sheet = this.getSheet(sheetName);
                sheet.appendRow(rowValues);
                return sheet.getLastRow();
            },

            /**
             * Récupère le dernier numéro de ligne
             * @param {string} sheetName - Nom de la feuille
             * @returns {number}
             */
            getLastRow(sheetName) {
                const sheet = this.getSheet(sheetName);
                return sheet.getLastRow();
            },

            /**
             * Récupère le dernier numéro de colonne
             * @param {string} sheetName - Nom de la feuille
             * @returns {number}
             */
            getLastColumn(sheetName) {
                const sheet = this.getSheet(sheetName);
                return sheet.getLastColumn();
            }
        };
    }

    return {
        create
    };
})();
