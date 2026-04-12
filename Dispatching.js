/***********************************
 * 📌 Constantes et variables globales
 ***********************************/
const HEADER_ROW = 1;
const START_ROW = HEADER_ROW + 1;
const START_COL = 1;
const NUM_COLS = 22;
let staffPhoneMap = null;

/***********************************
 *  Menu dans Google Sheets
 ***********************************/
function onOpen() {
    const ui = SpreadsheetApp.getUi();

  // ===== Menu principal =====
  ui.createMenu('Actions Intégration ICC Le Mans')
     .addItem('📲 Générer les messages Whatsapp', 'genererLiensWhatsAppNormaux')
     .addItem('📧 Envoyer Dispatching par Mail', 'envoyerDispatchingParMail')
    .addItem('➕ Ajouter les personnes intégrées en Base de données', 'transferIntegratedRowstoDB')
    .addItem('📝 CR - Mettre à jour la liste des personnes à contacter', 'mettreAJourListesCompteRenduPhoning')
    .addToUi();
}


// Génère tous les liens WhatsApp
function genererLiensWhatsApp(isRappel = false) {
    const { ONGLETS,COLONNES } = getConstants();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLETS.PHONING);

  const lastRow = sheet.getLastRow();
  const numRows = lastRow - HEADER_ROW;
  const data = sheet.getRange(START_ROW, START_COL, numRows, NUM_COLS).getValues();

  if (!staffPhoneMap) {
    staffPhoneMap = StaffService.construireStaffPhoneMap();
  }
  

  for (let i = 0; i < data.length; i++) {
    const rowIndex = i + START_ROW;
    const row = data[i];
    const statut = row[COLONNES.STATUT_PHONING - 1];
    const staffNom = normaliserNom(row[COLONNES.STAFF_PHONING - 1]);

    if (statut === "A contacter") {
      const historique = HistoriqueService.getHistorique(row[COLONNES.PERSONNE_A_CONTACTER - 1]);

      if (HistoriqueService.aEteContacteRecemment(historique, staffNom,7)) {
        sheet.getRange(rowIndex, COLONNES.STATUT_PHONING).setValue("Effectué");
        continue;
      }

      const telStaff = staffPhoneMap[staffNom] || '';
      if (telStaff) {
        ecrireLienWhatsApp(sheet, rowIndex, row, telStaff, isRappel);
      } else {
        sheet.getRange(rowIndex, COLONNES.LIEN_WHATSAPP).setValue("Téléphone non trouvé");
      }
    }
  }
  mettreAJourListesCompteRenduPhoning();
}

/***********************************
 * 📧 Envoi du dispatching à chaque staff par mail
 ***********************************/
function envoyerDispatchingParMail() {
  const { STATUS_A_CONTACTER, COLONNES } = getConstants();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Onglet.PHONING);
  const lastRow = sheet.getLastRow();
  const numRows = lastRow - HEADER_ROW;

  if (numRows <= 0) {
    Logger.log("Aucune donnée trouvée.");
    return;
  }

  // Récupère les données du phoning
  const data = sheet.getRange(START_ROW, START_COL, numRows, NUM_COLS).getValues();
  
  // Filtrer les lignes où le destinataire n’est pas vide
  const filteredData = data.filter(row => row[COLONNES.PERSONNE_A_CONTACTER] && row[COLONNES.PERSONNE_A_CONTACTER].toString().trim() !== "" && row[COLONNES.STATUT_PHONING-1]=== STATUS_A_CONTACTER);

  if (filteredData.length === 0) {
    Logger.log("Aucun destinataire à traiter.");
    return;
  }

  // Récupère la map staff {nom -> {tel, email}}
  const staffMap = StaffService.construireStaffMap();

  // Regrouper les personnes par staff
  const dispatching = {};

  for (let i = 0; i < filteredData.length; i++) {
    const row = filteredData[i];
    const statut = row[COLONNES.STATUT_PHONING - 1];
    const staffNom = normaliserNom(row[COLONNES.STAFF_PHONING - 1]);
    const personne = row[COLONNES.PERSONNE_A_CONTACTER - 1];
    const telephone = row[COLONNES.TELEPHONE - 1];

      if (!dispatching[staffNom]) {
        dispatching[staffNom] = [];
      }

      // Génère le message directement depuis le service
      const message = decodeURIComponent(MessageService.construireMessage(row));

      // Crée un lien WhatsApp cliquable
    const whatsappLink = telephone
    ? `<a href="https://wa.me/${telephone.replace(/\D/g,'').replace(/^0/, '')}" target="_blank">Contacter la personne sur WhatsApp</a>`
    : '';

      dispatching[staffNom].push({
        personne,
        message,
        whatsappLink
      });
  }

    // Envoi des mails à chaque staff
    for (let staffNom in dispatching) {
      const staffInfo = staffMap[staffNom];
      if (!staffInfo || !staffInfo.email) {
        Logger.log(`Pas d'email trouvé pour ${staffNom}`);
        continue;
      }

    const destinataire = staffInfo.email;
    const sujet = "Dispatching phoning - ICC Le Mans";

    // Construire le corps du mail
    let corps = `Bonjour ${staffNom},<br><br>Voici la liste des personnes à contacter :<br><br>`;
    dispatching[staffNom].forEach((entry, index) => {
      corps += `<b>${index + 1}. ${entry.personne}</b><br>`;
      if (entry.whatsappLink) {
        corps += `${entry.whatsappLink}<br>`;
      }
     corps += `${entry.message
              .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
              .replace(/\n/g, '<br>')}<br>`;

      corps += `<br>`;
    });

    corps += `<p>Merci pour ton engagement 🙏<br>`;
    corps += `Merci de remplir le formulaire après l’appel : <a href="https://forms.gle/Jeo1jqxe8DZw4BkT8">Lien du formulaire</a><br><br>`;
    corps += `Cordialement,<br>Équipe Intégration – ICC Le Mans</p>`;

    try {
      MailApp.sendEmail({
        to: destinataire,
        subject: sujet,
        htmlBody: corps
      });
      Logger.log(`Dispatching envoyé à ${staffNom} (${destinataire})`);
    } catch (e) {
      Logger.log(`Erreur envoi à ${staffNom} (${destinataire}): ${e}`);
    }
  }
   mettreAJourListesCompteRenduPhoning();
}


// Écrit un lien WhatsApp dans la cellule
function ecrireLienWhatsApp(sheet, rowIndex, row, tel, isRappel) {
  const { COLONNES } = getConstants();
  const message = MessageService.construireMessage(row, isRappel);
  const url = `https://wa.me/${tel}?text=${message}`;
  const texte = isRappel ? 'Envoyer RAPPEL WhatsApp' : 'Envoyer Message WhatsApp';

  sheet.getRange(rowIndex, COLONNES.LIEN_WHATSAPP).setFormula(
    `=HYPERLINK("${url}"; "${texte}")`
  );
}

/***********************************
 * 📌 Fonctions utilitaires
 ***********************************/
// Normalise un nom (trim, minuscule, espaces multiples -> un seul)
function normaliserNom(nom) {
  return nom ? nom.toString().trim().replace(/\s+/g, ' ').toLowerCase() : '';
}


/***********************************
 * 📌 Fonctions publiques
 ***********************************/
function genererLiensWhatsAppNormaux() {
  genererLiensWhatsApp(false);
  mettreAJourListesCompteRenduPhoning();
}

function genererLiensWhatsAppRappels() {
  genererLiensWhatsApp(true);
}
