/**
 * database.js — Base de données des personnes intégrées
 *
 * - Schéma propre et fixe (voir DatabaseService.SCHEMA)
 * - Données nettoyées : noms, téléphones, emails, dates
 * - Dédoublonnage : même Nom+Prénom, ou même Téléphone+Prénom
 * - Lectures / écritures en un seul bloc
 */
const DatabaseService = (function () {
  const DB_SHEET = 'Base_de_donnees';
  const PHONING_SHEET = 'Phoning';
  const STATUT_INTEGRE = ['integre e', 'integre', 'integree'];   // "Intégré(e)" normalisé
  const STATUT_AJOUTE = 'Ajouté en bdd';
  const ID_PREFIX = 'P';
  const SOURCE_SHEETS = ["Formulaire d'acceuil", 'Phoning']; // pour compléter les fiches

  /**
   * Schéma de la base. `aliases` = en-têtes acceptés en lecture
   * (onglet Phoning, ancienne base, nouvelle base).
   */
  const SCHEMA = [
    { key: 'ID',                   header: 'ID',                    aliases: ['ID'] },
    { key: 'DATE_PREMIERE_VISITE', header: 'Date première visite',  aliases: ['Date première visite', 'Horodateur'], type: 'date' },
    { key: 'NOM',                  header: 'Nom',                   aliases: ['Nom'], type: 'nom' },
    { key: 'PRENOM',               header: 'Prénom',                aliases: ['Prénom', 'Prenom'], type: 'prenom' },
    { key: 'TELEPHONE',            header: 'Téléphone',             aliases: ['Téléphone', 'Telephone', 'Numéro de téléphone'], type: 'tel' },
    { key: 'EMAIL',                header: 'Email',                 aliases: ['Email', 'Adresse e-mail'], type: 'email' },
    { key: 'SEXE',                 header: 'Sexe',                  aliases: ['Sexe'], type: 'title' },
    { key: 'TRANCHE_AGE',          header: "Tranche d'âge",         aliases: ["Tranche d'âge"] },
    { key: 'ETAT_CIVIL',           header: 'État civil',            aliases: ['État civil', 'Etat civil'] },
    { key: 'VILLE',                header: 'Ville',                 aliases: ['Ville', 'Ville de résidence'], type: 'title' },
    { key: 'QUARTIER',             header: 'Quartier',              aliases: ['Quartier', 'Préciser le quartier (Si Le Mans)'] },
    { key: 'FAMILLE_IMPACT',       header: "Famille d'impact",      aliases: ["Famille d'impact", 'Famille'] },
    { key: 'INVITE_PAR',           header: 'Invité par',            aliases: ['Invité par', 'Invitée par', "Nom et prénom de l'inviteur (membre de ICC Le Mans)"] },
    { key: 'CONNU_PAR',            header: "A connu l'église par",  aliases: ["A connu l'église par", "Comment avez vous connu l'église?"] },
    { key: 'PRIERE_SALUT',         header: 'Prière du salut',       aliases: ['Prière du salut', "Avez-vous fait la prière du salut lors d'un culte à ICC Le Mans ?"] },
    { key: 'ANCIENNE_EGLISE',      header: 'Ancienne église',       aliases: ['Ancienne église', "Si vous êtes déjà membre d'une église, nous vous invitons à bien vouloir préciser laquelle"] },
    { key: 'STAR',                 header: 'STAR',                  aliases: ['STAR'] },
    { key: 'FAMILLE_DISCIPLE',     header: 'Famille de disciple',   aliases: ['Famille de disciple'] }
  ];
  const COL = {};
  SCHEMA.forEach((f, i) => { COL[f.key] = i; });

  /* ---------------------------------------------------------------------
   * Normalisation d'un enregistrement
   * --------------------------------------------------------------------- */
  function normalizeValue(field, value) {
    const v = TextUtils.clean(value);
    switch (field.type) {
      case 'date':   return DateUtils.dayOnly(v);
      case 'nom':    return TextUtils.upper(v);
      case 'prenom': return TextUtils.titleCase(v);
      case 'title':  return TextUtils.titleCase(v);
      case 'tel':    return PhoneUtils.toDisplay(value);
      case 'email': {
        const e = (v || '').toString().toLowerCase().replace(/\s/g, '');
        return /^[^@]+@[^@]+\.[^@]+$/.test(e) ? e : '';
      }
      default:       return isDate(v) ? v : (v || '').toString();
    }
  }

  /** Lit une ligne quelconque (Phoning / ancienne base / base) -> tableau au format SCHEMA */
  function toRecord(row, headerMap) {
    const rec = SCHEMA.map(f => normalizeValue(f, headerMap.get(row, f.aliases)));
    // Ancienne base : Nom vide mais "Nom & Prénom" renseigné -> on retire le prénom
    const complet = TextUtils.clean(headerMap.get(row, ['Nom & Prénom'])).toString();
    if (!rec[COL.NOM] && rec[COL.PRENOM] && complet) {
      const prenomKeys = TextUtils.key(rec[COL.PRENOM]).split(' ');
      const reste = complet.split(' ').filter(w => w && !TextUtils.key(w).split(' ').every(t => prenomKeys.includes(t)));
      rec[COL.NOM] = TextUtils.upper(reste.join(' '));
    }
    // Ancienne base : seul "Nom & Prénom" renseigné -> "Prénom NOM"
    if (!rec[COL.NOM] && !rec[COL.PRENOM]) {
      const parts = TextUtils.clean(headerMap.get(row, ['Nom & Prénom'])).toString().split(' ').filter(Boolean);
      if (parts.length === 1) rec[COL.PRENOM] = TextUtils.titleCase(parts[0]);
      if (parts.length > 1) {
        rec[COL.PRENOM] = TextUtils.titleCase(parts[0]);
        rec[COL.NOM] = TextUtils.upper(parts.slice(1).join(' '));
      }
    }
    return rec;
  }

  function isEmptyRecord(rec) {
    return !rec[COL.NOM] && !rec[COL.PRENOM] && !rec[COL.TELEPHONE];
  }

  /** Clés de dédoublonnage */
  function keysOf(rec) {
    const prenom = TextUtils.key(rec[COL.PRENOM]);
    const nom = TextUtils.key(rec[COL.NOM]);
    const tel = PhoneUtils.toWhatsApp(rec[COL.TELEPHONE]);
    const keys = [];
    if (nom || prenom) keys.push(`n:${nom}|${prenom}`);
    if (tel.length >= 9) keys.push(`t:${tel}|${prenom}`);
    return keys;
  }

  /** Complète les champs vides de `target` avec `source`. Retourne true si modifié. */
  function merge(target, source) {
    let changed = false;
    SCHEMA.forEach((f, i) => {
      if (f.key === 'ID') return;
      if (f.key === 'DATE_PREMIERE_VISITE' && source[i] && target[i] && source[i] < target[i]) {
        target[i] = source[i]; changed = true; return;
      }
      if ((target[i] === '' || target[i] === null) && source[i] !== '' && source[i] !== null) {
        target[i] = source[i]; changed = true;
      }
    });
    return changed;
  }

  /** Index de dédoublonnage sur une liste d'enregistrements */
  function createIndex(records) {
    const idx = {};
    const add = rec => keysOf(rec).forEach(k => { idx[k] = rec; });
    records.forEach(add);
    return {
      find: rec => { for (const k of keysOf(rec)) if (idx[k]) return idx[k]; return null; },
      add
    };
  }

  /**
   * Complète les champs vides de la base (email, nom, téléphone...) à partir
   * des onglets sources : Formulaire d'acceuil puis Phoning.
   * Correspondance : Nom+Prénom (aussi inversés) ou Téléphone+Prénom.
   * @returns {number} nombre de fiches complétées
   */
  function enrichFromSources(records) {
    const idx = {};
    records.forEach(rec => enrichKeys(rec).forEach(k => { if (!idx[k]) idx[k] = rec; }));
    const completed = new Set();

    SOURCE_SHEETS.forEach(name => {
      let values;
      try { values = SheetCache.values(name); } catch (e) { Logger.log(e.message); return; }
      const h = HeaderMap.build(values[0]);
      for (let i = 1; i < values.length; i++) {
        const src = toRecord(values[i], h);
        if (isEmptyRecord(src)) continue;
        src[COL.ID] = '';
        src[COL.DATE_PREMIERE_VISITE] = ''; // on ne touche pas aux dates de la base
        for (const k of enrichKeys(src)) {
          const target = idx[k];
          if (target) { if (merge(target, src)) completed.add(target); break; }
        }
      }
    });
    return completed.size;
  }

  function enrichKeys(rec) {
    const prenom = TextUtils.key(rec[COL.PRENOM]);
    const nom = TextUtils.key(rec[COL.NOM]);
    const tel = PhoneUtils.toWhatsApp(rec[COL.TELEPHONE]);
    const keys = [];
    if (nom && prenom) keys.push(`n:${nom}|${prenom}`, `n:${prenom}|${nom}`);
    if (tel.length >= 9 && prenom) keys.push(`t:${tel}|${prenom}`);
    return keys;
  }

  function nextIdGenerator(records) {
    let max = 0;
    records.forEach(r => {
      const m = String(r[COL.ID] || '').match(/(\d+)$/);
      if (m) max = Math.max(max, +m[1]);
    });
    return () => `${ID_PREFIX}${String(++max).padStart(4, '0')}`;
  }

  function sortByName(records) {
    return records.sort((a, b) =>
      String(a[COL.NOM]).localeCompare(String(b[COL.NOM]), 'fr', { sensitivity: 'base' }) ||
      String(a[COL.PRENOM]).localeCompare(String(b[COL.PRENOM]), 'fr', { sensitivity: 'base' }));
  }

  /* ---------------------------------------------------------------------
   * Lecture / écriture de la base
   * --------------------------------------------------------------------- */
  function isNewSchema(headerRow) {
    return TextUtils.key(headerRow[0]) === 'id';
  }

  function readDatabase() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DB_SHEET);
    if (!sheet) throw new Error(`Onglet "${DB_SHEET}" introuvable`);
    const values = sheet.getDataRange().getValues();
    const h = HeaderMap.build(values[0]);
    const records = values.slice(1).map(r => toRecord(r, h)).filter(r => !isEmptyRecord(r));
    return { sheet, records, newSchema: isNewSchema(values[0]) };
  }

  /** Réécrit tout l'onglet en un bloc, au format SCHEMA */
  function writeDatabase(sheet, records) {
    const nbCols = SCHEMA.length;
    const out = [SCHEMA.map(f => f.header)].concat(sortByName(records));

    // Repart d'une feuille vierge : contenu, formats, listes déroulantes et
    // mises en forme conditionnelles de l'ancien schéma ne correspondent plus aux colonnes
    const filter = sheet.getFilter();
    if (filter) filter.remove();
    sheet.clear();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
    sheet.setConditionalFormatRules([]);
    if (sheet.getMaxColumns() > nbCols) {
      sheet.deleteColumns(nbCols + 1, sheet.getMaxColumns() - nbCols);
    }
    const lastRow = sheet.getMaxRows();
    if (lastRow < out.length) sheet.insertRowsAfter(lastRow, out.length - lastRow);

    // Format texte pour le téléphone (garde le 0 initial), dates au format FR
    sheet.getRange(2, COL.TELEPHONE + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    sheet.getRange(2, COL.DATE_PREMIERE_VISITE + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy');

    sheet.getRange(1, 1, out.length, nbCols).setValues(out);
    sheet.getRange(1, 1, 1, nbCols).setFontWeight('bold').setBackground('#e8eaed');
    sheet.setFrozenRows(1);

    // Liste déroulante Oui / Non pour STAR
    const ouiNon = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Oui', 'Non'], true).setAllowInvalid(true).build();
    sheet.getRange(2, COL.STAR + 1, sheet.getMaxRows() - 1, 1).setDataValidation(ouiNon);
  }

  /* ---------------------------------------------------------------------
   * API
   * --------------------------------------------------------------------- */

  /**
   * Transfère les personnes "Intégré(e)" de Phoning vers la base.
   * Personne déjà en base -> ses champs vides sont complétés (pas de doublon).
   */
  function transferIntegrated() {
    const db = readDatabase();
    if (!db.newSchema) {
      throw new Error('La base n\'est pas encore au nouveau format. Lance d\'abord "Nettoyer / migrer la base de données".');
    }

    const phoningSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PHONING_SHEET);
    const phoning = SheetCache.values(PHONING_SHEET);
    const h = HeaderMap.build(phoning[0]);
    const colStatut = h.index(['Statut_Integration', 'Statut intégration']);
    if (colStatut === -1) throw new Error('Colonne "Statut_Integration" introuvable dans Phoning');

    const index = createIndex(db.records);
    const nextId = nextIdGenerator(db.records);
    const stats = { ajoutes: 0, completes: 0, ignores: 0 };
    const statutOut = phoning.slice(1).map(r => [r[colStatut]]);
    let changed = false;
    let statutChanged = false;

    for (let i = 1; i < phoning.length; i++) {
      if (!STATUT_INTEGRE.includes(TextUtils.key(phoning[i][colStatut]))) continue;

      const rec = toRecord(phoning[i], h);
      if (isEmptyRecord(rec)) { stats.ignores++; continue; }

      const existing = index.find(rec);
      if (existing) {
        if (merge(existing, rec)) { stats.completes++; changed = true; }
      } else {
        rec[COL.ID] = nextId();
        db.records.push(rec);
        index.add(rec);
        stats.ajoutes++;
        changed = true;
      }
      statutOut[i - 1][0] = STATUT_AJOUTE;
      statutChanged = true;
    }

    stats.enrichis = enrichFromSources(db.records);
    if (changed || stats.enrichis) writeDatabase(db.sheet, db.records);
    if (statutChanged) {
      phoningSheet.getRange(2, colStatut + 1, statutOut.length, 1).setValues(statutOut);
    }
    Logger.log(`BDD : ${stats.ajoutes} ajout(s), ${stats.completes} complété(s), ${stats.ignores} ignoré(s)`);
    return stats;
  }

  /**
   * Sauvegarde l'onglet puis le reconstruit au nouveau format :
   * colonnes inutiles supprimées, données nettoyées, doublons fusionnés.
   * Peut être relancé à tout moment pour re-nettoyer la base.
   */
  function migrate() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const db = readDatabase();
    const avant = db.sheet.getLastRow() - 1;

    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
    const backup = db.sheet.copyTo(ss).setName(`${DB_SHEET}_sauvegarde_${stamp}`);
    backup.hideSheet();

    // Dédoublonnage : on traite du plus ancien au plus récent
    const sorted = db.records.slice().sort((a, b) =>
      (a[COL.DATE_PREMIERE_VISITE] || Infinity) - (b[COL.DATE_PREMIERE_VISITE] || Infinity));
    const uniques = [];
    const index = createIndex([]);
    let fusions = 0;
    sorted.forEach(rec => {
      const existing = index.find(rec);
      if (existing) { merge(existing, rec); fusions++; }
      else { uniques.push(rec); index.add(rec); }
    });

    const nextId = nextIdGenerator(uniques);
    uniques.forEach(r => { if (!r[COL.ID]) r[COL.ID] = nextId(); });
    const enrichis = enrichFromSources(uniques);

    writeDatabase(db.sheet, uniques);
    const avecEmail = uniques.filter(r => r[COL.EMAIL]).length;
    const stats = { avant, apres: uniques.length, fusions, enrichis, avecEmail, sauvegarde: backup.getName() };
    Logger.log(`Migration BDD : ${JSON.stringify(stats)}`);
    return stats;
  }

  return { transferIntegrated, migrate, SCHEMA };
})();

