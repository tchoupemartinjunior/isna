/**
 * HistoriqueService.js
 * Historique des échanges (onglet Compte_rendu_Phoning).
 * L'onglet est lu UNE fois par exécution puis indexé par personne contactée.
 * Les colonnes sont retrouvées par leur en-tête (robuste aux déplacements).
 */
const HistoriqueService = (() => {
  const SHEET_NAME = 'Compte_rendu_Phoning';
  const HEADERS = {
    PERSONNE_CONTACTEE: 'Personne contactée',
    APPELANT: 'Nom et prénom de la personne qui appelle',
    APPELANT_AUTRE: 'Nom et prénom (si pas dans la liste du dessus)',
    DATE: 'Date',
    HEURE: "Heure de l'échange",
    ECHANGE_ABOUTI: "L'échange a-t-il abouti ?",
    CANAL: 'Par quel canal avez vous échangé',
    COMMENTAIRE: 'Commentaire',
    REACTION: 'Réaction de la personne'
  };

  let index = null; // { nomNormalisé: [dto, ...] }

  function buildIndex() {
    const values = SheetCache.values(SHEET_NAME);
    const h = HeaderMap.build(values[0]);
    const map = {};

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const personne = StringNormalizer.normalizeName(h.get(row, HEADERS.PERSONNE_CONTACTEE));
      if (!personne) continue;

      const dto = {
        date: DateUtils.parse(h.get(row, HEADERS.DATE)) || DateUtils.parse(row[0]),
        heure: DateUtils.formatTime(h.get(row, HEADERS.HEURE)),
        personneQuiAppelait: TextUtils.clean(h.get(row, HEADERS.APPELANT)) || TextUtils.clean(h.get(row, HEADERS.APPELANT_AUTRE)),
        echangeAbouti: TextUtils.clean(h.get(row, HEADERS.ECHANGE_ABOUTI)),
        reaction: TextUtils.clean(h.get(row, HEADERS.REACTION)),
        commentaire: TextUtils.clean(h.get(row, HEADERS.COMMENTAIRE)),
        canal: TextUtils.clean(h.get(row, HEADERS.CANAL))
      };
      (map[personne] = map[personne] || []).push(dto);
    }

    Object.values(map).forEach(list =>
      list.sort((a, b) => (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0)));
    return map;
  }

  return {
    /**
     * Historique des échanges pour une personne (trié du plus ancien au plus récent)
     * @param {string} nomPersonneContactee
     * @returns {Array<Object>}
     */
    getHistorique(nomPersonneContactee) {
      if (!nomPersonneContactee) return [];
      if (!index) index = buildIndex();
      return index[StringNormalizer.normalizeName(nomPersonneContactee)] || [];
    },

    /** La personne a-t-elle été contactée par ce staff dans les N derniers jours ? */
    aEteContacteRecemment(historique, staffNom, nbJoursPrecedents = 7) {
      const maintenant = new Date();
      return historique.some(h =>
        h.date &&
        DateUtils.daysBetween(h.date, maintenant) <= nbJoursPrecedents &&
        StringNormalizer.normalizeName(h.personneQuiAppelait) === staffNom
      );
    },

    /** Force une relecture (après ajout de comptes rendus pendant l'exécution) */
    reset() {
      index = null;
      SheetCache.invalidate(SHEET_NAME);
    }
  };
})();
