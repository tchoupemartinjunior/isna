/**
 * CommonUtils.js
 * Utilitaires partagés : texte, téléphones, dates, en-têtes de colonnes,
 * et cache de lecture des onglets (une seule lecture par exécution).
 */

/* =========================================================================
 * TEXTE
 * ========================================================================= */
function isDate(value) {
  return Object.prototype.toString.call(value) === '[object Date]';
}

const TextUtils = (function () {
  /** Nettoie une valeur : trim, espaces multiples, erreurs Sheets (#N/A...) -> '' */
  function clean(value) {
    if (value === null || value === undefined) return '';
    if (isDate(value)) return value;
    const s = value.toString().replace(/[\s ]+/g, ' ').trim();
    if (/^#(N\/A|REF!|VALUE!|ERROR!|NAME\?|DIV\/0!)$/i.test(s)) return '';
    return s;
  }

  /** Clé de comparaison : minuscules, sans accents ni ponctuation */
  function key(value) {
    if (value === null || value === undefined) return '';
    return value.toString()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** "jean-olivier" -> "Jean-Olivier" */
  function titleCase(value) {
    const s = clean(value);
    if (!s) return '';
    return s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
  }

  function upper(value) {
    return clean(value).toString().toUpperCase();
  }

  /** Distance d'édition (fautes de frappe : "Gloniere" ~ "Glonnière") */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  return { clean, key, titleCase, upper, levenshtein };
})();

/* =========================================================================
 * TÉLÉPHONES
 * ========================================================================= */
const PhoneUtils = (function () {
  const COUNTRY_CODE = '33';

  function isDateLike(value) {
    return isDate(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(value).trim());
  }

  /**
   * Format international sans "+" pour wa.me
   * 0749514646 / 749514646 / +33 7 49... -> 33749514646 ; +229 66547304 -> 22966547304
   */
  function toWhatsApp(phone) {
    if (phone === null || phone === undefined || isDateLike(phone)) return '';
    const raw = phone.toString().trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+')) return digits;
    if (digits.startsWith('00')) return digits.substring(2);
    if (digits.length === 10 && digits.startsWith('0')) return COUNTRY_CODE + digits.substring(1);
    if (digits.length === 9) return COUNTRY_CODE + digits; // 0 initial perdu par Sheets
    return digits;
  }

  /**
   * Format lisible pour stockage / affichage
   * 659249858 -> "06 59 24 98 58" ; +229 66547304 -> "+229 66547304" ; date parasite -> ''
   */
  function toDisplay(phone) {
    if (phone === null || phone === undefined || isDateLike(phone)) return '';
    const raw = phone.toString().trim();
    let digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.startsWith('+') && !raw.startsWith('+33')) return raw.replace(/\s+/g, ' ');
    if (digits.startsWith('0033')) digits = digits.substring(4);
    else if (digits.startsWith('33') && digits.length === 11) digits = digits.substring(2);
    if (digits.length === 9) digits = '0' + digits;
    if (digits.length === 10 && digits.startsWith('0')) return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
    return raw;
  }

  return { toWhatsApp, toDisplay };
})();

/* =========================================================================
 * DATES
 * ========================================================================= */
const DateUtils = (function () {
  const MIN_YEAR = 2000; // en dessous : valeur parasite (ex. 01/01/1970)

  /** Date | "dd/MM/yyyy[ HH:mm[:ss]]" -> Date (ou null) */
  function parse(value) {
    if (!value) return null;
    if (isDate(value)) {
      return isNaN(value.getTime()) || value.getFullYear() < MIN_YEAR ? null : value;
    }
    const m = value.toString().trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    return d.getFullYear() < MIN_YEAR ? null : d;
  }

  /** Date sans l'heure */
  function dayOnly(value) {
    const d = parse(value);
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : '';
  }

  function format(value, pattern = 'dd/MM/yyyy') {
    const d = parse(value);
    return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), pattern) : '';
  }

  /** Heure issue d'une cellule "heure" (Date 1899 ou texte) -> "HH:mm" */
  function formatTime(value) {
    if (!value) return '';
    if (isDate(value)) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
    return value.toString().substring(0, 5);
  }

  function daysBetween(a, b) {
    return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
  }

  return { parse, dayOnly, format, formatTime, daysBetween };
})();

/* =========================================================================
 * EN-TÊTES : retrouver une colonne par son nom, quel que soit son emplacement
 * ========================================================================= */
const HeaderMap = (function () {
  /**
   * @param {Array} headerRow - première ligne de l'onglet
   * @returns {{index:function(string|string[]):number, get:function(Array, string|string[]):any}}
   */
  function build(headerRow) {
    const map = {};
    headerRow.forEach((h, i) => {
      const k = TextUtils.key(h);
      if (k && !(k in map)) map[k] = i;
    });

    function index(aliases) {
      const list = Array.isArray(aliases) ? aliases : [aliases];
      for (const a of list) {
        const k = TextUtils.key(a);
        if (k in map) return map[k];
      }
      return -1;
    }

    return {
      index,
      get(row, aliases) {
        const i = index(aliases);
        return i === -1 ? '' : row[i];
      }
    };
  }

  return { build };
})();

/* =========================================================================
 * CACHE DE LECTURE : chaque onglet n'est lu qu'une fois par exécution
 * ========================================================================= */
const SheetCache = (function () {
  let cache = {};

  /** Toutes les valeurs de l'onglet (en-tête inclus) */
  function values(sheetName) {
    if (!cache[sheetName]) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sheet) throw new Error(`Onglet "${sheetName}" introuvable`);
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      cache[sheetName] = lastRow && lastCol
        ? sheet.getRange(1, 1, lastRow, lastCol).getValues()
        : [[]];
    }
    return cache[sheetName];
  }

  function invalidate(sheetName) {
    if (sheetName) delete cache[sheetName];
    else cache = {};
  }

  return { values, invalidate };
})();

/* =========================================================================
 * VERROU : évite deux exécutions simultanées (double clic sur le menu)
 * ========================================================================= */
function withLock(fn, timeoutMs = 5000) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(timeoutMs)) {
    throw new Error('Un autre traitement est déjà en cours, réessaie dans quelques secondes.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
