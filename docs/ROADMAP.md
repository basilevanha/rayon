# Rayon : plan de route

État d'avancement par rapport à `docs/SPEC.md`. Mis à jour à la fin de chaque lot.

Dernière mise à jour : 3 octobre 2026, après le lot 3 (logique pure).

## Synthèse

| | Exigences | Part |
|---|---:|---:|
| ✅ Fait | 15 | 8 % |
| 🟡 Partiel | 22 | 12 % |
| ⬜ À faire | 140 | 79 % |
| **Total** | **177** | |

Une exigence est « faite » quand elle est implémentée, testée et vérifiée dans l'app. « Partiel » signifie qu'une partie est en place, et la note précise ce qui manque.

## Lots

| Lot | Contenu | État | Commit |
|---|---|---|---|
| 1. Socle | Client Supabase typé, cache hors ligne, routes, layout, PWA | ✅ | `99232de` |
| 2. Comptes | Inscription sur invitation, connexion sans mot de passe, profil | ✅ | `602116c` |
| Transverse | Textes centralisés (i18next) | ✅ | `ed40626` |
| 3. Logique pure | Normalisation, tri, conflits (tests d'abord) | ✅ | |
| 4. Listes | Listes, membres, invitations à une liste, accueil, tiroir des listes | ⬜ **Prochain** | |
| 5. Articles et recherche | Référentiel de rayons, articles, recherche, mode préparation | ⬜ | |
| 6. Hors ligne et temps réel | File de modifications, indicateur, Realtime | ⬜ | |
| 7. Magasins et parcours | Magasins, dispositions, rangements, parcours | ⬜ | |
| 8. Mode courses | Courses, réorganiser, sessions, coches | ⬜ | |
| 9. Contribution et modération | Suggestions, signalements, éditeurs | ⬜ | |
| 10. Administration et RGPD | Administration, demandes d'accès, export et suppression de compte | ⬜ | |
| 11. Exploitation | Vercel, CI, sauvegardes, import OpenStreetMap, SMTP | ⬜ | |

## Détail par domaine

### Comptes et inscription (§3.1 à 3.3)

| Id | État | Note |
|---|---|---|
| ISC-01 | 🟡 | Réglage en base (`app_settings`), modifiable seulement en SQL. Interface au lot 10. |
| ISC-02 | 🟡 | Refus sans code en place. Reste : invitations à une liste (lot 4), lien « Demander un accès » inerte jusqu'à ISC-07. |
| ISC-03 | ✅ | Hook `controle_inscription`. |
| ISC-04 | 🟡 | Table et lien `/invitation/<code>` en place. Reste : génération, révocation, quota par utilisateur. |
| ISC-05 | ✅ | Réservation à la première adresse, libération après 24 h, « Vous avez déjà un compte ». |
| ISC-06 | ✅ | Plafond vérifié sous verrou. En mode ouvert (V2), deux inscriptions simultanées peuvent encore dépasser le plafond d'une unité. |
| ISC-07 à ISC-09 | ⬜ | Demande d'accès, acceptation, mode ouvert. |
| ADM-01, ADM-02 | ⬜ | Lot 10. |
| CPT-01 | ✅ | Lien et code dans un même email. |
| CPT-02 | ✅ | 15 min en local. ⚠️ À reporter sur le projet de production. |
| CPT-03 | ✅ | Session persistante, renouvelée automatiquement. |
| CPT-04 | 🟡 | Nom affiché fait. Reste : nombre d'invitations restantes (avec ISC-04). |
| CPT-05 | ⬜ | Export et suppression de compte. |

### Listes, invitations, navigation (§3.4, 3.5, 4)

| Id | État | Note |
|---|---|---|
| LST-01 à LST-08 | ⬜ | Lot 4. |
| INV-01 à INV-04 | ⬜ | Lot 4. Le hook d'inscription devra aussi accepter ces codes. |
| NAV-01 à NAV-05 | ⬜ | Lot 4. L'accueil actuel est un écran provisoire. |

### Articles, recherche, préparation (§5 à 7)

| Id | État | Note |
|---|---|---|
| ART-01 à ART-08 | ⬜ | Lot 5. |
| REC-01, REC-03 à REC-09 | ⬜ | Lot 5. |
| REC-02 | ✅ | `src/lib/normalize.ts`, table de cas partagée `normalize.cases.ts`. Version SQL au lot 5. |
| PRE-01 à PRE-09 | ⬜ | Lot 5. |

### Mode courses (§8)

| Id | État | Note |
|---|---|---|
| COU-01 à COU-24 | ⬜ | Lot 8. |

### Rayons, magasins, parcours (§9)

| Id | État | Note |
|---|---|---|
| RAY-01 à RAY-04 | ⬜ | Référentiel au lot 5, suggestions au lot 9. |
| MAG-01 à MAG-05 | ⬜ | Lot 7. |
| DIS-01 à DIS-04 | ⬜ | Lot 7. |
| RNG-01 à RNG-04 | ⬜ | Lot 7. |
| PAR-01 à PAR-06 | ⬜ | Lot 7. |

### Apprentissage (§10)

| Id | État | Note |
|---|---|---|
| APP-01 | ⬜ | Requis dès le lancement : enregistrement des coches (lot 8). |
| APP-02 à APP-06 | ⬜ | Évolution, non prioritaire. |

### Contribution et modération (§11)

| Id | État | Note |
|---|---|---|
| CON-01 | 🟡 | Rôles en base, premier administrateur par SQL (README). Reste : nomination des éditeurs. |
| CON-02 à CON-08 | ⬜ | Lot 9. |

### Collaboration en temps réel (§12)

| Id | État | Note |
|---|---|---|
| COL-01, COL-05 à COL-07 | ⬜ | Lots 6 et 8. |
| COL-02 à COL-04 | 🟡 | Règles de décision dans `src/lib/conflicts.ts`. Reste : horodatage serveur et auteur en base (lot 5), alertes à l'écran (lot 8). |

### Hors ligne (§13)

| Id | État | Note |
|---|---|---|
| OFF-01 | 🟡 | Cache persisté dans IndexedDB. Reste : données des listes. |
| OFF-02 | 🟡 | Mutations rejouables en place (nom affiché). Reste : file complète et rejeu ordonné (lot 6). |
| OFF-03, OFF-04, OFF-06, OFF-07 | ⬜ | Lot 6. |
| OFF-05 | 🟡 | Règle de fusion `mergeDuplicate`. Reste : UUID client et fusion au rejeu dans `creer_article` (lots 5 et 6). |
| OFF-08 | 🟡 | Hors ligne, une session expirée ne bloque rien. Reste : en ligne, un jeton révoqué renvoie vers `/connexion` au lieu de demander la reconnexion. |

### Interface (§14)

| Id | État | Note |
|---|---|---|
| UI-01 | 🟡 | Une colonne, zones de sécurité. Reste : recherche et barre d'action fixées. |
| UI-02 | 🟡 | 44 px sur les écrans existants. Les 48 px viendront avec le mode courses. |
| UI-03 | ⬜ | Tiroirs (Vaul). |
| UI-04 | 🟡 | Conteneur de 1 000 px. Reste : deux colonnes. |
| UI-05 à UI-12 | ⬜ | |
| UI-13 | ✅ | Thème clair ou sombre selon le système. |

### Données personnelles (§15)

| Id | État | Note |
|---|---|---|
| RGPD-01 à RGPD-06 | ⬜ | Lot 10. RGPD-01 est nécessaire avant toute ouverture à de vrais utilisateurs. |

### Exigences techniques (§16)

| Id | État | Note |
|---|---|---|
| TEC-01 | ⬜ | Lot 5. |
| TEC-02 | 🟡 | Fonction pure `sortList` (`src/lib/sort.ts`). Reste : branchement au mode préparation et au mode courses. |
| TEC-03 | 🟡 | `controle_inscription` faite. Reste : les sept autres fonctions. |
| TEC-04 | ✅ | Migrations versionnées, types générés. |
| SEC-01 | 🟡 | RLS sur toutes les tables existantes, vérifiée par un test. À étendre à chaque nouvelle table. |
| SEC-02 | 🟡 | Aucune clé de service côté client. Reste : fonctions de modération. |
| SEC-03 | ⬜ | Limitation de débit. |
| SEC-04 | ✅ | Hook transactionnel avec verrous. |
| PWA-01 | ✅ | Manifest et icônes. L'icône est provisoire. |
| PWA-02 | ✅ | Mise en cache complète, bannière « Nouvelle version disponible ». |
| PWA-03 | ⬜ | Wake Lock, vibration, géolocalisation. |
| PWA-04 | 🟡 | Configuré dans le manifest, pas encore vérifié sur un appareil réel. |
| OPS-01 à OPS-04 | ⬜ | Lot 11. |
| OPS-05 | ✅ | Développement local avec Supabase CLI. |
| OPS-06 | ⬜ | SMTP externe. |
| QUA-01 | 🟡 | Oxlint et Oxfmt en place. Reste : CI à chaque push. |
| QUA-02 | ✅ | Normalisation, tri, conflits et fusion des doublons testés. |
| QUA-03 | 🟡 | Hook d'inscription et profils testés. Reste : listes et parcours. |
| QUA-04 | ⬜ | Playwright en viewport mobile, à écrire au fil des lots. |
| QUA-05 | ✅ | Écran de secours avec « Recharger ». |

## Points ouverts

- **Configuration de production** : la durée du code (15 min), le modèle d'email et le hook d'inscription ne sont réglés que dans `supabase/config.toml`, qui ne vaut qu'en local. Ils devront être reportés sur le projet distant.
- **OFF-08 en ligne** : avec un jeton révoqué, l'app redirige vers `/connexion` au lieu de demander la reconnexion. À traiter au lot 6.
- **Délai de 15 minutes** : un code consommé sans compte créé est libéré au bout de 15 minutes. Ce délai est absent du SPEC et reste à valider.
- **Icône de l'application** : provisoire, à remplacer, puis relancer `pnpm gen:icons`.
- **COL-04, auteur de la mise au caddie** : la confirmation s'appuie sur `updated_by`, qui désigne le dernier à avoir modifié l'article. Si je change la quantité d'un article qu'un autre a mis au caddie, la confirmation disparaît et le nom affiché devient faux. Le modèle de données (§16.2) n'a pas de champ « mis au caddie par ». À trancher avant le lot 5.
- **OFF-04, conflit au rejeu** : aucune règle pure ne traite encore le rejeu d'une action hors ligne sur un article modifié entre-temps par un autre membre (ex. mon retrait arrive sur un article qu'il a mis au caddie). À écrire au lot 6.
- **COL-06 et alertes** : quand un autre membre termine la session, ses articles du caddie repassent au catalogue. `remoteChangeAlert` produirait une alerte « À reposer » par article. Le lot 8 doit traiter la fin de session à part.
- **REC-02, mots composés** : un mot à trait d'union compte comme un seul mot, donc « Choux-fleurs » donne `choux-fleur` et ne correspond pas à « Chou-fleur ». C'est conforme au SPEC amendé, mais à confirmer.
