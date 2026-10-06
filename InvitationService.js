/**
 * InvitationService.js
 * Génère, pour chaque visiteur ayant une "Famille d'impact" renseignée (onglet Phoning),
 * un lien WhatsApp d'invitation à rejoindre la FI / FIJ de sa zone.
 *
 * Sources :
 *  - Onglet FI_et_FIJ     : Famille | Adresse | Pilote | Type (FI / FIJ)
 *  - Onglet Staff_phoning : téléphone du pilote (colonne "Téléphone", via StaffService)
 *
 * Le lien est écrit dans la colonne "Invitation whatsapp" de l'onglet Phoning.
 */
const InvitationService = (function () {
  const nl = '\n';
  const CRENEAU = 'tous les jeudis de 19h à 20h30';

  /**
   * Point d'entrée : génère les liens d'invitation pour toutes les lignes concernées
   * @returns {{generes:number, ignores:Array<string>}}
   */
  function generateInvitations() {
    const { COLONNES, ONGLETS } = getConstants();
    const fiConfig = ConfigService.getSheet('FI_ET_FIJ');
    const repository = SheetRepository.create();

    const sheet = repository.getSheet(ONGLETS.PHONING);
    const numCols = Math.max(COLONNES.INVITATION_WHATSAPP, COLONNES.FAMILLE);
    const data = repository.getData(ONGLETS.PHONING, 1, numCols);

    const staffPhoneMap = StaffService.construireStaffPhoneMap();

    const result = { generes: 0, ignores: [] };
    const sortie = []; // valeurs/formules de la colonne Invitation, écrites en une fois

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2;
      const existant = row[COLONNES.INVITATION_WHATSAPP - 1];
      const familleNom = row[COLONNES.FAMILLE - 1];

      if (!familleNom || !familleNom.toString().trim()) {
        sortie.push([existant]); // on ne touche pas
        continue;
      }

      const personne = row[COLONNES.PERSONNE_A_CONTACTER - 1] || `ligne ${rowIndex}`;
      const telVisiteur = PhoneUtils.toWhatsApp(row[COLONNES.TELEPHONE - 1]);
      if (!telVisiteur) {
        sortie.push(['Téléphone visiteur manquant']);
        result.ignores.push(`${personne} : téléphone manquant`);
        continue;
      }

      const famille = FamilleService.choisir(familleNom, row[COLONNES.TRANCHE_AGE - 1]);
      if (!famille) {
        sortie.push([`Famille "${familleNom}" introuvable dans ${fiConfig.NAME}`]);
        result.ignores.push(`${personne} : famille "${familleNom}" introuvable`);
        continue;
      }

      const telPilote = staffPhoneMap[StringNormalizer.normalizeName(famille.pilote)] || '';
      const message = construireMessageInvitation(row, famille, telPilote);
      const url = `https://wa.me/${telVisiteur}?text=${encodeURIComponent(message)}`;
      const label = `Inviter en ${famille.type || 'FI'} ${famille.nom}`;

      sortie.push([`=HYPERLINK("${escapeFormula(url)}"; "${escapeFormula(label)}")`]);
      result.generes++;
    }

    if (sortie.length > 0) {
      sheet.getRange(2, COLONNES.INVITATION_WHATSAPP, sortie.length, 1).setValues(sortie);
    }

    Logger.log(`Invitations générées : ${result.generes}, ignorées : ${result.ignores.length}`);
    return result;
  }

  /**
   * Construit le message d'invitation (non encodé)
   */
  function construireMessageInvitation(row, famille, telPilote) {
    const { COLONNES } = getConstants();
    const prenom = (row[COLONNES.PRENOM - 1] || '').toString().trim();
    const isFIJ = StringNormalizer.areEqual(famille.type, 'FIJ');
    const libelleType = isFIJ ? "Famille d'Impact Jeunes (FIJ)" : "Famille d'Impact (FI)";
    const prenomPilote = famille.pilote.split(' ')[0] || famille.pilote;

    let message =
      `Bonjour${prenom ? ' *' + prenom + '*' : ''},${nl}${nl}` +
      `C'est l'équipe Intégration d'ICC Le Mans. Nous avons été très heureux de vous accueillir parmi nous !${nl}${nl}` +
      `Pour vous permettre de créer des liens et de grandir dans la foi, nous vous invitons à rejoindre la ` +
      `*${libelleType}* de votre secteur : *${famille.nom}*.${nl}${nl}`;

    message += `🗓️ Quand : ${CRENEAU}${nl}`;
    if (famille.adresse) {
      message += `📍 Adresse : ${famille.adresse}${nl}`;
    }
    if (famille.pilote) {
      message += `👤 Pilote : *${famille.pilote}*`;
      message += telPilote ? ` – ${PhoneUtils.toDisplay(telPilote)}${nl}` : nl;
    }

    message += nl;
    message += famille.adresse
      ? `N'hésitez pas à contacter ${prenomPilote} pour toute question ou pour le/la prévenir de votre venue.${nl}${nl}`
      : `${prenomPilote} vous communiquera l'adresse. N'hésitez pas à le/la contacter !${nl}${nl}`;

    message +=
      `Au plaisir de vous y retrouver !${nl}${nl}` +
      `Équipe Intégration – ICC Le Mans`;

    return message;
  }

  /**
   * URL WhatsApp d'invitation pour une ligne Phoning (ou null si impossible)
   */
  function buildInvitationUrl(row, staffPhoneMap) {
    const { COLONNES } = getConstants();
    const tel = PhoneUtils.toWhatsApp(row[COLONNES.TELEPHONE - 1]);
    const famille = FamilleService.choisir(row[COLONNES.FAMILLE - 1], row[COLONNES.TRANCHE_AGE - 1]);
    if (!tel || !famille) return null;
    const telPilote = (staffPhoneMap || StaffService.construireStaffPhoneMap())[StringNormalizer.normalizeName(famille.pilote)] || '';
    return `https://wa.me/${tel}?text=${encodeURIComponent(construireMessageInvitation(row, famille, telPilote))}`;
  }

  function escapeFormula(str) {
    return str.replace(/"/g, '""');
  }

  return {
    generateInvitations,
    construireMessageInvitation,
    buildInvitationUrl
  };
})();
