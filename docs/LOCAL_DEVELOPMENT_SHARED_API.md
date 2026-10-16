# Local Development: One Shared EEMO API

**Current coordination rule (2026-10-16).** For local StallTrack development, Head Portal, Windows Collector Mobile, Platform Operator Admin and Platform Landing must use the one already-running backend from `C:\dev\stalltrack\eemo\EEMOCantilanSDS.Api`, connected to the established local PostgreSQL database `EEMOCantilanSDS.DB`. Do not launch a second or disposable API, redirect these local frontends to production, create a second database, or change authentication/account privileges to make a screen work.

## Verified endpoints and entry points

| Component | Local entry point | Shared API it calls |
| --- | --- | --- |
| EEMO API | `C:\dev\stalltrack\eemo\EEMOCantilanSDS.Api` | HTTP `http://localhost:5117`; HTTPS `https://localhost:7097` (same process) |
| Platform Operator | `http://localhost:5173` | `http://localhost:5117` |
| Platform Landing | `http://localhost:8081` | `http://localhost:5117` |
| Head Portal | Current local client listener (on 2026-10-16: `http://localhost:5198`) | `https://localhost:7097` |
| Windows Collector (Debug) | `C:\dev\stalltrack\eemo\EEMOCantilanSDS.Mobile` | `http://localhost:5117` |

Both Platform local-development API settings live in `apps/admin/src/app/core/api.config.development.ts` and `apps/landing/src/app/core/api.config.development.ts`. Both must point to `http://localhost:5117` while the current EEMO API has that listener. The Nx **development** serve configuration swaps these files in; the separate `api.config.ts` files intentionally hold production endpoints for **production builds** and must not be changed to localhost.

From `C:\dev\stalltrack\platform`, run `npx nx serve admin --host=127.0.0.1 --port=5173` and `npx nx serve landing --host=127.0.0.1 --port=8081` in separate terminals. These launch **frontends only**. The running EEMO API must already be healthy at `http://localhost:5117/health`; avoid launching a duplicate API. The API's development CORS configuration explicitly allows the local frontend origins `http://localhost:5173` and `http://localhost:8081`.

## Update/verification discipline

1. Before working, inspect `git status -sb`, `git log -1 --oneline` and running executable paths in **both** primary checkouts: `C:\dev\stalltrack\eemo` and `C:\dev\stalltrack\platform`.
2. EEMO's latest local development work currently lives on `codex/local-unified-v8-v10-20261013` in the **primary checkout** (at `d1540c30` on 2026-10-16). EEMO's older `master` is **not** the active local development baseline. Platform has a separate local `main` at the latest accepted feature commit (at `4cd685e` on 2026-10-16). Verify current Git state instead of assuming these hashes remain latest.
3. Integrate accepted changes into the appropriate existing primary repository and retest/rebuild affected applications; a newer commit does not update an already-running binary by itself. Never merge code between the two different Git repositories.
4. Diagnose browser `Cannot reach the server` against the **already-running** API endpoint and CORS before modifying account records. A redirect to Platform `/setup` can instead mean that the shared database has no `IsPlatformOperator` account; **do not** silently create, promote, or import an operator.
5. Preserve other sessions' uncommitted changes. Do not push, deploy, migrate production, reset data, or start an alternate database/API without an explicit, reviewed decision.

This is a **local-development workflow**, not a command to use localhost endpoints in public/production builds. Historical V4/V5 handoffs and old screenshots may show previous disposable development ports; this note supersedes those ports for the current local setup.
