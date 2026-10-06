class NewcomersService {

  constructor(sheetName = "Formulaire d'accueil") {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!this.sheet) throw new Error(`Feuille "${sheetName}" introuvable`);

    this.headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
    this.data = this.sheet.getRange(
      2,
      1,
      this.sheet.getLastRow() - 1,
      this.sheet.getLastColumn()
    ).getValues();
  }

  /** =========================
   * Mapper toutes les lignes en objets Newcomer
   ========================= */
  getAll() {
    return this.data.map(e => new Newcomer(
      e[0],  // Horodateur
      e[1],  // Identifiant
      e[2],  // Adresse e-mail
      e[3],  // Score
      e[4],  // Nom
      e[5],  // Prénom
      e[6],  // Numéro de téléphone
      e[7],  // Ville de résidence
      e[8],  // Préciser le quartier (Si Le Mans)
      e[9],  // Tranche d’âge
      e[10], // État Civil
      e[11], // Avez-vous fait la prière du salut lors d'un culte à ICC Le Mans ?
      e[12], // Fréquentez vous déjà une église ?
      e[13], // Êtes-vous baptisé(e) par immersion ?
      e[14], // Avez-vous des questions ?
      e[15], // Comment avez vous connu l'église?
      e[16], // Nom et prénom de l'inviteur (membre de ICC Le Mans)
      e[17], // Sexe
      e[18], // Si vous êtes déjà membre d’une église, préciser laquelle
      e[19], // Préciser la ville si différente du Mans
      e[20], // Souhaitez vous être recontacté et informé(e) des événements à venir ?
      e[21], // Année de votre première venue
      e[22]  // Prenoms & noms
    ));
  }

  /** =========================
   * Filtrer par colonne (index uniquement)
   ========================= */
_filterByColumn(index, value) {
  return this.data
    .filter(row => {
      const cell = row[index];
      // si c'est une string, trim, sinon comparer directement
      return (typeof cell === "string" ? cell.trim() : cell) === value;
    })
    .map(row => new Newcomer(
      row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7],
      row[8], row[9], row[10], row[11], row[12], row[13], row[14], row[15],
      row[16], row[17], row[18], row[19], row[20], row[21], row[22]
    ));
}

  /** =========================
   * Getters simples par index
   ========================= */

  getByNom(nom) {
    return this._filterByColumn(4, nom); // Nom
  }

  getByPrenom(prenom) {
    return this._filterByColumn(5, prenom); // Prénom
  }

  getByTelephone(tel) {
    return this._filterByColumn(6, tel); // Numéro de téléphone
  }

  getByEmail(email) {
    return this._filterByColumn(2, email); // Adresse e-mail
  }

  getByIdentifiant(id) {
    return this._filterByColumn(1, id); // Identifiant
  }

  /** =========================
   * Recherche multi-critères (ex: {Nom:"Test", Ville:"LE MANS"})
   ========================= */
  search(criteria = {}) {
    return this.getAll().filter(row =>
      Object.keys(criteria).every((key) => {
        const index = this.headers.indexOf(key);
        return index !== -1 && row[Object.keys(row).indexOf(key)] === criteria[key];
      })
    );
  }
}
