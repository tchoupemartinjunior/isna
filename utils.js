function getConstants() {
  const COLONNES = ConfigService.getSheet('PHONING').COLONNES;
  return {
    STATUS_A_CONTACTER: ConfigService.getStatut().A_CONTACTER,
    COLONNES,
    ONGLETS: ConfigService.get().ONGLET,
    NUM_COLS: Math.max(...Object.values(COLONNES))
  };
}
