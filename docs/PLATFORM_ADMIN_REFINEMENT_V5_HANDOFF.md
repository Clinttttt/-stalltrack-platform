# Platform Admin Refinement V5 — Handoff (Workstream A)

Platform repository, branch `feat/onboarding-tenant-operations-v2`. Starting commit `f14cca1`. Local only: nothing pushed, deployed or
merged. Authentication endpoints, permissions, password policy, setup restriction, email confirmation, session handling and the
API environment separation were **not** touched; this is layout and presentation.

## 1. Authentication: one split-screen frame

`shared/auth-shell/auth-shell.ts` is the single frame for Sign in, first-run Setup, Forgot password and Reset password.

* **Desktop (≥1024):** two equal panels. Left, the StallTrack civic blue with the logo, "Platform Admin", one heading
  (*Municipal onboarding, managed in one place.*), one sentence (*Review LGU assessments, validate configurations, and oversee
  activation.*) and the audit notice. Right, a white panel holding only the form. No lists, statistics or illustrations.
* **Tablet (768–1023):** the same two panels, brand panel proportionally narrower. The setup form stacks its fields in one column
  below 1024 px (two columns were cramped at tablet width).
* **Phone (<768):** a compact blue header (logo + name), then the form; the audit notice sits at the bottom. The header is pinned
  to its content height (an early version let it stretch).
* Pages keep their own headings, fields, validation and states; the shell contains no logic. Contrast and `:focus-visible` are
  unchanged from the shared styles. Verified live: login redirects to setup while no operator exists, mismatch message, creation,
  409 on a second attempt (previous pass), identical forgot-password wording for known/unknown addresses.

## 2. Internal overflow: the cause and the fix

**Cause.** `main` was a plain block with `overflow-hidden` from 1024 px, and every page root was `h-full`. When the
"email not confirmed" banner appeared above the page, the page still claimed 100 % of `main`, so it ended exactly one banner-height
below the visible area: the bottom of every review panel, including its action buttons, was cut off at laptop heights. The decision
and send buttons also sat at the end of a long scrolling body.

**Fix (structure, not hiding anything).**
* `main` is a flex column. The banner is `shrink-0`; the page root is `flex-1` (`lg:min-h-0`), so it takes what is left. Routed page
  hosts are `display: contents` so the root is laid out by the shell directly.
* Each review panel (Onboarding, Validation, Activation) is a column: a scrolling **body** (`lg:overflow-y-auto`, the scroll happens
  in the panel) and a fixed **action footer**. On desktop the footer is a fixed row of the panel; below 1024 px it is
  `sticky bottom-0` so the primary action stays on screen while the page scrolls.
  * Onboarding: Approve & issue link / Decline; Send approval or Send decline / Cancel (the message stays in the body, errors in
    the footer); Advance to Validation with the reason when unavailable.
  * Validation: Approve and send to Activation / Return to onboarding, the "still hidden" prompt and any error. Privacy masking is
    unchanged.
  * Activation: Activate / Send and activate + Cancel, with "Resolve the items above first" when mapping errors block it.
* The status tabs are a 2×2 grid in the narrow list column and a single row where there is room (they overflowed at 1024 and 360).

## 3. Verification

An automated layout inspector in a real browser logs in and walks 8 states × 6 viewports (1440×900, 1366×768, 1024×768, 768×1024,
390×844, 360×740): every control must be inside the viewport and not clipped sideways by an ancestor, no button/chip text may
overflow its box, the page must not scroll sideways, and every action footer must lie fully inside the viewport (phones are read
with the panel scrolled into view, as a user would). **Before the fix: 3 failing states (360 px tabs) and the footers below the
fold at laptop heights; after: 0 of 48 failing.** Screenshots: `docs/evidence/ui-v5/{before,after}`.

| Check | Result |
|---|---|
| Admin tests | **134 passed** (126 → 134: split-shell structure ×3, footer placement ×6 incl. validation, Activation/Console) |
| Landing tests (regression) | 77 passed |
| ESLint, touched admin sources | 0 errors |
| Production Admin build | succeeds; no `localhost:5123` / `127.0.0.1` in the bundle |

## 4. Files

`apps/admin/src/app/shared/auth-shell/auth-shell.ts` (+ spec), `shared/admin-layout/admin-layout.html`, `pages/setup/setup.html`,
`pages/console/console.html`, `pages/validation/validation.html`, `pages/activation/activation.html`, `styles.css` (host
`display: contents`), new `pages/action-footer.spec.ts`, `pages/validation/validation.spec.ts`.

## 5. Environment and limitations

Local Admin `localhost:5274`, API `localhost:5123` on scratch databases (`ui5_verify`, `ui5_setup`, created inside the existing
`stalltrack-landing-smoke` container and dropped afterwards). The owner's `stalltrack_landing` database was not modified. Data is
fictional; no token or credential appears in any screenshot.
The Landing site and the Payor app were not changed. Not exercised: real e-mail delivery and production.
