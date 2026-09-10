# État d'avancement, limites connues et recommandations

Document rédigé avec honnêteté : l'objectif est de permettre à quiconque reprend ce projet de savoir exactement sur quoi s'appuyer sans devoir tout revérifier.

## Fonctions terminées et fonctionnelles

**Fondations**
- Schéma PostgreSQL complet (53 tables) avec Row Level Security sur chaque table métier, testée pour de vrai (isolation multi-organisation, permissions par rôle).
- Authentification (inscription, connexion, réinitialisation de mot de passe, confirmation par courriel), création et sélection d'organisation, invitation par lien.
- 9 rôles standards avec permissions granulaires (module × action), matrice complète dans `docs/PERMISSIONS.md`.
- Interface originale (identité visuelle, composants) en français, responsive (ordinateur/tablette/mobile), thèmes clair/sombre.

**Modules métier** (CRUD réel, formulaires validés, workflows complets, pas de données fictives)
- Emplacements (hiérarchie), équipements (registre complet, sous-composantes, coûts/temps d'arrêt cumulatifs, import/export CSV), codes QR (génération, impression, scan, résolution vers la bonne fiche).
- Demandes de maintenance (portail, workflow d'approbation, conversion en bon de travail sans ressaisie).
- Bons de travail (cycle de vie complet, vues liste/Kanban/calendrier/« mes travaux », tâches, pièces utilisées, temps, commentaires, fichiers, clôture avec cause/solution).
- Procédures/inspections (constructeur visuel à 15 types de champs, logique conditionnelle, exécution avec score et statut, échec → bon de travail correctif).
- Compteurs (lectures manuelles, historique, graphique).
- Plans de maintenance préventive (déclencheurs calendaires et sur compteurs, suivi de conformité, génération planifiée via un point d'entrée dédié).
- Automatisations (moteur de règles, journal, deux déclencheurs réellement branchés sur des évènements de l'application).
- Pièces et inventaire (transactions de stock complètes, pièces compatibles, alerte de stock faible).
- Fournisseurs et achats (workflow complet demande → commande → réception partielle/totale).
- Analyse des causes (5 pourquoi, diagramme d'Ishikawa, actions correctives, suggestions IA).
- Rapports (indicateurs de fiabilité et de coûts, graphiques, export CSV).
- Calendrier (glisser-déposer, détection de conflits par technicien).
- Utilisateurs et équipes, paramètres, notifications, journal d'audit (partiel — voir limites).
- Couche d'assistance IA optionnelle et débrayable, quatre fonctions branchées à l'interface.
- PWA installable (manifeste, icônes, service worker réseau-prioritaire pour la navigation / cache-prioritaire pour les fichiers statiques) avec file d'attente de synchronisation hors ligne dans IndexedDB : un technicien sans connexion peut changer le statut d'un bon de travail, le clôturer, cocher des tâches, ajouter du temps ou un commentaire — chaque action est mise en file, rejouée automatiquement dès le retour en ligne (avec nouvelles tentatives, indicateur visuel de synchronisation dans l'en-tête, et un avertissement `beforeunload` si des modifications non synchronisées seraient perdues en fermant l'onglet).

## Limites connues

- **Journal d'audit partiel** : couvre les invitations, changements de rôle, retraits de membres et modifications des paramètres d'organisation, mais pas encore l'ensemble des mutations de l'application (création/modification d'équipements, bons de travail, etc.). Étendre `recordAuditEntry` (`src/lib/audit.ts`) aux autres actions sensibles est mécanique mais n'a pas été fait par manque de temps.
- **Suppression physique plutôt que logique** pour certaines entités (équipements, pièces, fournisseurs) : une contrainte de clé étrangère empêche déjà la perte de données historiques (la suppression échoue si l'enregistrement est référencé ailleurs), mais un enregistrement jamais utilisé est supprimé physiquement plutôt que marqué comme archivé, alors que la colonne `deleted_at` existe déjà dans le schéma pour ces tables. Un correctif consisterait à remplacer le `DELETE` par une mise à jour de `deleted_at` dans les actions correspondantes et à filtrer ces enregistrements dans les listes.
- **Rôles personnalisés** : modélisés dans la base de données (`roles.org_id`) et couverts par les politiques RLS, mais sans interface de création dans l'application.
- **Comparaison du secret d'automatisation** (`x-automations-secret`) n'est pas en temps constant (`!==` plutôt que `crypto.timingSafeEqual`) — risque théorique très faible étant donné la longueur recommandée du secret, mais une amélioration de sécurité en profondeur facile à apporter.
- **Traduction anglaise incomplète** : le vocabulaire de navigation est bilingue, mais le contenu détaillé de chaque page est rédigé en français uniquement pour l'instant.
- **Fonctions IA non branchées à une interface** : proposition de procédure à partir d'un manuel PDF, résumé de fin de quart, question en langage naturel sur les rapports — le code du fournisseur existe déjà (`src/lib/ai/anthropic-provider.ts`) mais n'est pas encore relié à un bouton dans l'application.
- **Portail public pour employés sans compte complet** (mentionné dans le cahier des charges) : non implémenté. La demande d'une personne sans compte nécessiterait soit l'authentification anonyme de Supabase avec un rôle limité, soit un jeton à usage unique — à concevoir.
- **Rapports envoyés par courriel de façon planifiée** : non implémenté (aucun service d'envoi de courriels n'est configuré dans ce projet).
- **Tableaux de bord personnalisables par glisser-déposer** : la page Rapports présente un ensemble fixe (mais réel et complet) d'indicateurs plutôt qu'un constructeur de tableaux de bord.

## Ce qui n'a pas pu être vérifié dans cet environnement de développement

Cet environnement ne dispose ni de Docker ni d'un projet Supabase hébergé (voir `README.md`). En conséquence :

- Le script de données de démonstration (`db/seed/seed-demo-org.ts`) a été écrit et vérifié statiquement (compilation TypeScript propre) mais **jamais exécuté avec succès contre un vrai backend** dans cette session — il appelle l'API d'administration de Supabase Auth, indisponible ici.
- Les 13 fichiers de tests de bout en bout Playwright (14 tests, voir `e2e/README.md`) ont été rédigés contre le code réel des pages (routes, labels et sélecteurs vérifiés dans le code source, pas devinés) pour les parcours obligatoires du cahier des charges, et leur structure a été validée (`npx playwright test --list` les collecte tous sans erreur), mais ils **n'ont pas pu être exécutés jusqu'au succès** faute d'application en cours d'exécution connectée à un vrai Supabase.
- L'authentification réelle, l'envoi de courriels transactionnels et le stockage de fichiers réel n'ont jamais été exercés de bout en bout dans cette session — seule leur intégration côté code a pu être vérifiée (compilation, cohérence des appels au SDK Supabase).

Ce qui **a** été vérifié pour de vrai dans cet environnement : le schéma SQL complet s'applique sans erreur, les politiques RLS isolent réellement les organisations (test SQL direct, impersonation d'utilisateurs), l'application compile et se construit en production sans erreur (~65 routes), le code respecte le mode strict de TypeScript, et les tests unitaires passent.

## Recommandations pour la prochaine version

1. Configurer un vrai projet Supabase (ou `supabase start` avec Docker) et exécuter `db:seed:demo` puis la suite Playwright complète pour valider les 13 parcours de bout en bout du cahier des charges.
2. Étendre le journal d'audit à l'ensemble des mutations sensibles.
3. Convertir les suppressions physiques restantes (équipements, pièces, fournisseurs) en suppressions logiques.
4. Ajouter l'interface de création de rôles personnalisés.
5. Mettre en place un service d'envoi de courriels (invitations, rapports planifiés) et un portail de demande public pour les employés sans compte complet.
6. Compléter la traduction anglaise du contenu détaillé de chaque page.
7. Brancher les fonctions IA restantes (procédure depuis un manuel, résumé de quart, questions en langage naturel sur les rapports) à des boutons dans l'interface.
8. Mettre en place les sauvegardes automatiques et tester la procédure de restauration (voir `docs/BACKUP_RESTORE.md`).
