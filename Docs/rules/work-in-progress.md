# Work in progress (§14)

Part of [`CLAUDE.md`](../../CLAUDE.md), moved here to keep that file short. This is status, not rules: what is built
and what isn't yet. Planned work is in `Docs/TODO.yml`.

---

## 14. Work in progress

- **Permission checks (§9.6):** only `/app/emails` uses `PermissionMiddleware`. `/auth/roles`, `/auth/resources` and
  `/users` check login only, so any logged-in user can change role permissions.
- **Email (`Docs/features/email.md`):** SMTP and SES drivers, queued through `EmailWorker` and logged; admin reads at
  `/app/emails`. Planned: status webhook, attachments.
- **Push notifications:** sent directly through AWS SNS. No SMS driver, no queueing, no logging (notification manager
  planned).
- **Notification log:** built, not wired; no endpoints yet.
- **OpenTelemetry:** phases 1–4 built (`src/app/core/telemetry/`); 5–7 not started
  (`Docs/plans/OpenTelemetry_Implementation_Plan.md`).

Planned work: `Docs/TODO.yml`.
