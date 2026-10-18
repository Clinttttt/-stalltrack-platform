---
name: stalltrack-platform-ui
description: Build or refine any page, component, modal or screen in the StallTrack Platform repo (apps/landing, apps/admin, libs/brand) so it follows one consistent visual system - civic-blue identity, the Head Portal's hero and OR/CT chip pattern, one icon set, hover-info instead of descriptive paragraphs, segmented toggles instead of stacked tables, a house dropdown, skeletons, breadcrumbs and restrained motion. Use before writing or editing any .html, .ts template or .css under those apps, and when reviewing UI there. Not for the Head Portal (Blazor) - that is the reference and is governed by its own skills.
---

# StallTrack Platform UI

One system for the public Landing and the Platform Admin. The **Head Portal (Blazor, `EEMOCantilanSDS.Client`) is the visual reference and is never edited by this skill**: its hero, OR/CT chip, dropdown and skeleton are the patterns copied here. Business meaning is never changed by a visual task.

Read `references/patterns.md` for exact specs (tokens, markup, classes) and `references/review-checklist.md` before calling a slice done.

## Order of work

1. **Name the slice** (one page or one shared piece) and which app(s) it touches. A shared piece changes every consumer: grep its selector first.
2. **Reuse before you build** (PonyTail: a house component beats a native widget, and the smallest change wins). Look in `libs/brand`, `apps/*/src/app/shared`, then `references/patterns.md`. Add a new component only when the same pattern is needed twice; build it once, shareable, not per page.
3. **Outline the page before styling it**: breadcrumb → hero → one toolbar → one working surface → states. Delete every word that repeats the heading or the button.
4. **Build with tokens and house classes only** (no raw hex, no `bg-white` page, no one-off shadows or radii).
5. **Show all four states**: loading (skeleton), empty, error, and populated.
6. **Verify in a real browser** at 1440 / 1024 / 768 / 390 px, keyboard-only, and with reduced motion. A green build is not visual approval.
7. **Report** what changed, what you reused, and any drift you saw but did not touch.

## The rules (these are what the owner repeatedly asks for)

**Colour: two or three, always the same**
- Primary: the civic blue. Neutrals: ink text, grays for surfaces and hairlines. One semantic colour per meaning (success, warning, danger), used only for status, always with words.
- Gold appears only as the OR chip tint and the small wordmark accent. No navy, no gradients, no glows, no glass.
- **Pure white is a surface, never a page.** The page (and any panel that holds a form) is the canvas tint; cards sit on it in white. A full-bleed `#fff` page or panel is a bug. Auth form panels use the pale blue tint, not white.

**Hero and instrument chips: copy the Head Portal**
- Every operator page opens with the one hero band (spec in `patterns.md`): eyebrow, title, a meta line carrying the OR/CT chip where an instrument applies, and up to three figures with value / label / note, separated by hairline dividers. Same padding and type sizes on every page; never a bespoke header.
- OR chip is gold-tinted, CT chip is neutral. The letters carry the meaning; colour only groups.

**Words: say less, put the rest behind an info icon**
- A page gets a title and at most one short subtitle. Nothing that repeats the heading, the button label or the obvious.
- Explanations of a rule or consequence go behind a small ⓘ **InfoTip** (opens on hover, focus and tap). Text that is only decoration is deleted.
- Safety and legal text stays visible, once, where it applies: consent wording, financial-authority restrictions, validation requirements, privacy notices, error reasons, token-expiry messages.

**Data: one table at a time**
- Never stack several tables or registers down a page. One table per view, switched by a **segmented toggle** (2-4 options, counts in the labels, selection kept in the URL). More than four options is a dropdown.

**Choices: house controls, not browser defaults**
- Never a native `<select>` for a visible choice: use the house dropdown (trigger, animated menu, check on active, arrow-key / Enter / Esc, `aria-listbox`).
- **Two or three options is not a dropdown**: show them as buttons or a segmented toggle. Likewise two or three related actions are buttons; four or more become one primary + a "More" menu.

**Icons: one set, one weight**
- Single line-icon set (`app-icon` / the shared set): 24px grid, **1.8 stroke**, round caps and joins, `currentColor`, sizes 16 / 20 / 24 only. No emoji, no mixed sets, no ad-hoc inline SVG with its own stroke. Icon tiles follow the one tile spec.

**Fundamentals**
- Skeleton shimmer for any region that loads (never "Loading…" text alone). Breadcrumbs on anything two levels deep. Empty states: icon + one line + one action. Error states: plain reason + a retry that only appears for temporary failures. Visible focus ring, labelled controls, one `<h1>` and one `<main>` per page, skip link, AA contrast.

**Motion: alive, not busy**
- 150-200 ms ease-out on hover, toggle and dropdown; 200-250 ms fade-and-rise (4 px) when a panel or list appears; list stagger ≤ 40 ms for the first six rows. Nothing loops except the skeleton and spinners. Honour `prefers-reduced-motion` (the global rule is in each app's stylesheet).

**Layout**
- 4 px spacing steps; containers (hero, card, modal) radius 12, controls 8, chips full. Page = canvas; the action footer of a long form is fixed so Save is never off-screen. No horizontal scroll at 390 px.

## Never

- Change financial or workflow behaviour, status transitions, routes, API calls, auth, or consent wording as part of a visual change. If the UI exposes a backend limit, say so; do not fake it.
- Invent figures, sample data, endorsements or claims on public pages.
- Edit the Head Portal or run it through this skill.
- Put tokens, credentials or real personal data in screenshots, fixtures or logs.
- Hard-code localhost, a tenant name, or an amount in markup.

## Where the repo currently disagrees with this skill

Fix these opportunistically when you touch the file; do not start a repo-wide sweep unprompted.
- Heroes and brand bands use `bg-civic` (the button blue) where the Head Portal uses the deeper **civic panel**; add the token and use it for identity bands.
- Landing has ~60 inline SVGs with seven different stroke weights; Admin has one icon component. Converge on one set.
- Component class names differ between apps (`a-btn-*` in Admin, `btn-*` in Landing) for the same things.
- No InfoTip, segmented toggle, house dropdown (Landing has `polished-select`), skeleton, breadcrumb or shared hero exist yet; `Loading…` text placeholders remain.
- 85 `bg-white` uses; check each is a surface, not a page.
