# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Rayon : désigner le premier administrateur (CON-01)

L'inscription se fait sur invitation (ISC-02). Le premier compte s'inscrit avec un code d'invitation à l'application. En local, le seed fournit `BIENVENUE` : ouvrir `/invitation/BIENVENUE`. Ce compte est ensuite promu administrateur en SQL (Studio local, ou éditeur SQL du projet en production) :

```sql
update public.profiles
   set role = 'administrateur'
 where id = (select id from auth.users where email = 'vous@example.com');
```

En production, le premier code se crée de la même façon :

```sql
insert into public.app_invitations (code) values ('CODE-A-CHOISIR');
```
