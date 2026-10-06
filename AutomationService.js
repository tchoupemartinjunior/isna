/**
 * AutomationService.js
 * Traitement automatique des nouveaux visiteurs, déclenché à chaque envoi
 * du formulaire d'accueil (ou à la demande depuis le menu) :
 *
 *  1. Famille d'impact attribuée d'après le quartier / la ville (Quartiers_FI + rapprochement)
 *  2. Staff phoning = pilote de la FI / FIJ (FIJ pour les jeunes si la zone en a une)
 *  3. Statut phoning -> "A contacter"
 *  4. Liens WhatsApp générés (message staff + invitation FI)
 *  5. E-mail au pilote avec, pour chaque visiteur, le bouton "Envoyer l'invitation"
 *  6. Visiteurs sans famille trouvée -> statut "A attribuer" + e-mail récapitulatif au responsable
 *
 * Seules les colonnes saisies à la main dans Phoning sont écrites (Staff, Statut phoning,
 * Famille, liens) : les colonnes alimentées par ARRAYFORMULA ne sont jamais touchées.
 */
const AutomationService = (function () {
  const PROP_START_DATE = 'AUTO_START_DATE';
  const PROP_ADMIN_EMAIL = 'AUTO_ADMIN_EMAIL';
  const HANDLER = 'onNouveauVisiteur';
  const STATUT_A_CONTACTER = 'A contacter';
  const STATUT_A_ATTRIBUER = 'A attribuer';

  /**
   * @param {{envoyerEmails?:boolean}} options
   * @returns {{attribues:Array, aAttribuer:Array, emails:Object|null}}
   */
  function traiterNouveauxVisiteurs(options = {}) {
    const envoyerEmails = options.envoyerEmails !== false;
    const props = PropertiesService.getDocumentProperties();
    const startIso = props.getProperty(PROP_START_DATE);
    if (!startIso) throw new Error('Automatisation non activée : utilise le menu Automatisation > Activer.');
    const startDate = new Date(startIso);

    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const C = COLONNES;
    const repository = SheetRepository.create();
    const sheet = repository.getSheet(ONGLETS.PHONING);

    SpreadsheetApp.flush();             // laisse les ARRAYFORMULA intégrer la nouvelle réponse
    SheetCache.invalidate();
    FamilleService.reset();

    const nbRows = sheet.getLastRow() - 1;
    const result = { attribues: [], aAttribuer: [], emails: null };
    if (nbRows <= 0) return result;
    const data = sheet.getRange(2, 1, nbRows, NUM_COLS).getValues();

    const staffOut = data.map(r => [r[C.STAFF_PHONING - 1]]);
    const statutOut = data.map(r => [r[C.STATUT_PHONING - 1]]);
    const familleOut = data.map(r => [r[C.FAMILLE - 1]]);
    const nouvellesLignes = new Set();
    const apprises = [];

    data.forEach((row, i) => {
      const personne = TextUtils.clean(row[C.PERSONNE_A_CONTACTER - 1]).toString();
      const dateVisite = DateUtils.parse(row[C.DATE_PREMIERE_VISITE - 1]);
      const staff = TextUtils.clean(row[C.STAFF_PHONING - 1]);
      const statut = TextUtils.key(row[C.STATUT_PHONING - 1]);

      if (!personne || !dateVisite || dateVisite < startDate) return;
      if (staff) return;                                            // déjà attribué
      if (statut && statut !== TextUtils.key(STATUT_A_ATTRIBUER)) return; // déjà en cours de suivi

      const quartier = TextUtils.clean(row[C.QUARTIER - 1]).toString();
      const ville = TextUtils.clean(row[C.VILLE - 1]).toString();
      const familleSaisie = TextUtils.clean(row[C.FAMILLE - 1]).toString();
      const familleNom = familleSaisie || FamilleService.trouverPourVisiteur(quartier, ville);
      const famille = familleNom ? FamilleService.choisir(familleNom, row[C.TRANCHE_AGE - 1]) : null;

      if (!famille || !famille.pilote) {
        if (!statut) { // première fois : on signale au responsable
          statutOut[i][0] = STATUT_A_ATTRIBUER;
          result.aAttribuer.push({ ligne: i + 2, personne, quartier, ville });
        }
        return;
      }

      // Famille choisie à la main pour un quartier inconnu -> on mémorise la correspondance
      if (familleSaisie && quartier && !FamilleService.deviner(quartier)) apprises.push([quartier, familleSaisie]);

      familleOut[i][0] = familleSaisie || famille.nom;
      staffOut[i][0] = famille.pilote;
      statutOut[i][0] = STATUT_A_CONTACTER;
      nouvellesLignes.add(i + 2);
      result.attribues.push({ ligne: i + 2, personne, famille: famille.nom, type: famille.type, pilote: famille.pilote });
    });

    if (nouvellesLignes.size || result.aAttribuer.length) {
      sheet.getRange(2, C.STAFF_PHONING, nbRows, 1).setValues(staffOut);
      sheet.getRange(2, C.STATUT_PHONING, nbRows, 1).setValues(statutOut);
      sheet.getRange(2, C.FAMILLE, nbRows, 1).setValues(familleOut);
      SpreadsheetApp.flush();
    }
    FamilleService.apprendre(apprises);

    if (nouvellesLignes.size) {
      const config = { ONGLETS, COLONNES, NUM_COLS };
      WhatsAppService.generateWhatsAppLinks(config, repository, false);
      InvitationService.generateInvitations();
      if (envoyerEmails) {
        result.emails = PhoningEmailService.sendDispatchingEmails(config, repository, { rowIndexes: nouvellesLignes });
      }
      try {
        mettreAJourListesCompteRenduPhoning();
      } catch (e) {
        Logger.log(`Mise à jour du formulaire compte rendu impossible : ${e.message}`);
      }
    }

    if (envoyerEmails && (result.aAttribuer.length || (result.emails && result.emails.sansEmail.length))) {
      envoyerRecapResponsable(result);
    }

    Logger.log(`Automatisation : ${result.attribues.length} attribué(s), ${result.aAttribuer.length} à attribuer`);
    return result;
  }

  /** E-mail au responsable : visiteurs sans famille + pilotes sans e-mail */
  function envoyerRecapResponsable(result) {
    const to = getAdminEmail();
    if (!to) return;
    const url = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    let html = `Bonjour,<br><br>`;

    if (result.aAttribuer.length) {
      html += `<b>${result.aAttribuer.length} nouveau(x) visiteur(s) sans famille d'impact trouvée :</b><ul>`;
      result.aAttribuer.forEach(v => {
        html += `<li>${v.personne} — quartier : <i>${v.quartier || '?'}</i>, ville : <i>${v.ville || '?'}</i> (ligne ${v.ligne})</li>`;
      });
      html += `</ul>Choisis la famille dans la colonne <b>Famille d'impact</b> de l'onglet Phoning, puis menu ` +
        `<i>Automatisation &gt; Traiter les nouveaux visiteurs maintenant</i>. ` +
        `La correspondance quartier → famille sera retenue pour les prochains visiteurs.<br><br>`;
    }
    if (result.emails && result.emails.sansEmail.length) {
      html += `<b>Pilotes sans adresse e-mail dans Staff_phoning</b> (dispatching non envoyé) :<ul>` +
        result.emails.sansEmail.map(s => `<li>${s}</li>`).join('') + `</ul>`;
    }
    html += `<a href="${url}">Ouvrir le Google Sheet</a><br><br>Équipe Intégration – ICC Le Mans`;

    MailApp.sendEmail({ to, subject: 'Intégration – visiteurs à attribuer', htmlBody: html });
  }

  function getAdminEmail() {
    return PropertiesService.getDocumentProperties().getProperty(PROP_ADMIN_EMAIL) ||
      Session.getEffectiveUser().getEmail();
  }

  /* --------------------------- Déclencheur ---------------------------- */
  function activer(startDate, adminEmail) {
    desactiver();
    const props = PropertiesService.getDocumentProperties();
    props.setProperty(PROP_START_DATE, startDate.toISOString());
    if (adminEmail) props.setProperty(PROP_ADMIN_EMAIL, adminEmail);
    ScriptApp.newTrigger(HANDLER)
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onFormSubmit()
      .create();
  }

  function desactiver() {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === HANDLER)
      .forEach(t => ScriptApp.deleteTrigger(t));
  }

  function estActive() {
    return ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === HANDLER);
  }

  return { traiterNouveauxVisiteurs, activer, desactiver, estActive, getAdminEmail, STATUT_A_ATTRIBUER };
})();
