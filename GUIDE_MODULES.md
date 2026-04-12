# 📚 Guide d'utilisation des nouveaux modules

## 🎯 Vue d'ensemble

Après le refactoring SOLID, le projet est organisé en modules spécialisés. Ce guide montre comment les utiliser.

---

## 📦 StringNormalizer

### Objectif
Normaliser cohérent toutes les chaînes de caractères du projet.

### Utilisation

**1. Normalisation générique:**
```javascript
// Trim, espaces multiples, minuscules
const normalized = StringNormalizer.normalize('  JOHN DOE  ');
// Résultat: 'john doe'

// Avec options
const keepCase = StringNormalizer.normalize('  JOHN', { toLowerCase: false });
// Résultat: '  JOHN' → 'JOHN' (trim + espaces)
```

**2. Normaliser un nom:**
```javascript
const staffName = StringNormalizer.normalizeName('  Jean-Pierre MARTIN  ');
// Résultat: 'jean-pierre martin'
// Utilisé par: StaffService, WhatsAppService
```

**3. Normaliser un statut:**
```javascript
const status = StringNormalizer.normalizeStatus('  A CONTACTER  ');
// Résultat: 'A CONTACTER' (sans lowercase)
// Utilisé par: WhatsAppService, comparaisons statuts
```

**4. Comparer deux chaînes normalisées:**
```javascript
const isEqual = StringNormalizer.areEqual('JOHN', '  john  ');
// Résultat: true
```

### Où c'est utilisé
- ❌ AVANT: `normaliserNom()` (2 implémentations différentes)
- ✅ APRÈS: `StringNormalizer` (source unique)

---

## 🗂️ SheetRepository

### Objectif
Abstraction d'accès à SpreadsheetApp pour:
- ✓ Élimine couplage direct
- ✓ Permet mocking pour tests
- ✓ Gestion centralisée erreurs

### Utilisation

**1. Créer une instance:**
```javascript
const repository = SheetRepository.create();
// Utilise SpreadsheetApp.getActiveSpreadsheet()

// Ou avec spreadsheet spécifique:
const repo2 = SheetRepository.create(customSpreadsheet);
```

**2. Récupérer une feuille:**
```javascript
const sheet = repository.getSheet('Phoning');
// Throw Error si sheet n'existe pas
```

**3. Récupérer des données:**
```javascript
const data = repository.getData('Phoning', 1, 22);
// headerRow=1, numCols=22
// Retourne: Array<Array> (sans header)
```

**4. Récupérer une plage:**
```javascript
const range = repository.getRange('Phoning', 'A1:Z100');
// Utilisation classique Google Sheets
```

**5. Écrire une valeur:**
```javascript
repository.setValue('Phoning', 2, 5, 'Nouvelle valeur');
// row=2, col=5, value='Nouvelle valeur'
```

**6. Écrire une formule:**
```javascript
repository.setFormula('Phoning', 2, 7, '=HYPERLINK("url"; "text")');
```

**7. Ajouter une ligne:**
```javascript
const newRowNumber = repository.appendRow('Phoning', ['a', 'b', 'c']);
```

---

## 🎨 PhoningUIModule

### Objectif
Gérer UNIQUEMENT l'interface utilisateur (menu, dialogues).

### Utilisation

**1. Initialiser le menu:**
```javascript
function onOpen() {
    PhoningUIModule.initializeMenu();
}
// Menu s'affiche automatiquement au démarrage
```

**2. Afficher une erreur:**
```javascript
PhoningUIModule.showErrorDialog('Erreur', 'Une erreur est survenue');
// Dialog: [❌ Erreur] "Une erreur est survenue" [OK]
```

**3. Afficher un succès:**
```javascript
PhoningUIModule.showSuccessMessage('Opération réussie!');
// Dialog: [✅ Succès] "Opération réussie!" [OK]
```

### Modification du menu
Pour ajouter/modifier le menu, éditer `PhoningUIModule.js`:
```javascript
function initializeMenu() {
    const ui = SpreadsheetApp.getUi();
    
    ui.createMenu(UI_TITLE)
        .addItem('Item 1', 'fonction1')
        .addItem('Item 2', 'fonction2')
        .addToUi();
}
```

---

## 📱 WhatsAppService

### Objectif
Encapsuler TOUTE la logique de génération liens WhatsApp.

### Utilisation

**Générer les liens WhatsApp pour tous les contacts:**
```javascript
const config = {
    ONGLETS: { PHONING: 'Phoning' },
    COLONNES: { /* ... */ },
    NUM_COLS: 22
};
const repository = SheetRepository.create();

WhatsAppService.generateWhatsAppLinks(config, repository, false);
// false = pas de rappel
// true = rappel

// La fonction:
// 1. Récupère toutes les données
// 2. Filtre par statut "A contacter"
// 3. Vérifie si contacté récemment
// 4. Génère liens WhatsApp
// 5. Écrit dans colonne LIEN_WHATSAPP
```

**Normaliser un numéro de téléphone:**
```javascript
const normalized = WhatsAppService.normalizePhoneNumber('+33 6 12 34 56 78');
// Résultat: '33612345678'
```

### Comment ça marche
1. Boucle sur chaque ligne
2. Vérifie statut = "A contacter"
3. Récupère historique de la personne
4. Si contactée récemment (7 jours) → marque "Effectué"
5. Sinon → génère lien WhatsApp avec message

---

## 📧 PhoningEmailService

### Objectif
Encapsuler TOUTE la logique d'envoi emails.

