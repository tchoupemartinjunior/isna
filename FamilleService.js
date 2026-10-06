/**
 * FamilleService.js
 * - Liste des FI / FIJ (onglet FI_et_FIJ)
 * - Choix FI ou FIJ selon la tranche d'âge
 * - Attribution d'une famille à partir du quartier / de la ville saisis en texte libre,
 *   grâce à l'onglet Quartiers_FI (table de correspondance) + rapprochement automatique
 */
const FamilleService = (function () {
  const TABLE_SHEET = 'Quartiers_FI';
  const TABLE_HEADERS = ['Quartier saisi', 'Famille', 'Nb visiteurs'];
  const TRANCHES_JEUNES = ['10 18', 'moins de 18', '13 17', '15 17', '18 25', '18 24', '18 30'];
  const VILLES_LE_MANS = ['', 'le mans', 'mans', 'le mans 72000', 'le mans france', '72000', '72100'];

  let familles = null;   // [{nom, adresse, pilote, type}]
  let table = null;      // { cléQuartier: nomFamille }

  /* ------------------------------------------------------------------ */
  function getFamilles() {
    if (familles) return familles;
    const cfg = ConfigService.getSheet('FI_ET_FIJ');
    const C = cfg.COLONNES;
    familles = SheetCache.values(cfg.NAME).slice(1)
      .map(r => ({
        nom: TextUtils.clean(r[C.FAMILLE - 1]).toString(),
        adresse: TextUtils.clean(r[C.ADRESSE - 1]).toString(),
        pilote: TextUtils.clean(r[C.PILOTE - 1]).toString(),
        type: (TextUtils.clean(r[C.TYPE - 1]) || 'FI').toString().toUpperCase()
      }))
      .filter(f => f.nom);
    return familles;
  }

  /** Clé "racine" : sans accents, pluriels ni article ("Les Glonnières" -> "glonniere") */
  function stem(value) {
    return TextUtils.key(value).split(' ')
      .filter(w => w && !['le', 'la', 'les', 'de', 'du', 'des'].includes(w))
      .map(w => w.replace(/s$/, ''))
      .join(' ');
  }

  /**
   * Famille (FI ou FIJ) à utiliser pour un nom de famille et une tranche d'âge.
   * Les noms quasi identiques ("Gare sud" / "Gar sud") sont regroupés.
   */
  function choisir(familleNom, trancheAge) {
    const cible = stem(familleNom);
    if (!cible) return null;
    const candidats = getFamilles().filter(f => TextUtils.levenshtein(stem(f.nom), cible) <= 1);
    if (candidats.length <= 1) return candidats[0] || null;

    const tranche = TextUtils.key(trancheAge);
    const typeVoulu = TRANCHES_JEUNES.some(t => tranche.indexOf(t) !== -1) ? 'FIJ' : 'FI';
    return candidats.find(f => f.type === typeVoulu) ||
      candidats.find(f => stem(f.nom) === cible) || candidats[0];
  }

  /* ------------------------------------------------------------------ */
  function getTable() {
    if (table) return table;
    table = {};
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABLE_SHEET);
    if (!sheet) return table;
    SheetCache.values(TABLE_SHEET).slice(1).forEach(r => {
      const k = stem(r[0]);
      const fam = TextUtils.clean(r[1]).toString();
      if (k && fam) table[k] = fam;
    });
    return table;
  }

  /** Alias reconnus pour chaque famille : "Centre ville - Bollée" -> ["centre ville", "bollee"] */
  function aliasesFamilles() {
    const list = [];
    getFamilles().forEach(f => {
      f.nom.split(/\s+-\s+|\//).concat([f.nom]).forEach(part => {
        const a = stem(part);
        if (a.length >= 4) list.push({ alias: a, nom: f.nom });
      });
    });
    return list.sort((x, y) => y.alias.length - x.alias.length);
  }

  /** Rapprochement automatique d'un texte avec les noms de familles (sans la table) */
  function deviner(texte) {
    const q = stem(texte);
    if (q.length < 3) return null;
    const aliases = aliasesFamilles();
    // 1. le texte contient le nom d'une famille ("Glonnière centre sud", "Les Sablons")
    for (const a of aliases) {
      if ((' ' + q + ' ').indexOf(' ' + a.alias + ' ') !== -1) return a.nom;
    }
    // 2. faute de frappe ("Gloniere", "Sablin")
    let best = null;
    aliases.forEach(a => {
      const d = TextUtils.levenshtein(q, a.alias);
      const max = a.alias.length >= 8 ? 2 : 1;
      if (d <= max && (!best || d < best.d)) best = { d, nom: a.nom };
    });
    return best ? best.nom : null;
  }

  /**
   * Famille d'un visiteur à partir de son quartier et de sa ville
   * @returns {string|null} nom de la famille (tel qu'écrit dans FI_et_FIJ) ou null
   */
  function trouverPourVisiteur(quartier, ville) {
    const t = getTable();
    const q = stem(quartier);
    if (q && t[q]) return t[q];
    const parQuartier = deviner(quartier);
    if (parQuartier) return parQuartier;

    const v = TextUtils.key(ville);
    if (!VILLES_LE_MANS.includes(v)) {
      if (t[stem(ville)]) return t[stem(ville)];
      return deviner(ville); // ex : Allonnes, Arnage
    }
    return null;
  }

  /**
   * Ajoute des correspondances apprises (quartier -> famille choisie à la main)
   * @param {Array<[string,string]>} paires
   */
  function apprendre(paires) {
    if (!paires.length) return;
    const sheet = ensureTableSheet();
    const t = getTable();
    const nouvelles = paires.filter(([q]) => stem(q) && !t[stem(q)]);
    const vues = new Set();
    const rows = nouvelles.filter(([q]) => !vues.has(stem(q)) && vues.add(stem(q))).map(([q, f]) => [q, f, 1]);
    if (!rows.length) return;
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
    rows.forEach(([q, f]) => { t[stem(q)] = f; });
    SheetCache.invalidate(TABLE_SHEET);
  }

  /**
   * Crée / complète l'onglet Quartiers_FI avec tous les quartiers saisis dans Phoning.
   * Les lignes existantes sont conservées ; les nouvelles sont pré-remplies par suggestion.
   * @returns {{ajoutes:number, suggeres:number, aCompleter:number}}
   */
  function mettreAJourTable() {
    const { COLONNES } = getConstants();
    const sheet = ensureTableSheet();
    const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues() : [];
    const byKey = {};
    existing.forEach(r => { const k = stem(r[0]); if (k) byKey[k] = r; });

    // Comptage des quartiers (et villes hors Le Mans) saisis dans Phoning
    const counts = {};
    SheetCache.values(ConfigService.get().ONGLET.PHONING).slice(1).forEach(row => {
      const quartier = TextUtils.clean(row[COLONNES.QUARTIER - 1]).toString();
      const ville = TextUtils.clean(row[COLONNES.VILLE - 1]).toString();
      const texte = quartier || (VILLES_LE_MANS.includes(TextUtils.key(ville)) ? '' : ville);
      const k = stem(texte);
      if (!k) return;
      counts[k] = counts[k] || { texte, n: 0 };
      counts[k].n++;
    });

    let ajoutes = 0, suggeres = 0;
    Object.keys(counts).forEach(k => {
      if (byKey[k]) { byKey[k][2] = counts[k].n; return; }
      const suggestion = deviner(counts[k].texte) || '';
      byKey[k] = [counts[k].texte, suggestion, counts[k].n];
      ajoutes++;
      if (suggestion) suggeres++;
    });

    const rows = Object.values(byKey).sort((a, b) => (b[2] || 0) - (a[2] || 0));
    if (rows.length) {
      sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, rows.length), 3).clearContent();
      sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    }
    table = null;
    SheetCache.invalidate(TABLE_SHEET);
    return { ajoutes, suggeres, aCompleter: rows.filter(r => !r[1]).length };
  }

  function ensureTableSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(TABLE_SHEET);
    if (sheet) return sheet;

    sheet = ss.insertSheet(TABLE_SHEET);
    sheet.getRange(1, 1, 1, 3).setValues([TABLE_HEADERS]).setFontWeight('bold').setBackground('#e8eaed');
    sheet.setFrozenRows(1);
    const fiCfg = ConfigService.getSheet('FI_ET_FIJ');
    const listeFamilles = SpreadsheetApp.newDataValidation()
      .requireValueInRange(ss.getSheetByName(fiCfg.NAME).getRange('A2:A'), true)
      .setAllowInvalid(false).build();
    sheet.getRange(2, 2, sheet.getMaxRows() - 1, 1).setDataValidation(listeFamilles);
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 200);
    return sheet;
  }

  function reset() {
    familles = null;
    table = null;
  }

  return { getFamilles, choisir, trouverPourVisiteur, deviner, apprendre, mettreAJourTable, reset };
})();
