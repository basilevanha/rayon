---
name: feature
description: Implémente une ou plusieurs exigences du SPEC (ex. /feature COU-10 COU-13). À utiliser quand on demande d'implémenter des identifiants du SPEC.
---

Exigences à implémenter : $ARGUMENTS

1. Lis ces exigences dans `docs/SPEC.md`, ainsi que celles qu'elles référencent.
2. Explore le code existant concerné.
3. Présente un plan : fichiers touchés, migrations, tests à écrire en premier, questions ouvertes. Attends ma validation.
4. Après validation : écris d'abord les tests, puis le code, jusqu'à ce que `pnpm typecheck && pnpm lint && pnpm test` passent.
5. Lance le sous-agent `spec-reviewer` et corrige les écarts.
6. Résume : identifiants couverts, points restants, proposition de message de commit.
   EOF
