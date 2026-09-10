# Fonctions d'assistance IA

Intervia intègre une couche d'assistance IA **entièrement optionnelle** : l'application fonctionne normalement sans elle, et chaque suggestion générée doit être vérifiée par une personne avant d'être considérée comme fiable — aucune fonction cœur de métier n'en dépend.

## Activation

Définissez `ANTHROPIC_API_KEY` dans les variables d'environnement pour activer ces fonctions (modèle par défaut `claude-opus-5`, ajustable via `ANTHROPIC_MODEL`). En son absence, chaque bouton lié à l'IA affiche un message clair indiquant que la fonction n'est pas configurée, plutôt que d'échouer silencieusement ou de produire un résultat inventé.

Architecture : `src/lib/ai/provider.ts` sélectionne automatiquement `AnthropicAiProvider` ou `NoopAiProvider` selon la présence de la clé ; tout le reste de l'application appelle la même interface (`src/lib/ai/types.ts`) sans avoir besoin de savoir laquelle est active.

## Fonctions disponibles

| Fonction | Où | Description |
| --- | --- | --- |
| Résumé de l'historique d'un équipement | Fiche équipement | Résume les bons de travail passés en quelques phrases |
| Estimation du niveau de risque de panne | Fiche équipement | Estimation qualitative (faible/modéré/élevé) à partir des pannes récentes et du délai depuis le dernier entretien préventif — toujours présentée comme une estimation, jamais comme un fait |
| Structuration d'une demande à partir d'un texte libre ou dicté | Nouvelle demande | Dictée vocale (API du navigateur) puis mise en forme automatique en titre, description, urgence et équipement concerné |
| Suggestion de causes de panne | Analyse des causes (RCA) | Propose des hypothèses de cause classées par niveau de confiance, à valider par un technicien |

Fonctions prévues dans la spécification mais non branchées à une interface à ce stade (l'implémentation du fournisseur existe déjà dans `src/lib/ai/anthropic-provider.ts` et peut être exposée rapidement) : proposition de procédure à partir d'un manuel PDF, résumé de fin de quart, réponse en langage naturel sur des données de rapport déjà agrégées. Voir `docs/ROADMAP.md`.

## Garde-fous

- Chaque réponse est explicitement étiquetée comme suggestion dans l'interface (« Estimation générée par IA à titre indicatif », « Hypothèses à valider par un technicien »).
- Le fournisseur IA n'a jamais un accès direct à la base de données ni la capacité d'exécuter des requêtes arbitraires — les données qu'on lui transmet sont toujours pré-agrégées côté serveur (voir par exemple `structureRequestFromText`, qui ne reçoit que la liste des noms d'équipements, jamais un accès à la base).
- Une erreur ou une réponse mal formée du fournisseur se traduit par un message « fonction indisponible », jamais par une donnée inventée insérée silencieusement dans un formulaire.
