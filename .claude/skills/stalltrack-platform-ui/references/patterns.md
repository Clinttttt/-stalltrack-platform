# Platform UI patterns - exact specs

Values come from the Head Portal (`EEMOCantilanSDS.Client/wwwroot/app.css`, `V3Hero`, `V3HeroFigure`, `InstrumentChip`, `FhSelect`, `Skeleton`) and from the Platform preset (`libs/brand/tailwind-platform-preset.js`). If a value is not a token yet, **add the token to the preset first**; never paste a hex into a template.

## 1. Tokens

| Role | Token (Platform) | Value | Head Portal equivalent |
|---|---|---|---|
| Primary action, links, focus | `civic` | `#1f5fbf` (hover `#194f9f`, soft `#eaf1fb`, line `#c9dcf5`) | `--accent` family |
| **Identity surface** (hero band, auth brand panel, onboarding band) | `civic-panel` *(add)* | `#1d4c86` (deep `#163c6b`) | `--civic-panel` |
| Page canvas | `mist` / `canvas` | `#f4f6f9` / `#f5f7fa` | `--canvas` |
| Pale blue tint (context bands, auth form panel) | `tint` *(add)* | `#f3f7fd`, hairline `#d8e3f2` | `--surface-blue-subtle` |
| Card / modal surface | `white` | `#ffffff` | `--surface` |
| Text | `ink` / `muted` | `#17212f` / `#5b6778` (AA on white and canvas) | `--text` / `--text-secondary` |
| Hairline | `line` | `#dde3ea` | `--border` |
| Success / warning / danger | `green` / `amber` / `red` (+ `-bg`) | status only, always with words | `--green` / `--red` |
| OR chip tint | gold at 9% on surface, border gold 55% | | `.ic-or` |

Text on `civic` or `civic-panel`: white at 100 / 85 / 78 % only (never lower: contrast).

## 2. Page anatomy

```
canvas (bg-mist)
  breadcrumb                      (only if 2+ levels deep)
  HERO band                       (civic-panel, section 3)
  toolbar: [segmented toggle] [search] ............ [one primary action]
  one working surface (white card on the canvas)
     skeleton | empty | error | data
```
Never a white page. Never two competing hero-like bands. The toolbar is one row; it wraps, it does not scatter.

## 3. Hero band (copy of `V3Hero` + `V3HeroFigure`)

```html
<section class="ui-hero" aria-labelledby="page-title">
  <div class="ui-hero-id">
    <span class="ui-hero-icon" aria-hidden="true"><app-icon name="power" className="h-[22px] w-[22px]" /></span>   <!-- optional -->
    <div>
      <p class="ui-hero-eyebrow">Operations · ECF</p>
      <h1 id="page-title" class="ui-hero-title">Electricity Consumption Fees</h1>
      <p class="ui-hero-meta">October 2026 · <ui-instrument-chip instrument="OR" /> Official Receipt</p>
    </div>
  </div>
  <dl class="ui-hero-figures">                                   <!-- 0-3 figures (max 4 for pure counts) -->
    <div class="ui-hero-figure"><dd>₱0.00</dd><dt>Assessed</dt><small>Approved amounts</small></div>
  </dl>
</section>
```
```css
.ui-hero{display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px;padding:18px 24px;margin-bottom:20px;
  border-radius:12px;background:theme(colors.civic.panel);color:#fff}
.ui-hero-compact{padding:14px 20px;margin-bottom:16px}
.ui-hero-id{display:flex;align-items:center;gap:16px;flex:1 1 260px;min-width:0}
.ui-hero-icon{width:48px;height:48px;border-radius:10px;display:grid;place-items:center;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
.ui-hero-eyebrow{font-size:.6875rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.78)}
.ui-hero-title{font-size:1.375rem;font-weight:700;line-height:1.2}
.ui-hero-meta{font-size:.875rem;color:rgba(255,255,255,.88)}
.ui-hero-figures{display:flex;gap:0}
.ui-hero-figure{padding:0 24px;border-left:1px solid rgba(255,255,255,.25)}   /* first child: no border, no left padding */
.ui-hero-figure dd{font-size:1.375rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.ui-hero-figure dt{font-size:.75rem;font-weight:500;color:rgba(255,255,255,.88)}
.ui-hero-figure small{font-size:.6875rem;color:rgba(255,255,255,.78)}
```
Rules: eyebrow is `SECTION · CODE`, upper-case, the only upper-case text on the page. Title is the only `<h1>`. Figures are numbers with a label and an optional one-line note; no more than three. On narrow screens the figures wrap under the identity and the dividers become a top border. Every operator page uses this, with the same sizes.

## 4. Instrument chip (OR / CT) - copy of `InstrumentChip`

```html
<span class="ui-ic ui-ic-or"><span class="ui-ic-code" aria-hidden="true">OR</span><span class="sr-only">Official Receipt</span></span>
```
`ui-ic-code`: min-width 30px, height 22px, padding 0 6px, 1px border, radius 4px, 11px / 600, tracking .04em, ink text on `surface-muted`. **OR**: border and 9 % tint of gold. **CT**: neutral (white on the hero band, `surface-muted` elsewhere). The letters + the spoken name carry the meaning; the tint only groups. The instrument always comes from the data, never from the component.

## 5. Icons

