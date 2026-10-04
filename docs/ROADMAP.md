# Rayon : plan de route

État d'avancement par rapport à `docs/SPEC.md`. Mis à jour à la fin de chaque lot.

Dernière mise à jour : 4 octobre 2026, après le lot 6 (hors ligne et temps réel).

## Synthèse

|            | Exigences | Part |
| ---------- | --------: | ---: |
| ✅ Fait    |        65 | 38 % |
| 🟡 Partiel |        34 | 20 % |
| ⬜ À faire |        74 | 43 % |
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
| 5. Articles et recherche      | Rayons fixes, articles, recherche, mode préparation, barre d'affichage | ✅              |           |
| 6. Hors ligne et temps réel   | File de modifications, indicateur, Realtime                            | ✅              |           |
| 7. Magasins                   | Magasins, sélecteur de vue, ordre des rayons, rangements               | ⬜ **Prochain** |           |
| 8. Mode courses               | Courses, réorganiser, sessions, coches                                 | ⬜              |           |
| 9. Contribution et modération | V2 : suggestions, signalements, éditeurs, révisions                    | ⬜ V2           |           |
| 10. Administration et RGPD    | Administration (dont rayons), demandes d'accès, export, suppression    | ⬜              |           |
| 11. Exploitation              | Vercel, CI, sauvegardes, import OpenStreetMap, SMTP                    | ⬜              |           |

## Détail par domaine

### Comptes et inscription (§3.1 à 3.3)

| Id              | État | Note                                                                                                                                                                                                                                                 |
| --------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ISC-01          | 🟡   | Réglage en base (`app_settings`), modifiable seulement en SQL. Interface au lot 10.                                                                                                                                                                  |
| ISC-02          | 🟡   | Codes d'application et de liste acceptés par le hook ; « Déjà une invitation ? » permet de saisir le code après un refus. Reste : lien « Demander un accès » inerte jusqu'à ISC-07.                                                                  |
| ISC-03          | ✅   | Hook `controle_inscription`.                                                                                                                                                                                                                         |
| ISC-04          | 🟡   | Table et lien `/invitation/<code>` en place. Reste : génération (sans caractères ambigus), révocation, quota par utilisateur. Un code choisi par un administrateur reste libre (ex. `BASILE`, dans le seed).                                         |
| ISC-05          | ✅   | Réservation à la première adresse, libération après 24 h, « Vous avez déjà un compte ».                                                                                                                                                              |
| ISC-06          | ✅   | Plafond vérifié sous verrou. En mode ouvert (V2), deux inscriptions simultanées peuvent encore dépasser le plafond d'une unité.                                                                                                                      |
| ISC-07 à ISC-09 | ⬜   | Demande d'accès, acceptation, mode ouvert.                                                                                                                                                                                                           |
| ADM-01 à ADM-03 | ⬜   | Lot 10.                                                                                                                                                                                                                                              |
| CPT-01          | ✅   | Lien et code dans un même email.                                                                                                                                                                                                                     |
| CPT-02          | ✅   | 15 min en local. ⚠️ À reporter sur le projet de production.                                                                                                                                                                                          |
| CPT-03          | ✅   | Session persistante, renouvelée automatiquement.                                                                                                                                                                                                     |
| CPT-04          | 🟡   | Nom affiché fait. Reste : nombre d'invitations restantes (avec ISC-04).                                                                                                                                                                              |
| CPT-05          | ⬜   | Export et suppression de compte.                                                                                                                                                                                                                     |
| CPT-06          | 🟡   | Avatar du compte sur l'accueil : tiroir avec nom modifiable, email, déconnexion. Reste : invitations restantes (avec ISC-04).                                                                                                                        |
| CPT-07          | ✅   | Déconnexion locale qui vide cache, file et dernière liste, avec confirmation si des modifications attendent. Un autre compte qui se connecte sur l'appareil efface d'abord les données du précédent, dont la file n'est jamais envoyée sous son nom. |

### Listes, invitations, navigation (§3.4, 3.5, 4)

