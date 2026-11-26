# Pull requests (§13.3)

Part of the rule set in [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. These rules are as
binding as the ones there. Section numbers are unchanged, so a `§` reference anywhere in the repository still names
the same rule; a § this file doesn't hold is in `CLAUDE.md` or the file its "Rule files" table names.

---

### 13.3 Pull requests

**Rule:** Use `.github/pull_request_template.md`.

- **Base branch:** `dev` for feature and fix branches. Only a release merges `dev` into `main`, and it bumps `version`
  in `package.json`.
- **Title:** Conventional Commits, `type(scope): summary`, e.g. `feat(email): add an AWS SES email driver`.
- **Body:** `gh pr create --body` replaces the template, so write the body under its headings (Summary, Changes,
  Breaking changes, Test plan, Checklist, Notes for reviewers) and pass it with `--body-file`. Tick only the checks
  you actually ran.
- **Breaking changes:** list every changed contract (interfaces in `src/application/interfaces/`, repository or
  service signatures, error types, routes, response shapes, renamed or removed env vars), or write "None".
