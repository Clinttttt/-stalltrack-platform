# Platform UI Modernization V4 — Handoff

Branch `feat/onboarding-tenant-operations-v2` (Platform repository only). Local commits only: nothing pushed, deployed, migrated
or merged. The EEMO repository, Claude 1's Operations V11 worktree and the main checkout's protected files were not touched.

## 1. Starting point and commits

| | |
|---|---|
| Starting commit | `640897a` fix(platform-admin): use isolated API in local development |
| `a158d92` | feat(platform): one civic-blue theme for the public Landing and the Platform Admin |
| `0431259` | feat(platform-admin): modernize the console and mask sensitive review details |
| `a3f6224` | feat(landing): modernize the assessment request, onboarding workspace and public pages |
| (this file) | docs: handoff and before/after evidence |

## 2. Shared theme (`a158d92`)

* New `libs/brand/tailwind-platform-preset.js`, applied **after** the shared brand preset and only by `apps/landing` and
  `apps/admin`. The brand preset (and therefore the Payor app, which is out of scope) is unchanged.
* Palette: civic blue `#1f5fbf` / hover `#194f9f` / soft `#eaf1fb` (the Head Portal's `--accent` family), text `ink #17212f`,
  canvas `mist #f4f6f9`, hairline `#dde3ea`, secondary text `#5b6778` (AA on white and on the canvas). Gold survives only as the small
  "Track" accent in the wordmark.
* `navy` is deliberately remapped to the civic blue in this preset, so a stray legacy class can never render the old dark panel.
* Component classes: buttons (`a-btn-primary/ghost/danger`, `btn-primary/secondary/light/ghost`), sentence-case status chips,
  inline notes, the masked value, one visible `:focus-visible` ring and `prefers-reduced-motion` handling in both apps.
* Guard: `apps/landing/src/app/platform-theme.spec.ts` reads both apps' sources and fails if a retired navy/gold/brand-gradient
  class or the old navy hex values return. Photo scrims are allowed; brand gradients are not.

## 3. Old navy removal coverage

Retired-treatment references in non-spec sources of both apps (`bg/text/border/ring/from/to/…-navy`, `a-btn-navy`, `btn-gold`,
`bg-gold`, `border-gold`, `#0d2137`…): **388 at `640897a` → 0**. `bg-navy` surfaces: 51 → 0. Covered: Admin login, setup, forgot,
reset, shell, Onboarding, Validation, Activation; Landing assessment modal, onboarding page and workspace, municipality list and
rollout pages, privacy, terms, thank-you, assessment-received, footer, polished select. The browser tab colour (`theme-color`) is
now the civic blue too.

## 4. Pages and components changed

* **Admin:** `auth-shell` (new shared frame), `login`, `setup`, `forgot-password`, `reset-password`, `admin-layout` (light sidebar,
  and a tab bar below desktop width — the old shell had **no navigation at all** under 1024 px), `console`, `validation`,
  `activation`, new `shared/privacy/{privacy.service,sensitive}`.
* **Landing:** `request-assessment-modal`, `onboarding` page, `onboarding-workspace`, plus the public pages restyled by two
  context-aware passes (gold-on-navy → white-on-blue inside bands, civic blue elsewhere).

## 5. Assessment request (Landing)

* A civic-blue header over four sections: **Requesting LGU**, **Contact person**, **What an assessment may cover**,
  **Authorization**. Required fields, native validation (visible `:user-invalid` state), `inputmode`/`autocomplete`, first field
  focused, Esc and the close button, one primary action. The redundant Cancel is gone.
* Both consent statements are **word for word** as before (asserted by a test).
* **Scope source:** `ASSESSMENT_SCOPE` is four groups — Markets & vendors, Spaces & rentals, Utilities & services, Facilities &
  transport — whose operation names are **read from the platform's own `OPERATION_CATALOG`** (the list the onboarding workspace
  offers), so it cannot drift. A test requires every catalog operation to appear exactly once and none to be invented. One line
  says these are examples and a request activates nothing; there is no "guarantee"/"automatic" wording.
* The submission payload, API call, `/assessment-received` redirect and token-free flow are unchanged.

## 6. LGU onboarding

* Page: one compact blue band (province, "Onboarding · {municipality}", status line, the four rollout stages as a thin tracker)
  replaces the tall hero and the separate progress section. Expired/invalid link state kept and simplified.
* Workspace: the **three real sections** (Head account, Branding & receipts, Facilities & operations) shown as one stepper from the
  **same flags** the submit rule has always used (`adminDone`, `brandingDone`, `facilitiesDone`); each step jumps to its section.
  Nothing is invented: a test pins `steps()` to those flags.
* Copy: what happens after activation is said **once** (rates, payors and Collectors are set up in the Head Portal) instead of under
  every card and operation; per-operation descriptions moved to a tooltip and screen-reader text; the separate "Vendors & daily
  collections come later" card and the repeated helper under each local name are gone. The unreadable-newer-version and
  discard safeguards are untouched.
* Submission: a white card that says "Ready to submit" or lists exactly what is still needed (as jump buttons), including "Fix the
  operation names marked above". Submit stays disabled until `allDone() && operationsValid()`; `submit()` still refuses to emit
  otherwise (tested directly). Save/resume verified in the browser (reload keeps the entered Head name).

## 7. Platform Admin authentication

