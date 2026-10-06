/***
 * Dispatching.js - Main Entry Point
 * Orchestration of phoning actions
 ***/

function onOpen() {
  PhoningUIModule.initializeMenu();
}

function genererLiensWhatsAppNormaux() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    const stats = withLock(() => {
      const s = WhatsAppService.generateWhatsAppLinks(config, repository, false);
      mettreAJourListesCompteRenduPhoning();
      mettreAJourListesDuSuivi();
      return s;
    });

    PhoningUIModule.showSuccessMessage(
      `${stats.liens} message(s) WhatsApp généré(s).` +
      (stats.effectues ? `\n${stats.effectues} personne(s) déjà contactée(s) récemment → "Effectué".` : '') +
      (stats.erreurs ? `\n${stats.erreurs} ligne(s) sans téléphone staff.` : ''));
  } catch (error) {
    Logger.log(`Error generating WhatsApp links: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function genererLiensWhatsAppRappels() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    withLock(() => {
      WhatsAppService.generateWhatsAppLinks(config, repository, true);
      mettreAJourListesCompteRenduPhoning();
    });

    Logger.log('WhatsApp reminders generated successfully');
  } catch (error) {
    Logger.log(`Error generating WhatsApp reminders: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function genererInvitationsFamilles() {
  try {
    const { generes, ignores } = withLock(() => InvitationService.generateInvitations());

    let message = `${generes} invitation(s) WhatsApp générée(s) dans la colonne "Invitation whatsapp".`;
    if (ignores.length > 0) {
      message += `\n\n${ignores.length} ligne(s) ignorée(s) :\n- ` + ignores.join('\n- ');
    }
    PhoningUIModule.showSuccessMessage(message);
  } catch (error) {
    Logger.log(`Error generating invitations: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function envoyerDispatchingParMail() {
  try {
    const { ONGLETS, COLONNES, NUM_COLS } = getConstants();
    const repository = SheetRepository.create();
    const config = { ONGLETS, COLONNES, NUM_COLS };

    withLock(() => {
      PhoningEmailService.sendDispatchingEmails(config, repository);
      mettreAJourListesCompteRenduPhoning();
    });

    Logger.log('Dispatching emails sent successfully');
    PhoningUIModule.showSuccessMessage('Emails de dispatching envoyés avec succès');
  } catch (error) {
    Logger.log(`Error sending dispatching emails: ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

/* =========================================================================
 * AUTOMATISATION
 * ========================================================================= */

/** Déclencheur installé : à chaque réponse au formulaire d'accueil */
function onNouveauVisiteur(e) {
  try {
    Utilities.sleep(3000); // laisse le temps aux ARRAYFORMULA de Phoning de se recalculer
    withLock(() => AutomationService.traiterNouveauxVisiteurs({ envoyerEmails: true }), 60000);
  } catch (error) {
    Logger.log(`Erreur automatisation : ${error.message}`);
    MailApp.sendEmail(AutomationService.getAdminEmail(), 'Intégration – erreur d\'automatisation', error.stack || error.message);
  }
}

function activerAutomatisation() {
  const ui = SpreadsheetApp.getUi();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  const rep = ui.prompt('Activer l\'automatisation',
    'À chaque formulaire d\'accueil, les nouveaux visiteurs recevront automatiquement une famille d\'impact ' +
    'et leur pilote comme staff phoning, puis le pilote sera prévenu par e-mail.\n\n' +
    `Traiter les visiteurs venus à partir du (jj/mm/aaaa) :`, ui.ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== ui.Button.OK) return;

  const start = DateUtils.parse(rep.getResponseText().trim() || today);
  if (!start) return PhoningUIModule.showErrorDialog('Erreur', 'Date invalide, format attendu : jj/mm/aaaa');
  start.setHours(0, 0, 0, 0);

  try {
    AutomationService.activer(start);
    PhoningUIModule.showSuccessMessage(
      `Automatisation activée pour les visiteurs à partir du ${DateUtils.format(start)}.\n` +
      `Récapitulatifs et alertes envoyés à : ${AutomationService.getAdminEmail()}\n\n` +
      'Pense à vérifier l\'onglet Quartiers_FI (menu Automatisation > Mettre à jour la table des quartiers).');
  } catch (error) {
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function desactiverAutomatisation() {
  AutomationService.desactiver();
  PhoningUIModule.showSuccessMessage('Automatisation désactivée. Les traitements manuels du menu restent disponibles.');
}

function traiterNouveauxVisiteursMaintenant() {
  try {
    const r = withLock(() => AutomationService.traiterNouveauxVisiteurs({ envoyerEmails: true }));
    let msg = `${r.attribues.length} visiteur(s) attribué(s) :\n` +
      r.attribues.map(a => `- ${a.personne} → ${a.type} ${a.famille} (${a.pilote})`).join('\n');
    if (r.aAttribuer.length) {
      msg += `\n\n${r.aAttribuer.length} sans famille trouvée (statut "A attribuer") :\n` +
        r.aAttribuer.map(a => `- ${a.personne} (quartier : ${a.quartier || '?'})`).join('\n');
    }
    if (r.emails) msg += `\n\nE-mails envoyés à ${r.emails.envoyes} pilote(s).`;
    if (r.emails && r.emails.sansEmail.length) msg += `\nSans e-mail : ${r.emails.sansEmail.join(', ')}`;
    PhoningUIModule.showSuccessMessage(msg);
  } catch (error) {
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function mettreAJourTableQuartiers() {
  try {
    const r = withLock(() => FamilleService.mettreAJourTable());
    PhoningUIModule.showSuccessMessage(
      `Onglet Quartiers_FI mis à jour : ${r.ajoutes} nouveau(x) quartier(s), dont ${r.suggeres} avec une famille suggérée.\n` +
      `${r.aCompleter} quartier(s) sans famille : choisis-la dans la colonne B (liste déroulante).\n\n` +
      'Vérifie aussi les suggestions automatiques.');
  } catch (error) {
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}