| Id              | État | Note                                                                                                                                                                                       |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LST-01          | ✅   | Nom, emoji en grille fixe (contrainte en base), UUID client. Le magasin par défaut est retiré (SPEC 3.1).                                                                                  |
| LST-02          | ✅   | Nombre d'articles à acheter sur l'accueil et dans le tiroir des listes (rien tant que les articles ne sont pas chargés).                                                                   |
| LST-03          | ✅   | Store Zustand persisté, validé par Zod.                                                                                                                                                    |
| LST-04          | 🟡   | Liste vide ou copie : les articles copiés (ids générés par l'appareil) s'affichent tout de suite, même hors ligne. Reste : rangements (lot 7).                                             |
| LST-05          | ✅   | Nom, emoji, membres, invitations, quitter, supprimer. Sous-rayons et magasin par défaut retirés (SPEC 3.1).                                                                                |
| LST-06 à LST-08 | ✅   | Fonctions `retirer_membre`, `supprimer_liste`, `quitter_liste`. Un retrait invalide les invitations créées avant lui.                                                                      |
| INV-01 à INV-03 | ✅   | `creer_invitation`, `revoquer_invitation`, `accepter_invitation`, `accepter_invitations_en_attente`, lien `/rejoindre/<code>`.                                                             |
| INV-04          | ✅   | « [membre] a rejoint « [liste] » » en temps réel. La liste n'est rejointe qu'une fois le nom affiché enregistré, pour que le message porte le nom.                                         |
| NAV-01 à NAV-03 | ✅   | `/` rouvre la dernière liste, sinon l'accueil. En-tête : retour, nom centré qui ouvre le tiroir des listes, membres et réglages.                                                           |
| NAV-04          | 🟡   | Réglages de la liste ; le profil est passé dans le tiroir du compte. Reste : modération et administration (lots 9 et 10).                                                                  |
| NAV-05          | 🟡   | Tiroirs et confirmations dans l'historique. Reste : « Quitter les courses ? » (lot 8).                                                                                                     |
| NAV-06          | ✅   | Accueil titré « Rayon », listes par activité (`lists.activity_at`, triggers des listes, membres et articles), avatar du compte, bouton « Ajouter une liste », nombre d'articles à acheter. |

### Articles, recherche, préparation (§5 à 7)

| Id                      | État | Note                                                                                                                                                                                                                                                     |
| ----------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART-01 à ART-06, ART-08 | ✅   | Création par la recherche avec rayon obligatoire (pastilles, « Tous les rayons… », présélection d'après les autres listes), fusion des doublons, tiroir d'édition (nom, quantité hors catalogue, rayon), suppression douce avec « Annuler » et minuteur. |
| ART-07                  | 🟡   | Vue « Défaut » : le rayon de l'article. Reste : rangement par magasin, case « Dans tous les magasins » et mention « Rangé ailleurs » (lot 7).                                                                                                            |
| REC-01, REC-03 à REC-09 | ✅   | Barre collée en haut, résultats dès le premier caractère, une faute tolérée, badges, tap (à acheter ou mise en évidence), « Créer » en dernier, Entrée, barre vidée avec focus conservé. Testé (Vitest, Playwright).                                     |
| REC-02                  | ✅   | `src/lib/normalize.ts` et `normaliser_nom` en SQL, mêmes cas (`normalize.cases.ts`, parité vérifiée par `normalize.sql.test.ts`).                                                                                                                        |
| PRE-01, PRE-02          | 🟡   | Section du caddie, à acheter par rayon (ordre de référence), « Tous les articles (n) » replié. Reste : titre COL-05 de la section du caddie (lot 8), ordre du magasin sélectionné (lot 7).                                                               |
| PRE-03 à PRE-07         | ✅   | Titres de rayon discrets et collés, « Autre » rayon ordinaire, aucune case à cocher, glissement « Plus besoin » avec bande d'annulation, liste vide.                                                                                                     |
| PRE-08, PRE-09, PRE-11  | ⬜   | « Démarrer les courses » (lot 8), carte d'apprentissage, vue mémorisée par liste (lot 7).                                                                                                                                                                |
| PRE-10                  | 🟡   | Barre d'affichage : vue « Défaut », « Par rayon » / « A → Z ». Reste : sélecteur de magasin et « Organiser les rayons » (lot 7).                                                                                                                         |
| PRE-12                  | ✅   | Affichage mémorisé sur l'appareil (Zustand persisté, validé par Zod).                                                                                                                                                                                    |

### Mode courses (§8)

| Id              | État | Note   |
| --------------- | ---- | ------ |
| COU-01 à COU-24 | ⬜   | Lot 8. |

### Rayons et magasins (§9)

| Id              | État | Note                                                                                              |
| --------------- | ---- | ------------------------------------------------------------------------------------------------- |
| RAY-01          | 🟡   | 36 rayons de l'annexe §18 en migration. Reste : édition par les administrateurs (ADM-03, lot 10). |
| RAY-02          | ✅   | Aucune écriture de rayon par les utilisateurs (RLS testée).                                       |
| MAG-01 à MAG-05 | ⬜   | Lot 7.                                                                                            |
| DIS-01, DIS-02  | ⬜   | Ordre des rayons d'un magasin, lot 7. Le tri le gère déjà (`sortByRayon`).                        |
| DIS-03          | ⬜   | V2.                                                                                               |
| RNG-01, RNG-02  | ⬜   | Rangement par magasin, lot 7. Le tri le gère déjà (`sortByRayon`).                                |

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

| Id              | État | Note                                                                                                                                                                    |
| --------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COL-01          | ✅   | Realtime Broadcast sur canaux privés `list:<id>` et `user:<id>` ; articles appliqués au cache (`mergeRemoteArticle`), rattrapage à la reconnexion. Moins de 2 s, testé. |
| COL-05 à COL-07 | ⬜   | Lot 8.                                                                                                                                                                  |
| COL-02          | ✅   | Auteur et horodatage serveur ; la version la plus récente l'emporte à la réception (`resolveConcurrent`).                                                               |
| COL-03, COL-04  | 🟡   | Règles dans `src/lib/conflicts.ts`, `status_by` en base, retrait rejoué refusé (OFF-04). Reste : alertes et confirmation à l'écran (lot 8).                             |

### Hors ligne (§13)

| Id     | État | Note                                                                                                                                                                                                                                                            |
| ------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OFF-01 | ✅   | Listes, articles et rayons en cache sur l'appareil ; une liste reste utilisable sans réseau (testé).                                                                                                                                                            |
| OFF-02 | ✅   | Toutes les écritures rejouables, dans l'ordre (scope commun), même après fermeture : modifications en cours d'envoi enregistrées et relancées au redémarrage, cache écrit en 100 ms et à la mise en arrière-plan.                                               |
| OFF-03 | ✅   | Pastille « Hors ligne · n modifications en attente », ou « n modifications en attente » en ligne après 3 s.                                                                                                                                                     |
| OFF-04 | 🟡   | Retrait (« Plus besoin », suppression) refusé au rejeu si un autre membre a mis l'article au caddie, avec message. Reste : alertes COL-03 au rejeu (lot 8).                                                                                                     |
| OFF-06 | 🟡   | Rayons disponibles hors ligne. Reste : ordre et rangements des magasins (lot 7), coches (lot 8).                                                                                                                                                                |
| OFF-07 | 🟡   | Invitations désactivées hors ligne, avec explication. Reste : actions communautaires (lots 7 et 9).                                                                                                                                                             |
| OFF-05 | ✅   | Id généré par l'appareil, fusion au rejeu, et un rejeu tardif d'une création fusionnée ne modifie plus l'article (`article_aliases`).                                                                                                                           |
| OFF-08 | ✅   | Hors ligne, une session expirée ne bloque rien. En ligne, une session refusée garde l'usage local, affiche « Session expirée · Se reconnecter » et rejoue la file après la reconnexion (testé). Un autre compte qui se connecte efface les données de l'ancien. |

### Interface (§14)

| Id           | État | Note                                                                                                                                                                  |
| ------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-01        | 🟡   | Une colonne, zones de sécurité. Reste : recherche et barre d'action fixées.                                                                                           |
| UI-02        | 🟡   | 44 px sur les écrans existants. Les 48 px viendront avec le mode courses.                                                                                             |
| UI-03        | 🟡   | Tiroirs Base UI (shadcn) : listes, création, rejoindre, confirmations. Reste : tiroir d'article, sélecteur de magasin.                                                |
| UI-04        | ✅   | Conteneur de 1 000 px ; deux colonnes : recherche et à acheter à gauche, tous les articles à droite (visible pendant une recherche).                                  |
| UI-05        | ✅   | « / » place le focus dans la recherche, Entrée ajoute, Échap vide la recherche ou ferme un tiroir.                                                                    |
| UI-06, UI-09 | ⬜   | Glisser-déposer des rayons (lot 7), coche animée (lot 8).                                                                                                             |
| UI-07, UI-08 | 🟡   | Glissement, bande et minuteur sans blocage ; défilement et barres sans animation si le système le demande. Reste : à vérifier sur chaque animation des lots suivants. |
| UI-10, UI-11 | ✅   | Bande « [article] retiré · Annuler » de 6 s ; toast de suppression avec « Annuler » et minuteur.                                                                      |
| UI-12        | 🟡   | « Plus besoin » accessible depuis le tiroir (équivalent du glissement). Reste : audit WCAG AA et clavier complet.                                                     |
| UI-13        | ✅   | Thème clair ou sombre selon le système.                                                                                                                               |

### Données personnelles (§15)

| Id                | État | Note                                                                          |
| ----------------- | ---- | ----------------------------------------------------------------------------- |
| RGPD-01 à RGPD-06 | ⬜   | Lot 10. RGPD-01 est nécessaire avant toute ouverture à de vrais utilisateurs. |

### Exigences techniques (§16)

| Id              | État | Note                                                                                                                                                                                                                                                    |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TEC-01          | ✅   | Index unique partiel sur (list_id, nom normalisé calculé par la base), testé en base et dans l'app.                                                                                                                                                     |
| TEC-02          | 🟡   | `sortByRayon` et `sortAlphabetically` (`src/lib/sort.ts`) selon SPEC 3.1 : ordre du magasin ou de référence, rangements, ordre alphabétique. Reste : branchement à l'écran (lots 5c et 8).                                                              |
| TEC-03          | 🟡   | `controle_inscription`, `accepter_invitation`, `creer_article`, `set_status`, `supprimer_article`, `copier_liste` faites. Reste : `terminer_session`, `ranger_article`, `ordonner_rayons`, `supprimer_rayon`.                                           |
| TEC-04          | ✅   | Migrations versionnées, types générés.                                                                                                                                                                                                                  |
| SEC-01          | 🟡   | RLS sur toutes les tables, vérifiée par des tests (isolation entre listes, colonnes protégées). Temps réel par canaux privés : politique sur `realtime.messages` (`peut_ecouter`), aucune table en postgres_changes. À étendre à chaque nouvelle table. |
| SEC-02          | 🟡   | Aucune clé de service côté client. Reste : fonctions de modération.                                                                                                                                                                                     |
| SEC-03          | 🟡   | 20 invitations par jour et par liste. Reste : demandes d'accès, magasins, suggestions.                                                                                                                                                                  |
| SEC-04          | ✅   | Hook transactionnel avec verrous.                                                                                                                                                                                                                       |
| PWA-01          | ✅   | Manifest et icônes. L'icône est provisoire.                                                                                                                                                                                                             |
| PWA-02          | ✅   | Mise en cache complète, bannière « Nouvelle version disponible ».                                                                                                                                                                                       |
| PWA-03          | ⬜   | Wake Lock, vibration, géolocalisation.                                                                                                                                                                                                                  |
| PWA-04          | 🟡   | Configuré dans le manifest, pas encore vérifié sur un appareil réel.                                                                                                                                                                                    |
| OPS-01 à OPS-04 | ⬜   | Lot 11.                                                                                                                                                                                                                                                 |
| OPS-05          | ✅   | Développement local avec Supabase CLI.                                                                                                                                                                                                                  |
| OPS-06          | ⬜   | SMTP externe.                                                                                                                                                                                                                                           |
| QUA-01          | 🟡   | Oxlint et Oxfmt en place. Reste : CI à chaque push.                                                                                                                                                                                                     |
| QUA-02          | ✅   | Normalisation (TS et SQL), tri, recherche, suggestion de rayon, conflits et fusion des doublons testés.                                                                                                                                                 |
| QUA-03          | 🟡   | Hook d'inscription, profils, listes, rayons et articles testés. Reste : magasins.                                                                                                                                                                       |
| QUA-04          | 🟡   | Scénarios Playwright (Pixel 7) : inviter, ajouter / retirer / annuler, utiliser hors ligne puis resynchroniser, recevoir une modification d'un autre membre, se reconnecter. Reste : cocher, réorganiser, terminer, changer de magasin (lots 7 et 8).   |
| QUA-05          | ✅   | Écran de secours avec « Recharger ».                                                                                                                                                                                                                    |

## Points ouverts

- **Configuration de production** : la durée du code (15 min), le modèle d'email et le hook d'inscription ne sont réglés que dans `supabase/config.toml`, qui ne vaut qu'en local. Ils devront être reportés sur le projet distant.
- **Délai de 15 minutes** : un code consommé sans compte créé est libéré au bout de 15 minutes. Ce délai est absent du SPEC et reste à valider.
- **Icône de l'application** : provisoire, à remplacer, puis relancer `pnpm gen:icons`.
- **COL-04, membre supprimé** : si le compte qui a mis l'article au caddie a été supprimé (`status_by` vide), la confirmation est demandée mais n'a pas de nom à afficher. Libellé à décider au lot 8 (ex. « Un ancien membre l'a déjà mis dans le caddie »).
- **SPEC 3.1, simplification des rayons** : rayons fixes gérés par les administrateurs (36 rayons, annexe §18), un rayon par article avec un rangement facultatif par magasin, l'ordre des rayons d'un magasin commun à tous, un seul mode réorganiser (préparation et courses). Parcours personnels, positions dans un rayon, sous-rayons, dictionnaire et modération partent en V2 ou en §17. `src/lib/sort.ts` simplifié au lot 5b.
- **Ordre des magasins modifiable par tous, sans révision (V1)** : une erreur ou un vandalisme ne se rattrape pas avant DIS-03 (V2). Seule la limite CON-08 protège.
- **Fuse.js inutilisé** : la recherche est un moteur maison (§16.1 amendé). La dépendance `fuse.js` et la mention dans `CLAUDE.md` (Stack) sont à retirer.
- **Select natif** : le rayon (tiroir d'article) et la liste source (création) utilisent un `<select>` natif, qui ouvre le sélecteur du téléphone. Aucun Select shadcn n'est installé : exception à valider, ou ajout de `select` (Base UI).
- **COL-04 et suppression** : supprimer depuis le tiroir un article qu'un autre membre a mis au caddie ne demande pas de confirmation. La suppression compte-t-elle comme un « retrait » ? À trancher avant le lot 8.
- **Organiser les rayons en vue « Défaut »** : le mode réorganiser (déplacer un article vers un autre rayon) n'existe pas encore ; seul le tiroir change le rayon. Lot 7.
- **OFF-02, fermeture brutale** : le cache est écrit 100 ms au plus après chaque action, et immédiatement quand l'app passe en arrière-plan. Une app tuée dans ces 100 ms sans passer en arrière-plan peut perdre la dernière action.
- **OFF-08, reconnexion** : la page de connexion ne préremplit pas l'adresse du compte dont la session a été perdue.
- **Cache et version de l'app** : le cache enregistré n'est plus invalidé par la version de l'app (une mise à jour aurait vidé la file), mais par `CACHE_VERSION`, à changer à la main si la forme des données en cache change.
- **Performance de la RLS** : les politiques appellent `est_membre(list_id)` pour chaque ligne. À remplacer par un `list_id in (select … from list_members …)` si les listes deviennent grandes.
- **Quantité au catalogue** : la base refuse une quantité sur un article au catalogue (ART-02). Le tiroir d'article (lot 5c) ne doit proposer la quantité que pour un article à acheter ou au caddie.
- **COL-06 et alertes** : quand un autre membre termine la session, ses articles du caddie repassent au catalogue. `remoteChangeAlert` produirait une alerte « À reposer » par article. Le lot 8 doit traiter la fin de session à part.
- **SEC-03, codes de liste devinés** : `accepter_invitation` n'a pas de limite de débit. Un compte peut essayer des codes en masse (32⁶ combinaisons) et rejoindre une liste inconnue. À ajouter au SPEC (ex. 10 échecs par heure et par compte), puis à coder.
- **SEC-03, limite par liste** : la limite de 20 invitations par jour se contourne en créant plusieurs listes. Faut-il aussi une limite par compte ?
- **CPT-05, suppression de compte** : la suppression d'un compte retire ses appartenances sans transférer le rôle de créateur ni supprimer une liste devenue vide. À traiter avec CPT-05 (lot 10).
- **Hors SPEC, à valider** : toasts de confirmation (« Liste enregistrée », « Lien copié »…) ; boutons « Partager » et « Copier le lien », date d'expiration et liste des invitations actives.
- **NAV-02, place du titre** : avec le centrage strict, le nom de la liste dispose d'environ 94 px sur un écran de 390 px (une dizaine de caractères). Retirer les avatars des membres de l'en-tête (ils restent dans les réglages) le porterait à environ 230 px.
- **Mutations sans fin** : une modification en échec réseau est réessayée sans limite. Si le serveur est injoignable alors que l'appareil est en ligne, l'indicateur affiche désormais « n modifications en attente » (OFF-03), mais rien ne propose d'abandonner.
- **Animations de page** : push / pop entre l'accueil et une liste par View Transitions (`src/lib/page-transition.ts`, `src/index.css`). Un navigateur sans types de transition n'anime pas. Un tap pendant la transition est ignoré : exception inscrite dans UI-07.
- **REC-02, mots composés** : un mot à trait d'union compte comme un seul mot, donc « Choux-fleurs » donne `choux-fleur` et ne correspond pas à « Chou-fleur ». C'est conforme au SPEC amendé, mais à confirmer.