* Sign in, first-run setup, forgot and reset share one frame: a StallTrack blue bar, one white card, the audit notice. The cluster
  blurb is no longer repeated on each screen. The email-confirmation notice is a plain amber banner above the page (still
  derived from the account's real verified state; reset still requires a confirmed address).
* Verified live: login redirects to `/setup` while no operator exists; password mismatch message; creation; a second create attempt
  returns **409**; forgot-password shows identical wording for a known and an unknown address and no link/token text.

## 8. Validation layout and privacy

* Layout: summary band, request list, structured detail (facilities → declared operations → office → accounts → decision).
* **Declared operations** are grouped Market collections / Utilities / Spaces & rentals / Other enterprise operations with the
  LGU's local name or "Standard name", and one explanation for the section (not "setup after activation" on every row). Canonical
  codes are untouched; only labels are shown.
* **Hidden by default:** every ₱ rate and fee, monthly rent, section rates, and e-mail addresses. **Never hidden:** facility and
  operation names, counts, completeness, warnings, validation errors and the reason approval is blocked.
* The hidden state renders a placeholder built from the value's **length only**; the real text is not in the DOM (asserted by tests
  and in the browser: with details hidden the page text contains neither `35`/`1050` nor the e-mail).
* **Reveal:** per request, in memory only. It ends when the reviewer switches request, leaves the page, switches tab, or stops for
  two minutes. **Privacy mode** (screen sharing) hides what is showing and disables Reveal. **Approving with details hidden asks
  once** ("Approve anyway" / "Reveal details"); an approval error is never masked.
* The one-time **onboarding link** (console) and **Head activation link** (activation) are masked until shown; Copy works either way.
* **This is a shoulder-surfing aid, not access control.** The data is already in the page for any signed-in platform operator.

## 9. Backend authorization (verified live against the local API)

| Caller | `GET onboarding/by-request/{id}` | `GET assessment/requests` | `POST …/approve-validation` | `POST activation/municipality[/preflight]` (valid body) |
|---|---|---|---|---|
| anonymous | 401 | 401 | 401 | 401 |
| tenant Head (not an operator) | **403** | **403** | **403** | **403** |
| platform operator | 200 | 200 | stage-guarded | 200 / 409 "in Onboarding, not Activation" |

A Head also cannot sign in to the console (`console-login` → 403). **BACKEND GAP (no change made):** the validation response carries
the whole configuration to any operator. If sensitive values must be withheld from operators who only coordinate, the API would
need to return them from a separate, audited "reveal" endpoint. Until then the masking above is presentation only and is described
that way. No secret, password or signing token is ever in that response.

## 10. Activation screen

Same summary band and cards; accounts to create; declared operations in one compact list; warnings and mapping errors kept
(they block "Send and activate"); success state "is live" with the link masked. Unchanged: the stage guard, the preflight, the
inactive Head account, the single-use link. Local note: the owner's launcher does not set `ACTIVATION_LINK_BASE`, so a locally
issued Head link shows the production console host; set it in the launcher to see a local link.

## 11. Copy reduction

Removed or merged: the Admin brand-panel paragraphs and cluster name on four screens; repeated stage subtitles and "syncs via API"
labels; the all-caps eyebrows; the duplicate password note and the per-operation helper/description text in the workspace; the
separate post-activation card; the assessment modal's long facility intro. Kept: consent wording, financial-authority
restriction (once), validation requirements, privacy notice, error reasons, expiry messages.

## 12. Responsive verification (real browser, CDP viewport emulation)

No horizontal overflow at **1440, 1024, 768 and 390 px** for: Admin login, setup, forgot, reset, onboarding, validation (masked),
activation; Landing assessment modal (dialog 672 px wide, 358 px at 390), onboarding workspace, municipality page, privacy.
Screenshots in `docs/evidence/ui-v4/{before,after}`. (The "before" set is desktop only; the pre-redesign mobile layout was not
captured. The "before" login image is the setup screen, because that database had no operator when it was taken.)

## 13. Tests

| Suite | Before | After |
|---|---|---|
| Landing (`nx test landing`) | 55 | **77 passed** (12 files) |
| Platform Admin (`nx test admin`) | 97 | **126 passed** (14 files) |

New: privacy service (8), sensitive value (4), Validation privacy behaviour (8), activation link masking (5), console frame (4),
assessment scope + modal (9), workspace progress/submission (7), theme guard (6). All existing business specs pass unchanged.
`eslint` on every touched file: 0 errors (30 existing warnings). `nx lint landing` as a whole still reports its existing errors in
files this work did not change.

## 14. Builds and API separation

* Production builds (landing, admin): succeed; bundle scan finds **no `localhost:5123`** and **no `127.0.0.1`**, and contains the
  production API host.
* Development builds: contain `localhost:5123` (the file replacement in `api.config.development.ts` is intact).
* No localhost onboarding link is hard-coded; the link base still comes from the API's environment.

## 15. Environment used

Local only: Landing `localhost:5273`, Admin `localhost:5274`, API `localhost:5123`. To avoid touching the owner's data (an operator
password I do not have), the API was pointed at scratch databases `ui4_verify` / `ui4_setup` created inside the existing
`stalltrack-landing-smoke` container; they are dropped afterwards. The owner's `stalltrack_landing` database was not modified. All
people, municipalities and e-mail addresses in the screenshots are fictional. Links and tokens are masked in every screenshot, and
no token appears in this document.

**Observation:** Docker Desktop's engine stopped on its own during the session and had to be relaunched. After it came back the
containers `stalltrack-v9-smoke`, `stalltrack-v10` and `onboarding-manual-pg` (other workstreams') were no longer listed. This work
never removed them (the only container this session created was removed by name earlier); worth a look by their owners.

## 16. Known limitations / dependencies

1. Masking is not access control (section 9). A split reveal endpoint is the real fix and needs a backend change.
2. Municipality list and rollout pages were migrated to the new palette and contrast but not re-laid-out.
3. The "before" mobile screenshots are missing (section 12).
4. Existing `nx lint landing` errors in untouched files remain.
5. Production deployment, real e-mail delivery and a real operator password-reset round trip were not exercised.
