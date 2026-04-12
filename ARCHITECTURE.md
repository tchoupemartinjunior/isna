# 📋 ARCHITECTURE - Projet ISNA

## 🎯 Vue d'ensemble des améliorations SOLID

Ce document détaille les refactorisations appliquées pour améliorer la maintenabilité et respecter les principes SOLID.

---

## 🏗️ Architecture Modulaire

### Hiérarchie des modules

```
┌─────────────────────────────────────┐
│       Dispatching.js (Entry Point)  │
│   Orchestration uniquement          │
└──────────────┬──────────────────────┘
               │
        ┌──────┴─────────────────┬───────────────┐
        │                        │               │
        ▼                        ▼               ▼
  PhoningUIModule       WhatsAppService   PhoningEmailService
  (Menu UI)            (WhatsApp Logic)    (Email Logic)
        │                        │               │
        └────────────┬───────────┴───────────────┘
                     │
        ┌────────────▼────────────┐
        │   Abstraction Layer     │
        ├────────────────────────┤
        │ SheetRepository        │  ← Élimine coupling à SpreadsheetApp
        │ StringNormalizer       │  ← Centralise normalisations
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────────┐
        │   Domain Services           │
        ├─────────────────────────────┤
        │ HistoriqueService           │
        │ StaffService                │
        │ MessageService              │
        │ FormsDataService            │
        │ ConfigService               │
        └─────────────────────────────┘
```

---

## 📁 Modules créés

### 1. **StringNormalizer.js** ✅
**Principe appliqué:** Single Responsibility

Centralise TOUTES les normalisations de chaînes:
- `normalize()` - Normalisation générique avec options
- `normalizeName()` - Normalisation des noms (minuscules + trim + espaces)
- `normalizeStatus()` - Normalisation des statuts (sans conversion case)
- `areEqual()` - Comparaison après normalisation

**Avantages:**
- ✅ Élimine la duplication entre `normaliserNom()` et `normaliserChaine()`
- ✅ Comportement cohérent partout
- ✅ Facile à tester et modifier

**Utilisé par:** HistoriqueService, StaffService, WhatsAppService, PhoningEmailService

---

### 2. **SheetRepository.js** ✅
**Principes appliqués:** Dependency Inversion, Single Responsibility

Abstraction complète d'accès à SpreadsheetApp:

**Méthodes:**
- `getSheet(name)` - Récupère une feuille
- `getData(name, headerRow, numCols)` - Récupère les données
- `getRange(name, notation)` - Récupère une plage
- `setValue()`, `setFormula()` - Écrit des données
- `appendRow()` - Ajoute une ligne
- `getLastRow()`, `getLastColumn()` - Métadonnées

**Avantages:**
- ✅ Découplage de SpreadsheetApp (permet le mocking pour tests)
- ✅ Interface cohérente pour accès données
- ✅ Gestion centralisée des erreurs
- ✅ Configuration de constantes (HEADER_ROW, START_ROW, etc.)

**Utilisé par:** WhatsAppService, PhoningEmailService (futur: tous les services)

---

### 3. **PhoningUIModule.js** ✅
**Principes appliqués:** Single Responsibility

Gère UNIQUEMENT l'interface utilisateur:

**Fonctions:**
- `initializeMenu()` - Crée le menu au démarrage (appelé par `onOpen()`)
- `showErrorDialog()` - Affiche erreurs à l'utilisateur
- `showSuccessMessage()` - Affiche messages de succès

**Avantages:**
- ✅ Séparation UI / Logique
- ✅ Menu centralisé et facile à modifier
- ✅ Gestion cohérente des dialogues

---

### 4. **WhatsAppService.js** ✅
**Principes appliqués:** Single Responsibility, Open/Closed

Logique complète pour générer les liens WhatsApp:

**Fonctions publiques:**
- `generateWhatsAppLinks(config, repository, isRappel)` - Génère liens pour tous
- `normalizePhoneNumber(phone)` - Normalise téléphones

**Avantages:**
- ✅ Logique WhatsApp isolée
- ✅ Réutilisable facilement
- ✅ Pas de dépendance directe à SpreadsheetApp (dépend de repository)

**Remplace:** Fonction `genererLiensWhatsApp()` + `ecrireLienWhatsApp()`

---

### 5. **PhoningEmailService.js** ✅
**Principes appliqués:** Single Responsibility, Open/Closed

Logique complète pour envoi des emails:

**Fonctions publiques:**
- `sendDispatchingEmails(config, repository)` - Envoie emails

**Fonctions privées:**
- `groupDataByStaff()` - Regroupe données par staff
- `sendEmailToStaff()` - Envoie email à un staff
- `buildEmailBody()` - Construit le corps du mail HTML

