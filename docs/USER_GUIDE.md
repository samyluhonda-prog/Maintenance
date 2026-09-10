# Guide d'utilisation

Ce guide couvre les tâches courantes pour les équipes de maintenance (techniciens, superviseurs, planificateurs, employés demandeurs).

## Se connecter et choisir une organisation

Rendez-vous sur la page d'accueil, connectez-vous ou créez un compte. Si vous appartenez à plusieurs organisations, un sélecteur apparaît après connexion ; sinon vous êtes dirigé directement vers le tableau de bord de votre organisation.

## Signaler un problème (demande de maintenance)

1. Menu **Demandes** → **Nouvelle demande**, ou depuis la fiche d'un équipement (bouton **Signaler un problème**), ou en scannant le code QR de l'équipement (icône de scan dans la barre de navigation).
2. Remplissez le titre, la description, l'équipement concerné, la catégorie, le degré d'urgence, et cochez si l'équipement est actuellement arrêté.
3. Vous pouvez dicter votre description (bouton **Dicter**, si votre navigateur le permet) puis laisser l'assistant IA la structurer automatiquement (bouton **Structurer avec l'IA**, si configuré pour votre organisation) — vérifiez toujours le résultat avant d'envoyer.
4. **Soumettre la demande** l'envoie pour évaluation ; **Enregistrer comme brouillon** la garde modifiable.
5. Suivez le statut de votre demande depuis **Demandes** : soumise → en évaluation → approuvée ou refusée → convertie en bon de travail une fois prise en charge.

## Exécuter un bon de travail (technicien)

1. **Mes travaux** (page d'accueil mobile) liste vos bons de travail du jour et à venir.
2. Ouvrez un bon de travail pour voir ses détails, consignes de sécurité, tâches à cocher, pièces à utiliser.
3. Onglet **Tâches** : cochez chaque étape au fur et à mesure.
4. Onglet **Pièces** : enregistrez les pièces utilisées — le stock est déduit automatiquement.
5. Onglet **Temps** : enregistrez vos heures de travail (début/fin).
6. Onglet **Commentaires** / **Fichiers** : ajoutez des notes, photos ou documents.
7. Changez le statut du bon de travail au fil de l'avancement (menu déroulant en haut de la page). Pour **clôturer**, la cause de la panne et la solution appliquée doivent être renseignées.
8. **Sans connexion** : les changements de statut, cases à cocher, heures et commentaires effectués hors ligne sont mis en file d'attente et synchronisés automatiquement au retour du réseau (indicateur en haut de l'écran). Voir les limites de ce mode dans `docs/ROADMAP.md`.

## Exécuter une procédure/inspection

Depuis un bon de travail ou depuis **Procédures** → une procédure → **Exécuter**, répondez à chaque champ (cases à cocher, oui/non, mesures, photos, signature...). Les champs conditionnels n'apparaissent que si pertinents. À la fin, un résultat pass/échec et un score sont calculés automatiquement ; en cas d'échec, un bouton permet de créer immédiatement un bon de travail correctif.

## Scanner un code QR

Depuis n'importe quelle page de l'organisation, l'icône de scan ouvre la caméra (ou permet la saisie manuelle du code). Le scan d'un équipement, d'un emplacement ou d'une pièce ouvre directement sa fiche.

## Consulter le calendrier

**Calendrier** affiche les bons de travail par échéance ; glissez-déposez un bon de travail vers une autre date pour le replanifier. Un avertissement apparaît si un même technicien a plusieurs travaux le même jour.

## Notifications

L'icône de cloche et la page **Notifications** listent vos alertes (demandes critiques, échéances, etc.). Marquez-les comme lues individuellement ou toutes à la fois.
