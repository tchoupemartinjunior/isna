/**
 * Service pour gérer l'historique des phoning
 */
const HistoriqueService = (() => {

  // ===== CONFIGURATION =====
  const CONFIG = {
    SHEET_NAME: 'Compte_rendu_Phoning',
    NB_COLUMNS: 9,
    COLUMNS_INDEX: {
      HORODATEUR: 0,
      APPELANT: 1,
      PERSONNE_CONTACTEE: 2,
      DATE: 3,
      HEURE: 4,
      ECHANGE_ABOUTI: 5,
      REACTION: 6,
      COMMENTAIRE: 7,
      CANAL: 8
    }
  };

  // ===== PUBLIC =====
  return {

    /**
     * Retourne l’historique des échanges précédents pour une personne donnée
     * @param {string} nomPersonneContactee
     * @returns {Array<Object>}
     */
    getHistorique(nomPersonneContactee) {
      if (!nomPersonneContactee) return [];

      const data = getSheetDataAsObjects(CONFIG.SHEET_NAME, CONFIG.NB_COLUMNS);
      const nomNormalise = StringNormalizer.normalize(nomPersonneContactee);

      return data
        .filter(row =>
          StringNormalizer.normalize(row[CONFIG.COLUMNS_INDEX.PERSONNE_CONTACTEE]) === nomNormalise
        )
        .map(mapToHistoriqueDTO);
    },


    // Vérifie si la personne a été contactée par le bon staff dans les 7 derniers jours
      aEteContacteRecemment(historique, staffNom, nbJoursPrecedents=7) {
        const maintenant = new Date();

        for (let histo of historique) {
          const dateContact = new Date(histo.date);
          const diffJours = (maintenant - dateContact) / (1000 * 60 * 60 * 24);

          if (diffJours <= nbJoursPrecedents && StringNormalizer.normalizeName(histo.personneQuiAppelait) === staffNom) {
            return true;
          }
        }
        return false;
      }

  };

  // ===== PRIVÉ =====

  /**
   * Transforme une ligne brute en objet Historique exploitable
   */
  function mapToHistoriqueDTO(row) {
    const C = CONFIG.COLUMNS_INDEX;
    return {
      date: row[C.DATE] || null,
      heure: row[C.HEURE] || null,
      personneQuiAppelait: row[C.APPELANT] || '',
      echangeAbouti: row[C.ECHANGE_ABOUTI] || '',
      reaction: row[C.REACTION] || '',
      commentaire: row[C.COMMENTAIRE] || '',
      canal: row[C.CANAL] || ''
    };
  }

  /**
   * Normalise une chaîne pour comparaison fiable
   */
  function normaliserChaine(value) {
    return (value || '').toString().trim().toLowerCase();
  }

})();