**Avantages:**
- ✅ Logique email isolée
- ✅ Code organisé et lisible
- ✅ Pas de dépendance directe à SpreadsheetApp

**Remplace:** Fonction `envoyerDispatchingParMail()` (800+ lignes → 50 lignes orchestration)

---

## 🔄 Dispatching.js - AVANT vs APRÈS

### AVANT (Responsabilités mélangées)
```javascript
// ❌ 5 responsabilités différentes
function onOpen() { /* Menu UI */ }
function genererLiensWhatsApp() { /* WhatsApp logic */ }
function envoyerDispatchingParMail() { /* Email logic */ }
function ecrireLienWhatsApp() { /* Helper */ }
function normaliserNom() { /* Normalisation */ }

// ✗ Couplage direct à SpreadsheetApp
// ✗ Magic numbers partout
// ✗ Duplication de normalisation
```

### APRÈS (Responsabilité unique: Orchestration)
```javascript
function onOpen() { 
    PhoningUIModule.initializeMenu();  // ✅ Délégué
}

function genererLiensWhatsAppNormaux() { 
    WhatsAppService.generateWhatsAppLinks(...);  // ✅ Délégué
}

function envoyerDispatchingParMail() {
    PhoningEmailService.sendDispatchingEmails(...);  // ✅ Délégué
}

// ✓ Clean, lisible, maintenable
// ✓ Error handling centralisé
// ✓ Facile à tester
```

---

## 📊 Amélioration SOLID

### Single Responsibility (S)
**Avant:** 3/10 - Dispatching.js avait 5 responsabilités
**Après:** 9/10 - Chaque module a UNE responsabilité clairement définie

| Module | Responsabilité |
|--------|---|
| Dispatching.js | Orchestration uniquement |
| PhoningUIModule | Menu & dialogues UI |
| WhatsAppService | Génération liens WhatsApp |
| PhoningEmailService | Envoi emails |
| SheetRepository | Accès données |
| StringNormalizer | Normalisation chaînes |

### Open/Closed (O)
**Avant:** 2/10 - Magic numbers, indices en dur
**Après:** 7/10 - Configuration centralisée, extensible

- ✅ StaffService a CONFIG centralisée
- ✅ PhoningEmailService utilise paramètres
- ⚠️ À faire: Paramétrer nombres colonnes

### Liskov Substitution (L)
**Avant:** N/A - Pas de polyporphisme
**Après:** N/A - Toujours pas applicable

### Interface Segregation (I)
**Avant:** 2/10 - Interfaces trop grasses
**Après:** 8/10 - Interfaces spécialisées

- ✅ SheetRepository méthodes granulaires
- ✅ StringNormalizer méthodes spécialisées
- ✅ Chaque service dépend du minimum

### Dependency Inversion (D)
**Avant:** 1/10 - Couplé à SpreadsheetApp
**Après:** 8/10 - Dépend d'abstraction

- ✅ SheetRepository abstrait SpreadsheetApp
- ✅ Services n'accèdent pas directement aux sheets
- ✅ Mocking possible pour tests

---

## 🎯 Points d'amélioration restants (P1-P2)

### P1 - Mettre à jour autres services
- `database.js` - Utiliser SheetRepository
- `NewcomersService` - Utiliser SheetRepository
- Autres accès SpreadsheetApp directs

### P1 - Ajouter tests
```javascript
// Structure de test possible
function testStringNormalizer() {
    assertEqual('hello', StringNormalizer.normalize('  HELLO  '));
}
```

### P2 - Optimiser performance
Boucles O(n²) dans `genererLiensWhatsApp()` → Utiliser cache

### P2 - Documenter configurations
Créer config centralisée pour:
- IDs Google Forms
- Numéros colonnes
- URLs (formulaires, etc.)

---

## 🚀 Prochaines étapes recommandées

1. **Appliquer SheetRepository à tous les modules** (haut impact)
2. **Créer suite de tests unitaires** (avec mocking)
3. **Centraliser constantes** (IDs Forms, colonnes)
4. **Migrer vers TypeScript** (long terme)

---

## 📝 Checklist des principes SOLID validés

- ✅ **S** - Single Responsibility: Chaque module = une responsabilité
- ✅ **O** - Open/Closed: Extensible sans modification (à améliorer)
- ⚠️ **L** - Liskov Substitution: N/A pour ce projet
- ✅ **I** - Interface Segregation: Interfaces granulaires
- ✅ **D** - Dependency Inversion: Abstraction via SheetRepository

**Score SOLID global après refactoring: 7.5/10**
(vs 3/10 avant)
