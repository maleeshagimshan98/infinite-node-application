<!--
  Title: Conventional Commits — `type(scope): summary`, e.g. `feat(email): add an AWS SES email driver`.
  Base branch: `dev` for feature and fix branches; `main` only for a `dev` → `main` release.
  Delete any comment or section that does not apply.
-->

## Summary

<!-- What this PR changes and why. Link related issues, e.g. `Closes #123`. -->

## Changes

<!-- Group by area (Domain, Application, Infrastructure, Presentation, Tooling, Docs); name the key files. -->

## Breaking changes

<!-- Changed contracts: interfaces in src/application/interfaces/, repository or service signatures, error types,
routes, response shapes, renamed or removed env vars, data migrations. Write "None" if there are none. -->

## Test plan

- [ ] `npm run lint` is clean
- [ ] `npx tsc --noEmit` passes and `npm run build` succeeds
- [ ] `npm test` passes

<!-- Add the manual checks you ran, e.g. endpoints exercised, worker started, `docker compose up`. -->

## Checklist

- [ ] Follows the layer patterns in `CLAUDE.md` / `AGENTS.md`; no inner layer imports an outer one
- [ ] Full-tag JSDoc on every new or changed non-trivial method (`CLAUDE.md` §22)
- [ ] No new type assertions beyond the pre-approved exceptions (`CLAUDE.md` §24)
- [ ] New env vars are in `.env.example`
- [ ] Docs updated where behavior or a pattern changed (`CLAUDE.md`, `AGENTS.md`, `README.md`, `Docs/`)
- [ ] Release PR (`dev` → `main`): `version` bumped in `package.json`

## Notes for reviewers

<!-- Areas that need a closer look, follow-ups, deployment prerequisites (secrets, IAM permissions, index changes). -->
