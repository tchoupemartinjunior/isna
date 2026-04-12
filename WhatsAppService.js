/**
 * ============================
 * WhatsAppService
 * ============================
 * Gère la génération des liens WhatsApp
 * Responsabilité unique: Logique WhatsApp
 * ============================
 */

const WhatsAppService = (function () {
    const DAYS_BEFORE_CONTACT_RECENT = 7;
    const STATUS_A_CONTACTER = 'A contacter';
    const STATUS_EFFECTUE = 'Effectué';

    /**
     * Génère les liens WhatsApp pour tous les contacts
     * @param {Object} config - Configuration avec ONGLETS, COLONNES
     * @param {SheetRepository} repository - Repository pour accès aux données
     * @param {boolean} isRappel - Si c'est un rappel (défaut: false)
     */
    function generateWhatsAppLinks(config, repository, isRappel = false) {
        if (!config || !repository) {
            throw new Error('Configuration and repository are required');
        }

        try {
            const sheet = repository.getSheet(config.ONGLETS.PHONING);
            const data = repository.getData(config.ONGLETS.PHONING, 1, config.NUM_COLS || 22);

            // Préparer la map téléphones staff
            const staffPhoneMap = StaffService.construireStaffPhoneMap();

            // Traiter chaque ligne
            for (let i = 0; i < data.length; i++) {
                const rowIndex = i + 2; // +2 car index est 0-based et ligne 1 est header
                const row = data[i];

                processRow(
                    sheet,
                    rowIndex,
                    row,
                    config.COLONNES,
                    staffPhoneMap,
                    isRappel
                );
            }

            Logger.log(`WhatsApp links generated. Total rows processed: ${data.length}`);
        } catch (error) {
            Logger.log(`Error generating WhatsApp links: ${error.message}`);
            throw error;
        }
    }

    /**
     * Traite une ligne pour générer un lien WhatsApp
     * @private
     */
    function processRow(sheet, rowIndex, row, colonnes, staffPhoneMap, isRappel) {
        const statut = row[colonnes.STATUT_PHONING - 1];

        // Vérifie si le statut est "A contacter"
        if (!StringNormalizer.areEqual(statut, STATUS_A_CONTACTER)) {
            return;
        }

        const staffNom = StringNormalizer.normalizeName(row[colonnes.STAFF_PHONING - 1]);
        const personneNom = row[colonnes.PERSONNE_A_CONTACTER - 1];

        // Vérifie si la personne a été contactée récemment
        const historique = HistoriqueService.getHistorique(personneNom);
        if (HistoriqueService.aEteContacteRecemment(
            historique,
            staffNom,
            DAYS_BEFORE_CONTACT_RECENT
        )) {
            sheet.getRange(rowIndex, colonnes.STATUT_PHONING).setValue(STATUS_EFFECTUE);
            Logger.log(`Row ${rowIndex}: Marked as "${STATUS_EFFECTUE}" (recently contacted)`);
            return;
        }

        // Récupère le téléphone du staff
        const telStaff = staffPhoneMap[staffNom];
        if (!telStaff) {
            sheet.getRange(rowIndex, colonnes.LIEN_WHATSAPP)
                .setValue('Téléphone staff non trouvé');
            Logger.log(`Row ${rowIndex}: Phone not found for staff "${staffNom}"`);
            return;
        }

        // Génère et écrit le lien WhatsApp
        const whatsappLink = buildWhatsAppLink(row, telStaff, isRappel);
        const linkText = isRappel ? 'Envoyer RAPPEL WhatsApp' : 'Envoyer Message WhatsApp';

        try {
            const formula = `=HYPERLINK("${whatsappLink}"; "${linkText}")`;
            sheet.getRange(rowIndex, colonnes.LIEN_WHATSAPP).setFormula(formula);
            Logger.log(`Row ${rowIndex}: WhatsApp link generated`);
        } catch (error) {
            Logger.log(`Row ${rowIndex}: Error setting WhatsApp link: ${error.message}`);
        }
    }

    /**
     * Construit une URL WhatsApp
     * @private
     */
    function buildWhatsAppLink(row, telStaff, isRappel) {
        const message = MessageService.construireMessage(row, isRappel);
        return `https://wa.me/${telStaff}?text=${message}`;
    }

    /**
     * Normalise un numéro de téléphone pour envoi WhatsApp
     * @param {string} phone - Numéro de téléphone
     * @returns {string} Numéro normalisé sans caractères non-numériques
     */
    function normalizePhoneNumber(phone) {
        if (!phone) return '';
        return phone.toString().replace(/\D/g, '').replace(/^0/, '');
    }

    return {
        generateWhatsAppLinks,
        normalizePhoneNumber,
        STATUS_A_CONTACTER,
        STATUS_EFFECTUE
    };
})();