/* =========================================================================
 * Points d'entrée (menu)
 * ========================================================================= */
function transferIntegratedRowstoDB() {
  try {
    const s = withLock(() => DatabaseService.transferIntegrated());
    PhoningUIModule.showSuccessMessage(
      `${s.ajoutes} personne(s) ajoutée(s) à la base.\n` +
      `${s.completes} fiche(s) existante(s) complétée(s) (doublons évités).\n` +
      `${s.enrichis} fiche(s) enrichie(s) depuis le formulaire d'accueil (email, etc.).` +
      (s.ignores ? `\n${s.ignores} ligne(s) vide(s) ignorée(s).` : ''));
  } catch (error) {
    Logger.log(`Erreur transfert BDD : ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function migrerBaseDeDonnees() {
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert(
    'Nettoyer la base de données',
    'L\'onglet Base_de_donnees va être sauvegardé (copie masquée) puis reconstruit :\n' +
    '- colonnes inutiles supprimées\n- noms, téléphones, emails et dates nettoyés\n- doublons fusionnés\n\nContinuer ?',
    ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  try {
    const s = withLock(() => DatabaseService.migrate());
    PhoningUIModule.showSuccessMessage(
      `Base nettoyée : ${s.avant} ligne(s) avant, ${s.apres} personne(s) après ` +
      `(${s.fusions} doublon(s) fusionné(s)).\n` +
      `${s.enrichis} fiche(s) complétée(s) depuis le formulaire d'accueil / Phoning, ` +
      `${s.avecEmail} personne(s) avec un email.\n\nSauvegarde : onglet masqué "${s.sauvegarde}".`);
  } catch (error) {
    Logger.log(`Erreur migration BDD : ${error.message}`);
    PhoningUIModule.showErrorDialog('Erreur', error.message);
  }
}

function testNewcomersService() {
  const service = new NewcomersService();
  Logger.log(service.getAll()[0]);
  Logger.log(service.getByNom("Molongo"));
  Logger.log(service.getByTelephone("0753068229"));
}
