/**
 * ============================
 * StringNormalizer
 * ============================
 * Centralise toutes les normalisations de chaînes
 * Élimine les duplications et assure la cohérence
 */

const StringNormalizer = (function () {
    /**
     * Normalise une chaîne de caractères (trim, minuscules, espaces multiples)
     * @param {any} value - Valeur à normaliser
     * @param {Object} options - Options de normalisation
     * @param {boolean} options.toLowerCase - Convertir en minuscules (défaut: true)
     * @param {boolean} options.removeExtraSpaces - Remplacer espaces multiples (défaut: true)
     * @returns {string} Chaîne normalisée
     */
    function normalize(value, options = {}) {
        const {
            toLowerCase = true,
            removeExtraSpaces = true
        } = options;

        // Gère null/undefined
        if (value === null || value === undefined) {
            return '';
        }

        let normalized = value.toString().trim();

        // Supprimer espaces multiples
        if (removeExtraSpaces) {
            normalized = normalized.replace(/\s+/g, ' ');
        }

        // Convertir en minuscules
        if (toLowerCase) {
            normalized = normalized.toLowerCase();
        }

        return normalized;
    }

    /**
     * Normalise un nom (cas courant)
     * @param {any} name - Nom à normaliser
     * @returns {string} Nom normalisé
     */
    function normalizeName(name) {
        return normalize(name, {
            toLowerCase: true,
            removeExtraSpaces: true
        });
    }

    /**
     * Normalise un statut (trim sans conversion case)
     * @param {any} status - Statut à normaliser
     * @returns {string} Statut normalisé
     */
    function normalizeStatus(status) {
        return normalize(status, {
            toLowerCase: false,
            removeExtraSpaces: true
        });
    }

    /**
     * Vérifie si deux chaînes sont égales après normalisation
     * @param {any} str1 - Première chaîne
     * @param {any} str2 - Deuxième chaîne
     * @returns {boolean}
     */
    function areEqual(str1, str2) {
        return normalize(str1) === normalize(str2);
    }

    return {
        normalize,
        normalizeName,
        normalizeStatus,
        areEqual
    };
})();
