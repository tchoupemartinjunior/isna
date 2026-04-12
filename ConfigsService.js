const ConfigService = (function () {
  const CONFIG = {
    ONGLET: {
      PHONING: 'Phoning',
      ACCUEIL: 'Accueil'
    },

    STATUT: {
      A_CONTACTER: 'A contacter'
    },

    FORMS: {
      SUIVI: {
        ID: '1_24f4KyTp6BsaCQjOk6x9NikOLt0OFHUdZJMGf7hpTI',
        QUESTIONS: {
          PERSONNE_SUIVIE: 2,
          MEMBRE_STAFF: 3
        }
      },
      COMPTE_RENDU_PHONING: {
        ID: '1pb4vobWcjzNa2kcBRSxkjmwscQUZgVB0aVCwqdwdPGc',
        QUESTIONS: {
          PERSONNE_A_CONTACTER: 0,
          PERSONNE_QUI_CONTACTE: 1
        }
      }
    },

    SHEETS: {
      PHONING: {
        NAME: 'Phoning',
        RANGE_FOR_FORMS: 'B2:G',

        INDEX_FOR_FORMS: {
          PERSONNE: 0,
          STATUT: 5
        },

        COLONNES: {
          DATE_PREMIERE_VISITE: 1,
          PERSONNE_A_CONTACTER: 2,
          STAFF_PHONING: 3,
          MESSAGE: 4,
          LIEN_WHATSAPP: 5,
          STATUT_INTEGRATION: 6,
          STATUT_PHONING: 7,
          NOM: 8,
          PRENOM: 9,
          TELEPHONE: 10,
          QUARTIER: 11,
          TRANCHE_AGE: 12,
          ETAT_CIVIL: 13,
          VILLE: 14,
          A_CONNU_EGLISE_PAR: 15,
          SEXE: 16,
          INVITE_PAR: 17,
          PRIERE_SALUT: 18,
          FREQUENTE_EGLISE: 19,
          ANCIENNE_EGLISE: 20,
          INTEGRER_EGLISE: 22
        }
      },

      STAFF_PHONING: {
        NAME: 'Staff_phoning',
        RANGE: 'D2:D'
      }
    }
  };

  return {
    get: () => CONFIG,

    getStatut: () => CONFIG.STATUT,

    getSheet: (name) => CONFIG.SHEETS[name],

    getForm: (name) => CONFIG.FORMS[name]
  };
})();