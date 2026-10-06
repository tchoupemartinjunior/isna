const WhatsAppService = (function () {
    const DAYS_BEFORE_CONTACT_RECENT = 7;
    const STATUS_A_CONTACTER = 'A contacter';
    const STATUS_EFFECTUE = 'Effectué';

    /**
     * Génère les liens WhatsApp pour tous les contacts "A contacter".
     * Lecture en un bloc, calcul en mémoire, écriture en un bloc par colonne.
     * @param {Object} config - { ONGLETS, COLONNES, NUM_COLS }
     * @param {SheetRepository} repository
     * @param {boolean} isRappel
     * @returns {{liens:number, effectues:number, erreurs:number}}
     */
    function generateWhatsAppLinks(config, repository, isRappel = false) {
        if (!config || !repository) {
            throw new Error('Configuration and repository are required');
        }
        const C = config.COLONNES;
        const sheet = repository.getSheet(config.ONGLETS.PHONING);
        const nbRows = sheet.getLastRow() - 1;
        const stats = { liens: 0, effectues: 0, erreurs: 0 };
        if (nbRows <= 0) return stats;

        const data = sheet.getRange(2, 1, nbRows, config.NUM_COLS).getValues();

        // Colonnes à réécrire : on part de l'existant (formules conservées)
        const lienRange = sheet.getRange(2, C.LIEN_WHATSAPP, nbRows, 1);
        const lienFormulas = lienRange.getFormulas();
        const lienOut = data.map((row, i) => [lienFormulas[i][0] || row[C.LIEN_WHATSAPP - 1]]);
        const statutOut = data.map(row => [row[C.STATUT_PHONING - 1]]);
        let lienChange = false;
        let statutChange = false;

        const staffPhoneMap = StaffService.construireStaffPhoneMap();
        const linkText = isRappel ? 'Envoyer RAPPEL WhatsApp' : 'Envoyer Message WhatsApp';

        data.forEach((row, i) => {
            if (!StringNormalizer.areEqual(row[C.STATUT_PHONING - 1], STATUS_A_CONTACTER)) return;

            const staffNom = StringNormalizer.normalizeName(row[C.STAFF_PHONING - 1]);
            const personneNom = row[C.PERSONNE_A_CONTACTER - 1];
            const historique = HistoriqueService.getHistorique(personneNom);

            if (HistoriqueService.aEteContacteRecemment(historique, staffNom, DAYS_BEFORE_CONTACT_RECENT)) {
                statutOut[i][0] = STATUS_EFFECTUE;
                statutChange = true;
                stats.effectues++;
                return;
            }

            const telStaff = PhoneUtils.toWhatsApp(staffPhoneMap[staffNom]);
            if (!telStaff) {
                lienOut[i][0] = 'Téléphone staff non trouvé';
                lienChange = true;
                stats.erreurs++;
                return;
            }

            const url = `https://wa.me/${telStaff}?text=${MessageService.construireMessage(row, isRappel)}`;
            lienOut[i][0] = `=HYPERLINK("${url.replace(/"/g, '""')}"; "${linkText}")`;
            lienChange = true;
            stats.liens++;
        });

        if (lienChange) lienRange.setValues(lienOut);
        if (statutChange) sheet.getRange(2, C.STATUT_PHONING, nbRows, 1).setValues(statutOut);

        Logger.log(`WhatsApp : ${stats.liens} lien(s), ${stats.effectues} marqué(s) "${STATUS_EFFECTUE}", ${stats.erreurs} erreur(s)`);
        return stats;
    }

    /** @deprecated utiliser PhoneUtils.toWhatsApp */
    function normalizePhoneNumber(phone) {
        return PhoneUtils.toWhatsApp(phone);
    }

    return {
        generateWhatsAppLinks,
        normalizePhoneNumber,
        STATUS_A_CONTACTER,
        STATUS_EFFECTUE
    };
})();
