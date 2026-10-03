# Rayon : plan de route

État d'avancement par rapport à `docs/SPEC.md`. Mis à jour à la fin de chaque lot.

Dernière mise à jour : 4 octobre 2026, lot 5a (données des articles) après SPEC 3.1.

## Synthèse

|            | Exigences | Part |
| ---------- | --------: | ---: |
| ✅ Fait    |        28 | 16 % |
| 🟡 Partiel |        43 | 25 % |
| ⬜ À faire |       102 | 59 % |
| **Total**  |   **173** |      |

Une exigence est « faite » quand elle est implémentée, testée et vérifiée dans l'app. « Partiel » signifie qu'une partie est en place, et la note précise ce qui manque.

## Lots

| Lot                           | Contenu                                                                | État            | Commit    |
| ----------------------------- | ---------------------------------------------------------------------- | --------------- | --------- |
| 1. Socle                      | Client Supabase typé, cache hors ligne, routes, layout, PWA            | ✅              | `99232de` |
| 2. Comptes                    | Inscription sur invitation, connexion sans mot de passe, profil        | ✅              | `602116c` |
| Transverse                    | Textes centralisés (i18next)                                           | ✅              | `ed40626` |
| 3. Logique pure               | Normalisation, tri, conflits (tests d'abord)                           | ✅              | `0625f61` |
| 4. Listes                     | Listes, membres, invitations à une liste, accueil, tiroir des listes   | ✅              |           |
| 5. Articles et recherche      | Rayons fixes, articles, recherche, mode préparation, barre d'affichage | 🟡 **En cours** |           |
| 6. Hors ligne et temps réel   | File de modifications, indicateur, Realtime                            | ⬜              |           |
| 7. Magasins                   | Magasins, sélecteur de vue, ordre des rayons, rangements               | ⬜              |           |
| 8. Mode courses               | Courses, réorganiser, sessions, coches                                 | ⬜              |           |
| 9. Contribution et modération | V2 : suggestions, signalements, éditeurs, révisions                    | ⬜ V2           |           |
| 10. Administration et RGPD    | Administration (dont rayons), demandes d'accès, export, suppression    | ⬜              |           |
| 11. Exploitation              | Vercel, CI, sauvegardes, import OpenStreetMap, SMTP                    | ⬜              |           |

## Détail par domaine

### Comptes et inscription (§3.1 à 3.3)

| Id              | État | Note                                                                                                                                                                                                         |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ISC-01          | 🟡   | Réglage en base (`app_settings`), modifiable seulement en SQL. Interface au lot 10.                                                                                                                          |
| ISC-02          | 🟡   | Codes d'application et de liste acceptés par le hook ; « Déjà une invitation ? » permet de saisir le code après un refus. Reste : lien « Demander un accès » inerte jusqu'à ISC-07.                          |
| ISC-03          | ✅   | Hook `controle_inscription`.                                                                                                                                                                                 |
| ISC-04          | 🟡   | Table et lien `/invitation/<code>` en place. Reste : génération (sans caractères ambigus), révocation, quota par utilisateur. Un code choisi par un administrateur reste libre (ex. `BASILE`, dans le seed). |
| ISC-05          | ✅   | Réservation à la première adresse, libération après 24 h, « Vous avez déjà un compte ».                                                                                                                      |
| ISC-06          | ✅   | Plafond vérifié sous verrou. En mode ouvert (V2), deux inscriptions simultanées peuvent encore dépasser le plafond d'une unité.                                                                              |
| ISC-07 à ISC-09 | ⬜   | Demande d'accès, acceptation, mode ouvert.                                                                                                                                                                   |
| ADM-01 à ADM-03 | ⬜   | Lot 10.                                                                                                                                                                                                      |
| CPT-01          | ✅   | Lien et code dans un même email.                                                                                                                                                                             |
| CPT-02          | ✅   | 15 min en local. ⚠️ À reporter sur le projet de production.                                                                                                                                                  |
| CPT-03          | ✅   | Session persistante, renouvelée automatiquement.                                                                                                                                                             |
| CPT-04          | 🟡   | Nom affiché fait. Reste : nombre d'invitations restantes (avec ISC-04).                                                                                                                                      |
| CPT-05          | ⬜   | Export et suppression de compte.                                                                                                                                                                             |
| CPT-06          | 🟡   | Avatar du compte sur l'accueil : tiroir avec nom modifiable, email, déconnexion. Reste : invitations restantes (avec ISC-04).                                                                                |
| CPT-07          | ✅   | Déconnexion locale qui vide cache, file et dernière liste, avec confirmation si des modifications attendent. Une session dont le compte n'existe plus est fermée automatiquement.                            |

### Listes, invitations, navigation (§3.4, 3.5, 4)

| Id              | État | Note                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LST-01          | ✅   | Nom, emoji en grille fixe (contrainte en base), UUID client. Le magasin par défaut est retiré (SPEC 3.1).                                                                                                                                                                                                                             |
| LST-02          | 🟡   | Page d'accueil et tiroir des listes en place. Reste : nombre d'articles à acheter (lot 5).                                                                                                                                                                                                                                            |
| LST-03          | ✅   | Store Zustand persisté, validé par Zod.                                                                                                                                                                                                                                                                                               |
| LST-04          | 🟡   | `copier_liste` en base (articles au catalogue, avec leur rayon). Reste : interface (lot 5c), rangements (lot 7).                                                                                                                                                                                                                      |
| LST-05          | ✅   | Nom, emoji, membres, invitations, quitter, supprimer. Sous-rayons et magasin par défaut retirés (SPEC 3.1).                                                                                                                                                                                                                           |
| LST-06 à LST-08 | ✅   | Fonctions `retirer_membre`, `supprimer_liste`, `quitter_liste`. Un retrait invalide les invitations créées avant lui.                                                                                                                                                                                                                 |
| INV-01 à INV-03 | ✅   | `creer_invitation`, `revoquer_invitation`, `accepter_invitation`, `accepter_invitations_en_attente`, lien `/rejoindre/<code>`.                                                                                                                                                                                                        |
| INV-04          | ⬜   | Message d'arrivée : temps réel, lot 6.                                                                                                                                                                                                                                                                                                |
| NAV-01 à NAV-03 | ✅   | `/` rouvre la dernière liste, sinon l'accueil. En-tête : retour, nom centré qui ouvre le tiroir des listes, membres et réglages.                                                                                                                                                                                                      |
| NAV-04          | 🟡   | Réglages de la liste ; le profil est passé dans le tiroir du compte. Reste : modération et administration (lots 9 et 10).                                                                                                                                                                                                             |
| NAV-05          | 🟡   | Tiroirs et confirmations dans l'historique. Reste : « Quitter les courses ? » (lot 8).                                                                                                                                                                                                                                                |
| NAV-06          | 🟡   | Page d'accueil (`/listes`), titrée « Rayon », listes de la plus récemment active à la moins récente (`lists.activity_at`, mise à jour par triggers), avatar du compte, bouton fixe « Ajouter une liste ». Activité des articles branchée en base (trigger `marquer_activite_articles`). Reste : nombre d'articles à acheter (LST-02). |

### Articles, recherche, préparation (§5 à 7)

| Id                      | État | Note                                                                                                                                                                                                        |
| ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART-01 à ART-08         | 🟡   | Table `articles`, `creer_article` (fusion ART-04), suppression douce avec date serveur et restauration refusée en cas de doublon (ART-08), quantité vide au catalogue (ART-02). Reste : interface (lot 5c). |
| REC-01, REC-03 à REC-09 | ⬜   | Lot 5.                                                                                                                                                                                                      |
| REC-02                  | ✅   | `src/lib/normalize.ts` et `normaliser_nom` en SQL, mêmes cas (`normalize.cases.ts`, parité vérifiée par `normalize.sql.test.ts`).                                                                           |
| PRE-01 à PRE-12         | ⬜   | Lot 5 (PRE-08 au lot 8, PRE-09 avec l'apprentissage).                                                                                                                                                       |

### Mode courses (§8)

| Id              | État | Note   |
| --------------- | ---- | ------ |
| COU-01 à COU-24 | ⬜   | Lot 8. |

### Rayons et magasins (§9)

| Id              | État | Note                                                                                                                                  |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RAY-01, RAY-02  | 🟡   | 36 rayons de l'annexe §18 en migration, lisibles par tous, non modifiables. Reste : édition par les administrateurs (ADM-03, lot 10). |
| MAG-01 à MAG-05 | ⬜   | Lot 7.                                                                                                                                |
| DIS-01, DIS-02  | ⬜   | Ordre des rayons d'un magasin, lot 7.                                                                                                 |
| DIS-03          | ⬜   | V2.                                                                                                                                   |
| RNG-01, RNG-02  | ⬜   | Rangement d'un article par magasin (rayon seulement), lot 7.                                                                          |

### Apprentissage (§10)

| Id              | État | Note                                                         |
| --------------- | ---- | ------------------------------------------------------------ |
| APP-01          | ⬜   | Requis dès le lancement : enregistrement des coches (lot 8). |
| APP-02 à APP-06 | ⬜   | Évolution, non prioritaire.                                  |

### Contribution et modération (§11)

| Id              | État | Note                                                                                     |
| --------------- | ---- | ---------------------------------------------------------------------------------------- |
| CON-01          | 🟡   | Rôles en base, premier administrateur par SQL (README). Reste : nomination des éditeurs. |
| CON-02 à CON-07 | ⬜   | V2.                                                                                      |
| CON-08          | ⬜   | Limite de débit des modifications de magasins, lot 7.                                    |

### Collaboration en temps réel (§12)

| Id                      | État | Note                                                                                                                                                                                                   |
| ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| COL-01, COL-05 à COL-07 | ⬜   | Lots 6 et 8.                                                                                                                                                                                           |
| COL-02 à COL-04         | 🟡   | Règles dans `src/lib/conflicts.ts` ; auteur et horodatage serveur (`horodater_article`) et `status_by` en base. Reste : `needsRemovalConfirmation` sur `statusBy` (lot 5b), alertes à l'écran (lot 8). |

### Hors ligne (§13)

| Id                     | État | Note                                                                                                                                                                    |
| ---------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OFF-01                 | 🟡   | Cache persisté dans IndexedDB. Reste : données des listes.                                                                                                              |
| OFF-02                 | 🟡   | Mutations des listes rejouables, en série, mises en pause hors ligne au lieu d'être annulées, refus signalé par un toast. Reste : articles et indicateur (lots 5 et 6). |
| OFF-03, OFF-04, OFF-06 | ⬜   | Lot 6.                                                                                                                                                                  |
| OFF-07                 | 🟡   | Invitations désactivées hors ligne, avec explication. Reste : actions communautaires (lots 7 et 9).                                                                     |
| OFF-05                 | 🟡   | Règle `mergeDuplicate` ; `creer_article` accepte l'id de l'appareil et fusionne un doublon. Reste : file de rejeu (lot 6).                                              |
| OFF-08                 | 🟡   | Hors ligne, une session expirée ne bloque rien. Reste : en ligne, un jeton révoqué renvoie vers `/connexion` au lieu de demander la reconnexion.                        |

### Interface (§14)

| Id            | État | Note                                                                                                                   |
| ------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| UI-01         | 🟡   | Une colonne, zones de sécurité. Reste : recherche et barre d'action fixées.                                            |
| UI-02         | 🟡   | 44 px sur les écrans existants. Les 48 px viendront avec le mode courses.                                              |
| UI-03         | 🟡   | Tiroirs Base UI (shadcn) : listes, création, rejoindre, confirmations. Reste : tiroir d'article, sélecteur de magasin. |
| UI-04         | 🟡   | Conteneur de 1 000 px. Reste : deux colonnes.                                                                          |
| UI-05 à UI-12 | ⬜   |                                                                                                                        |
| UI-13         | ✅   | Thème clair ou sombre selon le système.                                                                                |

### Données personnelles (§15)

| Id                | État | Note                                                                          |
| ----------------- | ---- | ----------------------------------------------------------------------------- |
| RGPD-01 à RGPD-06 | ⬜   | Lot 10. RGPD-01 est nécessaire avant toute ouverture à de vrais utilisateurs. |

### Exigences techniques (§16)

| Id              | État | Note                                                                                                                                                                           |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TEC-01          | 🟡   | Index unique partiel sur (list_id, nom normalisé calculé par la base), testé en base. Reste : vérification dans l'app (lot 5c).                                                |
| TEC-02          | 🟡   | Fonction pure `sortList` (`src/lib/sort.ts`). Reste : branchement au mode préparation et au mode courses.                                                                      |
| TEC-03          | 🟡   | `controle_inscription`, `accepter_invitation`, `creer_article`, `set_status` faites. Reste : `terminer_session`, `ranger_article`, `ordonner_rayons`, `supprimer_rayon`.       |
| TEC-04          | ✅   | Migrations versionnées, types générés.                                                                                                                                         |
| SEC-01          | 🟡   | RLS sur toutes les tables existantes, dont listes, rayons et articles, vérifiée par des tests (isolation entre listes, colonnes protégées). À étendre à chaque nouvelle table. |
| SEC-02          | 🟡   | Aucune clé de service côté client. Reste : fonctions de modération.                                                                                                            |
| SEC-03          | 🟡   | 20 invitations par jour et par liste. Reste : demandes d'accès, magasins, suggestions.                                                                                         |
| SEC-04          | ✅   | Hook transactionnel avec verrous.                                                                                                                                              |
| PWA-01          | ✅   | Manifest et icônes. L'icône est provisoire.                                                                                                                                    |
| PWA-02          | ✅   | Mise en cache complète, bannière « Nouvelle version disponible ».                                                                                                              |
| PWA-03          | ⬜   | Wake Lock, vibration, géolocalisation.                                                                                                                                         |
| PWA-04          | 🟡   | Configuré dans le manifest, pas encore vérifié sur un appareil réel.                                                                                                           |
| OPS-01 à OPS-04 | ⬜   | Lot 11.                                                                                                                                                                        |
| OPS-05          | ✅   | Développement local avec Supabase CLI.                                                                                                                                         |
| OPS-06          | ⬜   | SMTP externe.                                                                                                                                                                  |
| QUA-01          | 🟡   | Oxlint et Oxfmt en place. Reste : CI à chaque push.                                                                                                                            |
| QUA-02          | ✅   | Normalisation, tri, conflits et fusion des doublons testés.                                                                                                                    |
| QUA-03          | 🟡   | Hook d'inscription, profils, listes, rayons et articles testés. Reste : magasins.                                                                                              |
| QUA-04          | 🟡   | Config Playwright (Pixel 7) et scénario « inviter » (`e2e/lists.spec.ts`). Le reste au fil des lots.                                                                           |
| QUA-05          | ✅   | Écran de secours avec « Recharger ».                                                                                                                                           |

## Points ouverts

- **Configuration de production** : la durée du code (15 min), le modèle d'email et le hook d'inscription ne sont réglés que dans `supabase/config.toml`, qui ne vaut qu'en local. Ils devront être reportés sur le projet distant.
- **OFF-08 en ligne** : avec un jeton révoqué, l'app redirige vers `/connexion` au lieu de demander la reconnexion. À traiter au lot 6.
- **Délai de 15 minutes** : un code consommé sans compte créé est libéré au bout de 15 minutes. Ce délai est absent du SPEC et reste à valider.
- **Icône de l'application** : provisoire, à remplacer, puis relancer `pnpm gen:icons`.
- **COL-04, auteur de la mise au caddie** : `articles.status_by` en base, fixé par `set_status` et par `creer_article` (un changement de statut). `needsRemovalConfirmation` est à adapter au lot 5b.
- **SPEC 3.1, simplification des rayons** : rayons fixes gérés par les administrateurs (36 rayons, annexe §18), un rayon par article avec un rangement facultatif par magasin, l'ordre des rayons d'un magasin commun à tous, un seul mode réorganiser (préparation et courses). Parcours personnels, positions dans un rayon, sous-rayons, dictionnaire et modération partent en V2 ou en §17. `src/lib/sort.ts` (parcours, positions, sous-rayons) est à simplifier au lot 5.
- **Ordre des magasins modifiable par tous, sans révision (V1)** : une erreur ou un vandalisme ne se rattrape pas avant DIS-03 (V2). Seule la limite CON-08 protège.
- **OFF-05, rejeu d'une création fusionnée** : l'id d'une création fusionnée n'est jamais inséré. Un rejeu tardif repasse par la fusion : un article remis au catalogue entre-temps repasserait à « à acheter ». Absent du SPEC, à traiter avec OFF-04 (lot 6).
- **Performance de la RLS** : les politiques appellent `est_membre(list_id)` pour chaque ligne. À remplacer par un `list_id in (select … from list_members …)` si les listes deviennent grandes.
- **Quantité au catalogue** : la base refuse une quantité sur un article au catalogue (ART-02). Le tiroir d'article (lot 5c) ne doit proposer la quantité que pour un article à acheter ou au caddie.
- **OFF-04, conflit au rejeu** : aucune règle pure ne traite encore le rejeu d'une action hors ligne sur un article modifié entre-temps par un autre membre (ex. mon retrait arrive sur un article qu'il a mis au caddie). À écrire au lot 6.
- **COL-06 et alertes** : quand un autre membre termine la session, ses articles du caddie repassent au catalogue. `remoteChangeAlert` produirait une alerte « À reposer » par article. Le lot 8 doit traiter la fin de session à part.
- **SEC-03, codes de liste devinés** : `accepter_invitation` n'a pas de limite de débit. Un compte peut essayer des codes en masse (32⁶ combinaisons) et rejoindre une liste inconnue. À ajouter au SPEC (ex. 10 échecs par heure et par compte), puis à coder.
- **SEC-03, limite par liste** : la limite de 20 invitations par jour se contourne en créant plusieurs listes. Faut-il aussi une limite par compte ?
- **CPT-05, suppression de compte** : la suppression d'un compte retire ses appartenances sans transférer le rôle de créateur ni supprimer une liste devenue vide. À traiter avec CPT-05 (lot 10).
- **Hors SPEC, à valider** : toasts de confirmation (« Liste enregistrée », « Lien copié »…) ; boutons « Partager » et « Copier le lien », date d'expiration et liste des invitations actives.
- **NAV-02, place du titre** : avec le centrage strict, le nom de la liste dispose d'environ 94 px sur un écran de 390 px (une dizaine de caractères). Retirer les avatars des membres de l'en-tête (ils restent dans les réglages) le porterait à environ 230 px.
- **Mutations sans fin** : une mutation en échec réseau est réessayée tant que le réseau manque, y compris si le serveur est injoignable alors que l'appareil est en ligne.
- **Animations de page** : push / pop entre l'accueil et une liste par View Transitions (`src/lib/page-transition.ts`, `src/index.css`). Un navigateur sans types de transition n'anime pas. Un tap pendant la transition est ignoré : exception inscrite dans UI-07.
- **REC-02, mots composés** : un mot à trait d'union compte comme un seul mot, donc « Choux-fleurs » donne `choux-fleur` et ne correspond pas à « Chou-fleur ». C'est conforme au SPEC amendé, mais à confirmer.
