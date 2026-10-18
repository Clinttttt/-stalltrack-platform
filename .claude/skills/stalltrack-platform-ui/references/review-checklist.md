# Review checklist - run before saying a Platform UI slice is done

Tick every line or say why it does not apply. Findings go in the report; do not silently skip.

## Look
- [ ] The page is the **canvas tint**, not white. White appears only on cards, modals and fields. Auth form panel uses the pale blue tint.
- [ ] Colours are the primary blue, neutrals, and status colours used only for status (with words). No navy, gold (except OR chip / wordmark), gradients, glows or glass. No raw hex in templates.
- [ ] The page opens with the standard **hero band** (same padding and type sizes as every other page), at most three figures.
- [ ] OR / CT are shown with the instrument chip (OR gold-tinted, CT neutral), and only where the data says so.
- [ ] Every icon comes from the one set, 1.8 stroke, sizes 16 / 20 / 24, `currentColor`. No inline SVG with its own stroke width; no emoji.
- [ ] Spacing is on the 4 px scale; containers radius 12, controls 8; text sentence case except the hero eyebrow.

## Words
- [ ] Title plus at most one short subtitle. Nothing repeats the heading or a button.
- [ ] Explanations of a rule or consequence are behind an **InfoTip** (hover, focus and tap all work). Pure decoration deleted.
- [ ] Safety and legal text (consent, financial-authority restriction, validation requirement, privacy notice, error reason, token-expiry) is **still visible and word-for-word unchanged**.

## Structure
- [ ] **One table or list visible at a time**; alternatives are behind a segmented toggle (selection in the URL).
- [ ] No native `<select>` for a visible choice; the house dropdown is used. Choices of 2-3 are buttons / a toggle, not a dropdown. 4+ actions become primary + "More".
- [ ] Loading uses a **skeleton** shaped like the content; empty, error and populated states all exist and were looked at.
- [ ] Breadcrumb on pages two levels deep. Long forms have a fixed action footer.

## Behaviour (must be unchanged)
- [ ] No change to routes, guards, API calls, request/response shapes, status transitions, validation rules, consent wording, or the order of loads.
- [ ] Existing component specs still pass; selectors/text they assert were kept or deliberately updated with the same meaning.
- [ ] Anything the UI exposes as a backend limit is reported, not faked.

## Accessibility
- [ ] One `<h1>` and one `<main>`; skip link; every control has an accessible name; focus ring visible on every interactive element; Tab and Shift+Tab reach everything in a sensible order; Esc closes menus and dialogs and returns focus.
- [ ] Contrast AA (text on civic/civic-panel is white at ≥ 78 %); status never by colour alone.
- [ ] `prefers-reduced-motion` removes the animation (no shimmer, no rise).

## Responsive and real-browser evidence
- [ ] Opened in a real browser at **1440, 1024, 768 and 390 px** (use CDP viewport emulation, not a resized headless window - headless Chrome will not go below ~500 px). `document.documentElement.scrollWidth <= innerWidth` at each.
- [ ] Before/after screenshots with fictional data; no token, credential or real personal data visible (links masked).
- [ ] Dev build points at the local API; **production build contains no `localhost` or `127.0.0.1`** (grep `dist/apps/<app>`).

## Tests and guards
- [ ] `npx nx test landing` and `npx nx test admin` pass; counts reported.
- [ ] New behaviour has a spec (a toggle that switches, an InfoTip that opens on focus, a dropdown with the keyboard, a skeleton that is replaced).
- [ ] `apps/landing/src/app/platform-theme.spec.ts` still passes. When this skill adds a new hard rule that can be checked from source (for example "no native `<select>`"), extend that guard in the same change.
- [ ] `eslint` clean on touched files.

## Report format
What changed, which shared pieces were reused or added, the screenshots, test counts, drift noticed but left alone, and any backend gap (`current behaviour / required behaviour / why the UI cannot truthfully do it / exact contract needed`).