One set (`app-icon` or its shared successor): 24 viewBox, `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`. Sizes `h-4 w-4` (inline), `h-5 w-5` (buttons, nav), `h-6 w-6` (tiles, empty states). An icon with no text next to it needs an `aria-label` on its button. **Tile** (on a light surface): 40px, radius 10, `civic-soft` background, `civic` icon. **Tile on the hero**: 48px, translucent white, white icon. Status icons are never the only signal.

## 6. InfoTip - descriptions go here, or nowhere

A 20px round button with the info icon next to the label or heading it explains.
```html
<button type="button" class="ui-info" aria-describedby="tip-x" aria-label="About {topic}"><app-icon name="info" className="h-4 w-4" /></button>
<span role="tooltip" id="tip-x" class="ui-tip">One or two sentences. No headings, no lists.</span>
```
Opens on **hover, keyboard focus and tap**; closes on blur, Esc and outside tap; never covers the thing it explains; max-width 280px; ink background, white 13px text, 6px radius, 120 ms fade. Touch: tap toggles. Keep tips to what a new office worker needs once.
Decision rule: restates the title or button → delete. Explains a rule or consequence → InfoTip. Legal, financial-authority, privacy, validation requirement or an error reason → stays visible, once.

## 7. Segmented toggle (replaces stacked tables)

```html
<div class="ui-seg" role="tablist" aria-label="Show">
  <button role="tab" aria-selected="true">Pending <span>3</span></button>
  <button role="tab" aria-selected="false">Onboarding <span>1</span></button>
</div>
```
Pill track on `mist`, selected segment white with a hairline and `ink` text (or `civic-soft` + `civic` on the canvas), 36px tall, radius 10, counts as quiet numerals. Left/Right arrows move, Home/End jump, selection kept in the URL (`?view=`) so reload and Back behave. 2-4 options; more becomes the dropdown. The panel below swaps with a 200 ms fade. One table (or list) visible at a time.

## 8. House dropdown (replaces native `<select>`)

Trigger: 40-42px high, 1.5px `line` border, radius 10, white, the current value left (optional 11px caption above it), chevron right that rotates 180° when open; hover border `civic`; open border `civic` + 3px `civic` ring at 12 %. Menu: 6px below, radius 12, white, 1.5px border, soft shadow, `max-height` 320 with thin scrollbar, **150 ms fade-and-rise**, items 36px, hover `mist`, active = bold + check icon. Behaviour: arrow keys, Home/End, type-ahead, Enter selects, Esc closes and returns focus, click outside closes; `role="listbox"` / `option`, `aria-expanded`. Landing's `polished-select` is the starting point; promote it to the shared kit. A list of 2-3 choices is a segmented toggle or buttons, not this. A native `<select>` is allowed only inside a date/month picker.

## 9. Skeleton (copy of `Skeleton`)

`.ui-skel`: block, `#e3e8ef`, radius 8, a white-90 % shimmer sweeping left-to-right over 1.25 s, **no animation under `prefers-reduced-motion`**. Compose it to the shape of the real content (a hero-height bar, 5 table rows, 3 cards) so the layout does not jump when data arrives. Replace every bare "Loading…" with it; keep a visually hidden `role="status"` "Loading".

## 10. Breadcrumb

`Section / Page / Detail` in 13px muted text, `/` separators, current page `ink` and `aria-current="page"`, links `civic` on hover. Sits above the hero. Omit on top-level pages.

## 11. States

- **Empty**: 24px icon in a tile, one line of text, one action. No paragraph.
- **Error**: a `note-danger` with the server's plain reason; a Retry button only for temporary failures (network, 5xx). A setup/conflict reason has no retry; it names the fix and links to it.
- **Disabled**: 50 % opacity, `cursor-not-allowed`, and a title/InfoTip saying why when it is not obvious.
- **Success**: a short inline confirmation; no modal for a plain save.

## 12. Auth frame (the canonical sign-in)

Split screen from tablet width: left = `civic-panel` brand panel (logo, one heading, one sentence, the audit line), right = **tint** form panel (not white) holding only the form. Phones: compact blue header, then the form. One heading + at most one sentence per screen. The same frame serves sign in, first-run setup, forgot and reset.

## 13. Buttons and forms

One primary per view (`civic`, white text, radius 8, 40px). Secondary: white with a hairline. Danger: tinted red, never solid. Related actions of 2-3 sit together as buttons; a fourth moves into "More". Long forms get a **fixed action footer**. Labels above inputs in 13px ink-80, sentence case; required marked with a `civic` asterisk; native validation messages shown in `note-danger` style; inputs 40px, radius 8, focus border `civic` + 2px ring at 20 %.

## 14. Motion tokens

```css
:root{--ui-fast:150ms;--ui-base:200ms;--ui-slow:250ms;--ui-ease:cubic-bezier(.2,.7,.2,1)}
@keyframes ui-rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.ui-enter{animation:ui-rise var(--ui-slow) var(--ui-ease) both}
.ui-stagger>*:nth-child(-n+6){animation:ui-rise var(--ui-slow) var(--ui-ease) both;animation-delay:calc(var(--i,0)*40ms)}
```
Hover/press feedback ≤ 150 ms; nothing bounces; the global reduced-motion rule disables all of it.

## 15. Sensitive values (privacy pattern already in Admin)

Rates, fees and e-mail addresses on review screens use the shared `Sensitive` component and `PrivacyService` (hidden by default, reveal for one request, Privacy mode, auto-hide). It is a shoulder-surfing aid, never access control; never describe it as security.
