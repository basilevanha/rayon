# Rayon

PWA de listes de courses partagées : tri par parcours en magasin, mode courses hors ligne, collaboration en temps réel. « Rayon » est le nom de code du projet.

**Source de vérité : `docs/SPEC.md`.** Chaque exigence a un identifiant (ex. `COU-10`, `TEC-02`). Lis la section concernée avant toute tâche.

## Stack

- Vite, React, TypeScript strict, pnpm, TanStack Router (routes fichiers, plugin Vite)
- Tailwind v4, shadcn/ui (Base UI, preset Nova), lucide-react, Sonner, Vaul, Motion, dnd-kit, i18next
- Supabase (Postgres, Auth, Realtime), TanStack Query (offline-first, cache persisté IndexedDB), Zustand, Zod
- Fuse.js (recherche), vite-plugin-pwa
- Oxlint (lint), Oxfmt (formatage), Vitest, Testing Library, Playwright

## Commandes

```bash
pnpm dev            # serveur de dev
pnpm build          # build de production
pnpm typecheck      # tsc -b
pnpm lint           # oxlint
pnpm format         # oxfmt (écrit les fichiers)
pnpm format:check   # oxfmt --check (CI)
pnpm test           # vitest run
pnpm test:e2e       # playwright test
pnpm db:start       # supabase start (Docker requis)
pnpm db:reset       # rejoue migrations + seed
pnpm db:test        # tests pgTAP (RLS, hook d'inscription)
pnpm gen:types      # types TS depuis le schéma local
pnpm supabase status  # URL et clés locales
```

## Environnement local

- Supabase local tourne sur les ports **553xx** (API : `http://127.0.0.1:55321`, Studio : `http://127.0.0.1:55323`), pour coexister avec d'autres projets en 543xx.
- Variables front dans `.env.local` (modèle : `.env.example`) : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Jamais de Secret key** (`sb_secret_...`) ni de clé S3 dans un fichier `.env*`, même commentée. Toute variable `VITE_` est envoyée au navigateur.

## Structure

```
src/
  routes/            # TanStack Router (routeTree.gen.ts est généré, ne pas éditer)
  features/<domaine> # lists, articles, search, shopping, stores, auth, admin
  lib/               # logique pure : normalize.ts, sort.ts, conflicts.ts
  components/ui/     # shadcn (ne pas modifier à la main sauf besoin)
supabase/
  migrations/        # seule façon de modifier le schéma
  tests/             # pgTAP
docs/SPEC.md
```

## Règles

- **Ne jamais inventer un comportement absent du SPEC.** Si un cas n'est pas couvert, arrête-toi et propose une modification du SPEC.
- Cite les identifiants dans les plans et les commits : `feat(COU-10): coche idempotente`.
- TypeScript strict, pas de `any`. Valide avec Zod toute donnée qui entre (réseau, stockage local).
- Pas d'`enum` ni de `namespace` (`erasableSyntaxOnly`) : utilise des unions de chaînes, ex. `'catalogue' | 'a_acheter' | 'caddie'`.
- Imports internes via l'alias `@/` (ex. `@/lib/sort`).
- Code en anglais, textes d'interface en français.
- Le formatage et les corrections de lint simples sont appliqués automatiquement après chaque modification (hook). Ne formate pas à la main.

### Données et hors ligne

- Toute écriture passe par une mutation TanStack Query avec `mutationKey`, mise à jour optimiste et `setMutationDefaults`, pour être rejouable après redémarrage (OFF-02).
- Un statut se **fixe**, il ne s'inverse jamais (COU-10). Pas de `toggle`.
- Les identifiants d'articles sont des UUID générés côté client (OFF-05).
- Les actions sensibles passent par les fonctions SQL de TEC-03, pas par des écritures directes multiples.

### Base de données

- Schéma modifié uniquement par `pnpm supabase migration new <nom>`, puis `pnpm db:reset` et `pnpm gen:types`.
- RLS activée sur chaque nouvelle table, avec un test pgTAP dans la même tâche (SEC-01, QUA-03).
- Jamais de Secret key (ex-`service_role`) dans `src/`. Si une requête est bloquée par la RLS, corrige la politique, ne la contourne pas.
- Le MCP Supabase pointe sur l'instance **locale** uniquement. Ne jamais le brancher sur la production.

### Logique métier

- La logique pure (normalisation REC-02, tri TEC-02, conflits COL-02 à COL-04) vit dans `src/lib`, sans dépendance à React ni à Supabase, et se développe **tests d'abord**.

### Interface

- Mobile d'abord. Cibles 48 px en mode courses, 44 px ailleurs (UI-02).
- Les animations ne bloquent jamais un tap et respectent `prefers-reduced-motion` (UI-07, UI-08).
- **Aucun texte d'interface en dur** : tout passe par `t()` (react-i18next). Un texte utilisé par plusieurs fonctionnalités va dans `src/lib/i18n/fr/common.ts` ; sinon dans `src/features/<domaine>/locales/fr.ts`. Un texte de `common` qui n'est plus partagé retourne dans sa fonctionnalité. Variables `{{nom}}`, pluriels `_one` / `_other`. Les tests vérifient l'affichage avec `t()`, jamais avec la chaîne littérale.
- Composants shadcn en priorité avant d'en créer un nouveau (`pnpm dlx shadcn@latest add <composant>`). Ils reposent sur **Base UI**, pas sur Radix : n'importe jamais `@radix-ui/*`.

## Fin de tâche

Avant de déclarer une tâche terminée : `pnpm typecheck && pnpm lint && pnpm test` passent, et le résumé liste les identifiants couverts et ceux qui restent ouverts.
