# Production Platform Admin first-operator setup — Caddy gate

**Investigated 2026-10-22. Fix prepared locally; no production proxy change or operator provisioning performed.**

## Verified evidence

- Site: `https://admin.stalltrack.site/setup`.
- Angular sends `POST https://api.stalltrack.site/api/platform-setup/create-first-operator` with JSON. Browsers send an `OPTIONS` CORS preflight.
- With `Origin: https://admin.stalltrack.site`, `OPTIONS /api/platform-setup/create-first-operator` returned **403 Forbidden**, `Server: Caddy`, body **"Initial setup is disabled."**, and no `Access-Control-Allow-Origin` header. The browser surfaces this as an HTTP status-0 error, which the old UI mislabeled as a server outage.
- `GET /api/platform-setup/status` from the same origin returned **200 OK**, `{"isSetupRequired":true}`, and `Access-Control-Allow-Origin: https://admin.stalltrack.site`. The API is healthy, its production origin is allowed, and **no platform operator exists according to the application status endpoint**.
- `PlatformSetupController` and `CreateFirstConsoleAdminCommandHandler` allow only the first operator; they refuse creation after an operator exists. They also check the default municipality's username and email uniqueness.
- The restriction is **outside** Angular and ASP.NET Core, at the production reverse proxy. Editing only Angular or the CORS policy cannot permit account creation.

## Local code correction

`apps/admin/src/app/core/platform-setup.service.ts` now checks the read-only status endpoint when the POST fails with browser status 0. A reachable API that still requires setup results in an accurate **production setup gate blocked** message; an actual outage still displays a network failure. Tests cover preflight-like status 0, already-provisioned setup status, offline fallback and 403.

## Authorized server-side remediation (not executed)

1. In an **authorized production administration session**, inspect the active Caddy configuration for the exact `/api/platform-setup/create-first-operator` denial. Preserve the current configuration as a rollback copy. Do **not** blindly remove or replace other API routing, TLS, authentication or CORS rules.
2. Establish a **short-lived, narrow, operator-authorized bootstrap exception** that permits the approved admin origin's `OPTIONS` preflight and the intended **one-time** `POST` while denying arbitrary public operator provisioning. Restrict the actual write to the authorized operator, with a limited time window and an auditable closing step; do not put the operator password into logs, shell history, source or GitHub secrets.
3. Validate the Caddy configuration before reloading. Verify the preflight receives the necessary CORS response from the approved origin, without allowing unrelated origins.
4. Create the operator once through the approved first-setup flow. Verify `GET /api/platform-setup/status` becomes `{"isSetupRequired":false}`; confirm console login separately.
5. **Close the bootstrap exception immediately** and recheck that further first-operator creation is denied. Preserve all existing PostgreSQL data, the API/portal release images and backup schedules.

**No live provisioning, production reload, database edits, commits, pushes, merges or deployments are included in this local correction.** The public setup page **will remain blocked until the production Caddy gate is deliberately and safely opened for the authorized one-time setup**.
