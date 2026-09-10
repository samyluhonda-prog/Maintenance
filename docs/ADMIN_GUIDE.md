# Guide d'administration

Ce guide s'adresse aux propriétaires et administrateurs d'une organisation Intervia.

## Créer une organisation et l'assistant d'accueil

À la première connexion, créez votre organisation (nom uniquement — un identifiant d'URL est généré automatiquement). Vous devenez automatiquement **Propriétaire**. Ensuite, dans l'ordre suggéré :

1. **Emplacements** : créez la hiérarchie de vos installations (site → bâtiment → zone → ligne de production → système).
2. **Équipements** : créez vos équipements (import CSV disponible pour un volume important), chacun reçoit un code QR unique imprimable.
3. **Utilisateurs et équipes** : invitez votre équipe (voir ci-dessous) et assignez les rôles appropriés.
4. **Procédures** : créez vos premières listes de vérification/inspections.
5. **Plans de maintenance** : configurez les entretiens préventifs récurrents.
6. **Pièces et fournisseurs** : constituez votre inventaire et votre répertoire de fournisseurs.

## Gérer les utilisateurs et les rôles

Page **Utilisateurs et équipes** :

- **Inviter un membre** : générez un lien d'invitation (aucun service courriel n'est requis — copiez et transmettez le lien vous-même, par exemple par courriel ou messagerie interne). Le lien expire après 14 jours.
- Modifiez le rôle d'un membre existant via le menu déroulant dans la liste.
- Retirez un membre (il perd immédiatement l'accès à toutes les données de l'organisation).
- Révoquez une invitation non encore acceptée.

Voir `docs/PERMISSIONS.md` pour la description complète des 9 rôles standards et de ce que chacun peut faire. Les rôles personnalisés sont pris en charge par la base de données mais ne disposent pas encore d'une interface de création dédiée (voir `docs/ROADMAP.md`).

## Paramètres de l'organisation

Page **Paramètres → Organisation** (administrateurs et propriétaire uniquement) : nom, langue par défaut, fuseau horaire.

## Automatisations

Page **Automatisations** : créez des règles « si (évènement) → alors (action) ». Évènements disponibles : création de demande, demande critique, changement de statut d'équipement, panne récurrente, bon de travail créé/terminé/en retard/non pris en charge, échec d'inspection, seuil de compteur atteint, pièce sous le seuil minimal. Actions disponibles : notification (à un rôle ou une personne), création automatique d'une demande d'achat. Le journal de chaque règle (page **Journal**) montre les déclenchements passés.

La génération automatique des bons de travail préventifs (selon les plans de maintenance) nécessite qu'un déclencheur externe (tâche planifiée) appelle régulièrement l'API du serveur — voir `docs/DEPLOYMENT.md`, section 4. En attendant sa mise en place, ou pour un contrôle ponctuel, le bouton **Vérifier maintenant** de la page **Plans de maintenance** déclenche la même évaluation manuellement.

## Rapports

Page **Rapports** : indicateurs de fiabilité (MTTR, MTBF estimé, disponibilité, conformité préventive), coûts (par équipement, main-d'œuvre, pièces), inventaire, pannes récurrentes, charge de travail par technicien, performance des fournisseurs, demandes par statut. Filtrez par plage de dates et exportez en CSV.

## Journal d'audit

Page **Journal d'audit** (administrateurs et propriétaire) : trace les invitations, changements de rôle, retraits de membres et modifications des paramètres de l'organisation. Ce journal ne couvre pas encore l'ensemble des actions de l'application — voir `docs/ROADMAP.md`.

## Sécurité et conformité

- Chaque organisation est strictement isolée des autres au niveau de la base de données (Row Level Security) — voir `docs/ARCHITECTURE.md`.
- Les permissions sont vérifiées côté serveur pour chaque action, indépendamment de ce que montre ou cache l'interface.
- Les fichiers joints (photos, documents) sont stockés dans des compartiments privés, accessibles uniquement via des liens signés temporaires.
- Les mots de passe doivent contenir au moins 10 caractères avec majuscule, minuscule et chiffre.