### Utilisation

**Envoyer le dispatching par email:**
```javascript
const config = {
    ONGLETS: { PHONING: 'Phoning' },
    COLONNES: { /* ... */ },
    NUM_COLS: 22
};
const repository = SheetRepository.create();

PhoningEmailService.sendDispatchingEmails(config, repository);
// La fonction:
// 1. Récupère les données phoning
// 2. Filtre par statut "A contacter"
// 3. Regroupe par staff
// 4. Récupère emails staff
// 5. Génère corps HTML
// 6. Envoie email à chaque staff
```

### Format de l'email
```
Bonjour [Staff],

Voici la liste des personnes à contacter:

1. [Personne]
[Lien WhatsApp cliquable]
[Message WhatsApp formaté]

2. [Personne 2]
...

Merci de remplir le formulaire...
Équipe Intégration – ICC Le Mans
```

---

## 🔧 HistoriqueService (modifié)

### Changements apportés
- ✅ Remplace `normaliserChaine()` → StringNormalizer
- ✅ Remplace `normaliserNom()` → StringNormalizer
- ❌ Logique reste identique

### Utilisation (inchangée)
```javascript
const historique = HistoriqueService.getHistorique('Jean Dupont');
// Retourne: Array<{date, heure, personneQuiAppelait, ...}>

const recentlyContacted = HistoriqueService.aEteContacteRecemment(
    historique, 
    'marie martin',  // staff
    7  // jours précédents
);
// Retourne: boolean
```

---

## 👥 StaffService (refactorisé)

### Changements apportés
- ✅ Élimine duplication `getStaffData()`
- ✅ Remplace `normaliserNom()` → StringNormalizer
- ✅ CONFIG centralisée

### Utilisation (inchangée)
```javascript
// Map { nom → téléphone }
const phoneMap = StaffService.construireStaffPhoneMap();
// Résultat: ['marie martin': '06 12 34 56 78', ...]

// Map { nom → {tel, email} }
const staffMap = StaffService.construireStaffMap();
// Résultat: ['marie martin': {tel: '06...', email: 'marie@...'},...]
```

---

## 🎯 Dispatching.js (refactorisé)

### Avant (responsabilités mélangées)
```javascript
function genererLiensWhatsApp() {
    // 60+ lignes de logique
}
function envoyerDispatchingParMail() {
    // 150+ lignes de logique
}
```

### Après (orchestration uniquement)
```javascript
function genererLiensWhatsAppNormaux() {
    const repository = SheetRepository.create();
    WhatsAppService.generateWhatsAppLinks(config, repository, false);
}

function envoyerDispatchingParMail() {
    const repository = SheetRepository.create();
    PhoningEmailService.sendDispatchingEmails(config, repository);
}
```

### Avantages
- ✅ Code lisible en 10 secondes
- ✅ Facile d'ajouter nouvelles actions
- ✅ Error handling systématique
- ✅ Logging cohérent

---

## 🚀 Créer une nouvelle action

### Exemple: Ajouter une action "Imprimer rapport"

**Étape 1:** Créer le service
```javascript
// PrintReportService.js
const PrintReportService = (function() {
    return {
        generateReport(config, repository) {
            // Logique d'impression
        }
    };
})();
```

**Étape 2:** Ajouter l'action dans Dispatching.js
```javascript
function imprimerRapport() {
    try {
        const config = { ONGLETS, COLONNES, NUM_COLS };
        const repository = SheetRepository.create();
        PrintReportService.generateReport(config, repository);
        Logger.log('✅ Rapport imprimé');
    } catch (error) {
        Logger.log(`❌ Erreur: ${error.message}`);
        PhoningUIModule.showErrorDialog('Erreur', error.message);
    }
}
```

**Étape 3:** Ajouter l'item au menu
```javascript
.addItem('🖨️ Imprimer rapport', 'imprimerRapport')
```

**Voilà!** Méthode claire, testable, réutilisable.

---

## 🧪 Tester les modules

### Tester StringNormalizer
```javascript
function testStringNormalizer() {
    const tests = [
        ['  JOHN  ', 'john'],
        ['Jean-Pierre', 'jean-pierre'],
        ['A CONTACTER', 'a contacter'],
    ];
    
    tests.forEach(([input, expected]) => {
        const result = StringNormalizer.normalize(input);
        console.assert(result === expected, `Failed: ${input} → ${result}`);
    });
    
    Logger.log('✅ StringNormalizer tests passed');
}
```

### Tester SheetRepository
```javascript
function testSheetRepository() {
    const repo = SheetRepository.create();
    
    // Doit lever une erreur pour sheet inexistante
    try {
        repo.getSheet('NonExistent');
        Logger.log('❌ Test failed: Should throw error');
    } catch (e) {
        Logger.log('✅ SheetRepository test passed');
    }
}
```

---

## 📋 Best Practices

### À faire ✅
- Utiliser `StringNormalizer` partout pour normalisations
- Utiliser `SheetRepository` pour accès données
- Try/catch autour des appels services
- Ajouter logging avec `Logger.log()`
- Documenter avec JSDoc

### À ne pas faire ❌
- Appeler SpreadsheetApp directement (utiliser SheetRepository)
- Créer 2 implémentations de la même logique
- Ignorer les erreurs
- Mélanger UI et logique
- Laisser du code sans contexte

---

**End of Guide**

Pour questions, consulter:
- ARCHITECTURE.md
- CHANGELOG.md
- Commentaires JSDoc des modules
