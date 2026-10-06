const MessageService = (() => {
  const nl = '\n';

  return {

    /**
     * Construire le message complet (avec ou sans rappel)
     * @param {Array} row - ligne de données
     * @param {boolean} isRappel
     * @returns {string} - message encodé pour WhatsApp
     */
    construireMessage(row, isRappel = false) {
      const { COLONNES } = getConstants();
      if (!row || !row[COLONNES.PERSONNE_A_CONTACTER - 1]) return '';

      const baseMsg = this.getMessageBase(row, isRappel);
      const histoMsg = this.getHistoriqueMessage(row[COLONNES.PERSONNE_A_CONTACTER - 1]);

      const fullMessage = histoMsg ? `${baseMsg}${nl}${nl}${histoMsg}` : baseMsg;

      return encodeURIComponent(fullMessage);
    },

    /**
     * Message principal sans historique
     */
    getMessageBase(row, isRappel = false) {
      const { COLONNES } = getConstants();
      const personne = row[COLONNES.PERSONNE_A_CONTACTER - 1] || '';
      const prenom = row[COLONNES.PRENOM - 1] || '';
      const staffPhoning = row[COLONNES.STAFF_PHONING - 1] || '';
      const nom = row[COLONNES.NOM - 1] || '';
      const telephone = row[COLONNES.TELEPHONE - 1] || '';
      const quartier = row[COLONNES.QUARTIER - 1] || '';
      const trancheAge = row[COLONNES.TRANCHE_AGE - 1] || '';
      const sexe = row[COLONNES.SEXE - 1] || '';
      const situation = row[COLONNES.ETAT_CIVIL - 1] || '';
      const ville = row[COLONNES.VILLE - 1] || '';
      const invitePar = row[COLONNES.INVITE_PAR - 1] || '';
      const connuPar = row[COLONNES.A_CONNU_EGLISE_PAR - 1] || '';
      const priereSalut = row[COLONNES.PRIERE_SALUT - 1] || '';
      const frequenteEglise = row[COLONNES.FREQUENTE_EGLISE - 1] || '';
      const ancienneEglise = row[COLONNES.ANCIENNE_EGLISE - 1] || '';
      const integrerEglise = row[COLONNES.INTEGRER_EGLISE - 1] || '';

      const dateVisite = DateUtils.format(row[COLONNES.DATE_PREMIERE_VISITE - 1]);

      let message =
        `Merci de contacter *${personne}*${nl}${nl}` +
        `Suivi et Intégration des nouveaux arrivants${nl}` +
        `Bonjour *${staffPhoning}*${nl}${nl}` +
        `Merci de contacter *${personne}* au ${telephone}${nl}${nl}` +
        `Voici quelques informations utiles sur ${prenom} :${nl}${nl}` +
        `Souhaite intégrer l'église : *${integrerEglise}*${nl}` +
        `Quartier : *${quartier}*${nl}` +
        `Tranche d'âge : *${trancheAge}*${nl}` +
        `Sexe : *${sexe}*${nl}` +
        `Situation : ${situation}${nl}` +
        `Date de première visite : *${dateVisite}*${nl}` +
        `Prière du salut à ICC Le Mans : *${priereSalut}*${nl}` +
        `A connu l'église par : *${connuPar}*${nl}` +
        `Fréquentait déjà une église : ${frequenteEglise}${nl}` +
        `Si oui nom de l'église : *${ancienneEglise}*${nl}` +
        `Ville : ${ville}${nl}` +
        `Invité par : *${invitePar}*${nl}${nl}` +
        `Merci de remplir le formulaire après l’appel : https://forms.gle/Jeo1jqxe8DZw4BkT8${nl}${nl}` +
        `Cordialement,${nl}` +
        `Équipe Intégration – ICC Le Mans`;

      if (isRappel) {
        message = `RAPPEL RAPPEL${nl}${nl}` + message;
      }

      return message;
    },

    /**
     * Historique des échanges pour une personne
     */
    getHistoriqueMessage(personne) {
      const historique = HistoriqueService.getHistorique(personne);
      if (!historique || historique.length === 0) return '';

      let histoMsg =
        `${nl}====================${nl}` +
        `HISTORIQUE DES ECHANGES${nl}` +
        `====================${nl}${nl}`;

      historique.forEach(h => {
        histoMsg +=
          `Date : ${h.date ? DateUtils.format(h.date) : '-'} ${h.heure || ''}${nl}` +
          `Appelant : ${h.personneQuiAppelait || '-'}${nl}` +
          `Canal : ${h.canal || '-'}${nl}` +
          `Echange abouti : ${h.echangeAbouti || '-'}${nl}` +
          `Reaction : ${h.reaction || '-'}${nl}` +
          `Commentaire : ${h.commentaire || '-'}${nl}${nl}`;
      });

      return histoMsg;
    }
  };
})();

