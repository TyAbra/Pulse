# Pulse — Personal Cash-Flow Calendar

Local-first React app that answers one question: *when do I get paid, how much, and what's left after the bills I know are coming?* Data lives in `localStorage` (JSON export/import for backup); no backend, no bank sync.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run preview` — preview the built app
- `npm run lint` — oxlint
- `npx vitest run` — unit tests (projection engine, dates, rules, store)

## Architecture

- `src/lib/dates.ts` — floating local-date helpers (UTC-midnight convention, dodges the rrule DST bug)
- `src/lib/rules.ts` — Rule model, recurrence builders, validation
- `src/lib/engine.ts` — pure projection engine: rules → events + daily balance + month summaries
- `src/store/useStore.ts` — zustand store with guarded localStorage persistence + export/import
- `src/components/` — TopBar/BalanceCounter, zoomable Canvas (pinch/scroll survival kit), Wave, MonthTiles, MonthView, EventCard, RuleSheet, Fab

## Future ideas (out of scope for v1)

- PWA / offline install
- iCal import
- Focus-month navigation (tile click → that specific month; v1 zooms into the current month)

---

This project was scaffolded from a React + TypeScript + Vite template.

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
