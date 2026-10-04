# Linkbase — UI Components & Patterns

Companion to `design-system.md`. Every component below exists in `components/**` (React reference implementations with inline styles). Rebuild them as Tailwind components using the class names from `design-system.md`. Anything not defined by the system is **TBD**.

Global rules:
- Sentence case for all labels. Wordmark always lowercase "linkbase". No emoji.
- Hover: primary → ember-600; other buttons → 85% opacity; text links → ember-700.
- Disabled: 40% opacity, `cursor: default`. No press/active shrink.
- Transitions: `duration-180 ease-brand` on colour/opacity/transform only.
- **Focus-visible styles are TBD across the whole system.** Several components set `outline: 0`. See §4.

---

## 1. Components

### 1.1 Logo — `brand/Logo`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | number (px) | 24 | 24 marketing nav · 22 app/signup nav · 20 footer & editor bar |
| `inverse` | boolean | false | Text → cream-150, centre dot → ink-900 |
| `markOnly` | boolean | false | Mark only |

Mark is `size × 1.25` square; gap `size × 0.28`. Mark SVG is `aria-hidden`; wordmark text is the accessible name. When wrapped in a link, give the link `aria-label="Linkbase home"` if `markOnly`.

---

### 1.2 Button — `actions/Button`

Always pill (`rounded-full`), DM Sans 600, `inline-flex` centred, gap 8, `whitespace-nowrap`.

**Variants**

| Variant | Background | Text | Border | Hover | Use |
|---|---|---|---|---|---|
| `primary` | ember-500 | ink-950 | none | bg ember-600 | The one conversion action per view ("Claim your link", "Continue", "View page") |
| `dark` | ink-900 | cream-150 | none | opacity .85 | "Sign up free", template "Use" |
| `soft` | cream-200 | ink-900 | none | opacity .85 | "Log in" |
| `outline` | transparent | ink-900 | 1px cream-350 | opacity .85 | "Back", "Continue with Google", "Browse templates" |
| `ghost` | transparent | ink-900 | none | opacity .85 | Low-emphasis actions |

**Sizes**

| Size | Height | Padding-x | Font |
|---|---|---|---|
| `lg` | 60px | 28px | 17px |
| `md` (default) | 48px | 22px | 15px |
| `sm` | 36px | 14px | 13px |

Editor top-bar "View page" overrides to 40px / 16px / 14px (one-off).

**Other props:** `fullWidth`, `type` (`button` \| `submit`), `iconRight` (e.g. `→`, rendered `aria-hidden`), `disabled`.

**States:** default · hover · disabled (opacity .4) · focus **TBD** · active (no change) · loading **TBD**.

```tsx
<Button variant="primary" size="lg" type="submit">Claim your link</Button>
<Button variant="outline" iconRight="→">Browse templates</Button>
```

---

### 1.3 ClaimInput — `forms/ClaimInput`

The signature conversion control: `linkbase.me/` prefix + input + `lg` primary button.

| Part | Spec |
|---|---|
| Wrapper | flex column, gap 12, `max-w-[560px]` |
| Form row | flex, gap 8, `flex-wrap` (button drops below on narrow widths) |
| Field | `flex: 1 1 260px`, h 60, px 18, `rounded-input` (16), `bg-surface-card`, 1.5px cream-400 border, 17px |
| Prefix | text-muted |
| Input | 600 weight, no border/outline, inherits font |
| Button | `Button` primary `lg`, `type="submit"` |
| Message | 14px, min-height 20 |

**Props:** `value`, `onChange`, `onSubmit`, `prefix` (`linkbase.me/`), `placeholder` (`yourname`), `buttonLabel` (`Claim your link`), `message`, `status`, `inverse`.

**Input sanitising:** lowercase, `[a-z0-9._]` only, max 24 chars — applied on change.

**States**

| State | Message colour | Field border |
|---|---|---|
| Idle / helper | text-muted (cream-400 when `inverse`) | 1.5px cream-400 |
| `success` | green-500 | unchanged |
| `error` | red-500 | unchanged |
| `inverse` (on ink CTA panel) | — | border removed |
| Checking / loading | **TBD** | **TBD** |

Copy examples: "linkbase.me/mara is available — nice pick.", "linkbase.me/mara is taken. Try marastudio or mara.co". Taken handles in the prototype: `admin`, `mara`.

---

### 1.4 TextField — `forms/TextField`

| Prop | Values | Default |
|---|---|---|
| `label` | string | — (renders bare field if omitted) |
| `type` | `text` · `email` · `password` · `url` | `text` |
| `prefix` | string (muted, e.g. `linkbase.me/`) | — |
| `status` | `success` · `error` | — |
| `mono` | boolean (JetBrains Mono, for URLs) | false |
| `size` | `md` 52px · `sm` 46px | `md` |

Spec: px 16, `rounded-md` (14), `bg-surface-card`, 1px cream-350 border, 16px text. Value weight 600 when `prefix` is set, else 400. Label: flex column gap 6, 14px / 500, ink-900.

**States**

| State | Border |
|---|---|
| Default | 1px cream-350 |
| `success` | 1.5px green-400 |
| `error` | 1.5px red-400 |
| Focus | **TBD** |
| Disabled | **TBD** |
| Error message text | **TBD** (no slot; use 14px red-500 below field to match ClaimInput) |

---

### 1.5 Toggle — `forms/Toggle`

44×26 switch, track radius 13, knob 20×20 white circle at `top: 3`, `left: 3 → 21`.

| State | Track |
|---|---|
| Off | cream-300 |
| On | ember-500 |
| Disabled | **TBD** |
| Focus | **TBD** |

Knob animates `left` 180ms ease-brand; track animates background 180ms.

A11y: `<button role="switch" aria-checked aria-label>`. `label` prop is required in practice (default "Toggle" is not meaningful). Note knob is literal `white`, not a token.

---

### 1.6 Chip — `forms/Chip`

Selectable pill for filters and multi-select.

| Variant | Padding | Alignment | Width |
|---|---|---|---|
| inline (default) | 11px 16px | center | auto |
| `block` | 12px 18px | left | 100% (sidebar category list) |

DM Sans 500 15px, `rounded-full`.

| State | Background | Text | Border |
|---|---|---|---|
| Default | transparent | ink-900 | 1px cream-350 |
| `selected` | ink-900 | cream-150 | 1px ink-900 |
| Hover | **TBD** | | |
| Focus | **TBD** | | |

A11y: add `aria-pressed={selected}` (single-select filter lists may instead use `role="radiogroup"` / `role="radio"`). Not in the reference code.

---

### 1.7 NavBar — `navigation/NavBar` (marketing only)

Floating pill capsule.

| Part | Spec |
|---|---|
| Header | `sticky top-4 z-10 px-6 mt-4` (sticky default on) |
| Nav | `max-w-container mx-auto`, `bg-surface-card`, hairline border, `rounded-full`, `shadow-nav`, padding 10/10/10/28, flex, gap 32 |
| Logo | `Logo size={24}` |
| Links | flex-1, gap 24, 15px / 500, `flex-wrap`. Default: Templates, Features, Pricing, Learn |
| Actions | gap 8 — `Button soft` "Log in", `Button dark` "Sign up free" |

Mobile collapse / hamburger: **TBD** (links currently wrap). Active link state: **TBD**.

Not used in the logged-in app — that uses a flat bar (see §2.4).

---

### 1.8 Banner — `navigation/Banner`

Full-width announcement strip above the nav.

Spec: `bg-surface-inverse text-on-inverse`, 14px, py 12 px 48, centred text. Optional underlined trailing link (600). Optional close: `×`, 32×32, absolute right 16, vertically centred, 18px.

States: visible · dismissed (unmounted). Persisting dismissal: **TBD**.

A11y: close button has `aria-label="Dismiss"`. Use a real `<a href>` / `<Link>` for the link.

---

### 1.9 Footer — `navigation/Footer`

| Part | Spec |
|---|---|
| Wrapper | px 24, pb 32; inner `max-w-container`, border-top 1px cream-350, pt 56, flex column gap 48 |
| Columns | grid `auto-fit minmax(min(100%,180px),1fr)`, gap 32 |
| Column | flex column gap 12; heading Bricolage 700 20px (+4px bottom margin); links 15px ink-600 |
| Bottom row | flex space-between, wrap, gap 16, 14px muted; `Logo size={20}` + tagline |

Default columns: Product · Company · Support · Legal. Tagline: "© 2026 Linkbase. Made for people who make things."

---

### 1.10 StepBars — `navigation/StepBars`

Segmented onboarding progress. Grid `repeat(total, 1fr)`, gap 6; each segment h 4, radius 2. Filled (`i < current`) = ember-500 (overridable via `accent`), unfilled = cream-300.

Props: `total` (4), `current` (1-based). Pair with a visible "Step N of 4" label.

A11y: expose as `role="progressbar" aria-valuemin=1 aria-valuemax={total} aria-valuenow={current}` — not in reference code.

---

### 1.11 Eyebrow — `marketing/Eyebrow`

JetBrains Mono, uppercase, default colour text-muted (`color="inherit"` on colour blocks).

| Size | Font | Tracking |
|---|---|---|
| `md` (default) | 13px | 0.04em |
| `sm` | 12px | 0.06em |

Numbered pattern: `01 — Analytics` (em dash).

---

### 1.12 FeatureCard — `marketing/FeatureCard`

Flat colour block, no border, no shadow. `rounded-card` (32), padding 36, flex column gap 14, min-h 300. Title pinned to bottom (`mt-auto`).

| Tone | Background | Text |
|---|---|---|
| `iris` (default) | iris-500 | ink-900 |
| `ember` | ember-500 | ink-900 |
| `ink` | ink-900 | cream-150 |

Content: Eyebrow `sm` · H3 (Bricolage 800 34px / 1 / −0.03em) · body 16px / 1.5. Use in threes: iris → ember → ink. Not interactive.

---

### 1.13 StatCard — `marketing/StatCard`

| Variant | Radius | Padding | Border | Shadow | Label | Value |
|---|---|---|---|---|---|---|
| default (KPI tile) | 14 | 20 | hairline | none | 13px muted | Bricolage 800 34px −0.03em |
| `floating` (hero chip) | 18 | 14px 18px | none | `shadow-float` | Mono 11px uppercase muted | Bricolage 800 28px −0.03em |

Background `bg-surface-card`. Gap 4 (default) / 2 (floating).

---

### 1.14 QuoteCard — `marketing/QuoteCard`

`<figure>`: `bg-surface-card`, hairline, `rounded-md` (14), padding 28, flex column gap 28.
- Portrait `rect`, ratio 4/3, `tone` (ember default · iris · ink · cream)
- `<blockquote>` 18px / 1.5 with curly quotes
- `<figcaption>` (mt-auto): name 600 + role muted (14px) left; `linkbase.me/{handle}` Mono 12px muted right

Layout: 3-up grid `auto-fit minmax(min(100%,300px),1fr)`, gap 20. Rotate tones.

---

### 1.15 TemplateCard — `marketing/TemplateCard`

Flex column gap 12: `ProfilePhone` (unframed) + meta row (space-between, px 4): name Bricolage 700 18px, category 13px muted; optional `Button dark sm` "Use" when `onUse` is set.

States: hover **TBD**. Whole-card click target: **TBD** (currently only the Use button).

---

### 1.16 CtaPanel — `marketing/CtaPanel`

Section px 24 pb 96 → inner `max-w-container`, `bg-surface-inverse text-on-inverse`, `rounded-panel` (40), padding 80/32, flex column centred, gap 28.
H2: Bricolage 800 `text-cta`, line-height .95, −0.045em, `text-wrap: balance`, max-w 900. Children slot — normally `<ClaimInput inverse />`.

---

### 1.17 Portrait — `profile/Portrait`

Stand-in for people photos (there is no photography).

| Prop | Values | Default |
|---|---|---|
| `name` | string → up to 2 initials (splits on space, `.`, `&`; strips `@`) | — |
| `tone` | `ember` · `iris` · `ink` · `cream` | `ember` |
| `bg` / `fg` | custom colours (override tone; used for profile themes) | — |
| `shape` | `circle` · `rect` | `circle` |
| `size` | px (fixed) — otherwise fills width | — |
| `ratio` | rect aspect | `1/1` |

| Tone | bg | fg |
|---|---|---|
| ember | ember-500 | ink-900 |
| iris | iris-500 | ink-900 |
| ink | ink-900 | cream-150 |
| cream | cream-200 | ink-900 |

Rendering: initials Bricolage 800, −0.04em, `40cqw` (circle) / `26cqw` (rect) using `container-type: inline-size`. Echo: rotated (45°) rounded square, 70% width, offset −22% bottom-right, fg at 12% opacity. Rect radius 14.

A11y: decorative initials — add `role="img" aria-label={name}` or `aria-hidden` if the name is visible alongside. Real image upload support: **TBD**.

---

### 1.18 ProfileLink — `profile/ProfileLink`

Themed link button on public pages. All colours come from the theme object, not tokens.

| Prop | Notes |
|---|---|
| `theme` | `{ btnBg, btnFg, btnBorder?, radius }` |
| `href` | link target |
| `size` | `lg` (default): padding 18, 16px · `sm`: 11px 10px, 12px (phone thumbnails) |

Spec: block, centred, 600, 1.5px border `btnBorder ?? btnBg`, `border-radius: theme.radius`, single line with ellipsis.

| State | Effect |
|---|---|
| Hover | `translateY(-2px)`, 180ms ease-brand |
| Focus | **TBD** |
| Visited | no change |

---

### 1.19 SocialIcons — `profile/SocialIcons`

Row of monochrome glyphs. Each is an `<a>` with CSS mask `url(https://cdn.simpleicons.org/{slug})` filled with `color` (theme fg).

Props: `networks` (default `tiktok, youtube, x, instagram`), `color` (currentColor), `size` (26), `gap` (14). In ProfilePhone: size 18, gap 10, opacity .85.

A11y: `aria-label` is currently the raw slug — use a proper name ("Instagram"). Hit target at 26px is below 44px — pad the link. Self-hosted icons instead of CDN: **TBD** (flagged substitution).

---

### 1.20 ProfilePhone — `profile/ProfilePhone`

Mini rendering of a public profile.

| Part | Spec |
|---|---|
| Screen | width 100%, `aspect-ratio: 9/17`, radius 28, bg/fg/font from theme, padding 36/18/20, flex column centred, gap 8, overflow hidden |
| Avatar | Portrait 62px (`bg=theme.avatar`, `fg=theme.btnBg`) inside a 3px `btnBg` ring |
| Name | 700 17px, −0.01em, mt 6 |
| Bio | 12px, opacity .82, line-height 1.4 |
| Links | column gap 8, mt 12 — `ProfileLink size="sm"` |
| Social | mt-auto, pt 12, opacity .85 (toggle via `social`) |
| `framed` | 10px ink-900 padding bezel, radius 38, `shadow-phone` |

Props: `theme`, `name`, `bio`, `links` (fallback to theme's sample data), `framed`, `social` (true).

Usage: template gallery (unframed), hero art and editor live preview (framed, max-w 290).

---

### 1.21 LinkRow — `editor/LinkRow`

One editable link in the dashboard list.

Layout (flex, centre, gap 14, padding 14/16, hairline, `rounded-md`, `bg-surface-card`):
1. Reorder: column of two 26×20 buttons (`▲` / `▼`), cream-200, radius 4, 11px
2. Fields (flex-1): title input (600 16px) + URL input (Mono 14px muted, placeholder "Add a URL") — both borderless
3. Click count: 13px muted, `"{n} clicks"` with locale separators
4. Toggle (`label="Show link"`)
5. Delete: `×` 32×32, muted, 18px

| State | Effect |
|---|---|
| Visible (`on`) | opacity 1 |
| Hidden (`!on`) | opacity .55 (row stays editable) |
| First / last row | up/down still rendered — disable at bounds **TBD** |
| Drag-to-reorder | **TBD** (arrows only) |
| Delete confirm / undo | **TBD** |
| Invalid URL | **TBD** |
| Focus (inline inputs) | **TBD** — reference sets `outline: 0`; must add a visible focus treatment |

A11y: arrow and delete buttons have `aria-label` ("Move up", "Move down", "Delete"). Inline inputs need `aria-label` ("Link title", "Link URL") — missing. 26×20 reorder targets are below 44px.

---

### 1.22 ShareBar — `editor/ShareBar`

Pill capsule (hairline, `rounded-full`, padding 4/4/4/14, gap 4, 14px): Mono 13px `{domain}{handle}` + Copy button (padding 7/12, `rounded-full`, cream-200, 600 13px).

| State | Label |
|---|---|
| Idle | "Copy" |
| Copied | "Copied" for 1500ms, then reverts |
| Copy failed | **TBD** |

Implementation: call `navigator.clipboard.writeText('https://' + domain + handle)` (reference only toggles the label). Announce the change with `aria-live="polite"`.

---

### 1.23 ThemeSwatch — `editor/ThemeSwatch`

Theme picker tile. Button: padding 6, radius 18, `bg-surface-card`, 2px border, flex column gap 8.
- Preview: h 96, radius 14, `theme.bg`, two 14px bars (`btnBg`, 1.5px `btnBorder`, `theme.radius`), px 18, gap 6
- Name: 600 14px

| State | Border |
|---|---|
| Default | 2px transparent |
| `selected` | 2px ember-500 |
| Hover / focus | **TBD** |

Grid: `auto-fill minmax(150px,1fr)`, gap 12. A11y: group as `role="radiogroup"`, each swatch `role="radio" aria-checked` — not in reference code.

---

### 1.24 ClickBar — `editor/ClickBar`

Analytics row. Flex column gap 6: label (500) + value (muted) at 14px, space-between; track h 6 radius 3 cream-200; fill `width: pct%` ember-500.

A11y: value is shown as text, so the bar can be `aria-hidden`. Animated fill: **TBD** (none).

---

## 2. Layout patterns

### 2.1 Page shell
- `body`: `bg-page text-strong font-sans antialiased`.
- Container: `mx-auto w-full max-w-container px-6` (1280 / 24).
- Section vertical rhythm: `py-24` (96). Hero top `pt-18` (72).
- No breakpoints are defined; layouts reflow intrinsically (see design-system §7).

### 2.2 Marketing landing (top → bottom)
1. **Banner** (optional, dismissible)
2. **NavBar** — sticky, 16px from top
3. **Hero** — grid `repeat(auto-fit, minmax(min(100%,460px),1fr))`, gap 56, `items-center`, padding 72/24/96
   - Left (flex col gap 28): Eyebrow · H1 `text-hero` balanced · lead 19px ink-700 max-w 520 · ClaimInput
   - Right: framed ProfilePhone over a rotated iris blob (`rounded-blob`), with a floating StatCard overlapping. Exact blob size/rotation/offsets: see `ui_kits/marketing/Hero.jsx`.
4. **Template gallery** — section `bg-surface-card` with hairline top/bottom; centred header (H2 + 18px ink-600 intro, max-w 600, mb 56); body is flex-wrap gap 40: category column (`flex: 1 1 200px`, Eyebrow sm + block Chips, gap 8) + grid (`flex: 999 1 480px`, `auto-fill minmax(min(100%,240px),1fr)`, gap 28) of TemplateCards
5. **Features** — grid `auto-fit minmax(min(100%,300px),1fr)`, gap 20: FeatureCard iris / ember / ink
6. **Stories** — H2 `clamp(36px,4.4vw,56px)` max-w 640, gap 48, then 3-up QuoteCards
7. **CtaPanel** with `ClaimInput inverse`
8. **Footer**

Templates page: same gallery standalone (transparent bg, H2 `clamp(44px,6vw,80px)`, padding 72/24/96).

### 2.3 Signup onboarding (4 steps)
- Full-height column, padding 32/24.
- Top bar: `max-w-[1240px]`, space-between — `Logo size={22}` + "Step N of 4" (14px muted).
- Content: `max-w-[540px]`, mt 64, flex col gap 32 → StepBars → step body (gap 20) → footer row (space-between): `Button outline` "Back" + `Button primary` "Continue" (disabled until valid; step 4 label "Open editor").

| Step | Content |
|---|---|
| 1 Choose link | Username field with availability check (success/error) |
| 2 Account | Email + Password TextFields, "or" divider (1px cream-300 lines, 13px muted), `outline` full-width "Continue with Google" |
| 3 Pick a look | ThemeSwatch grid |
| 4 Quick links | Chip multi-select |

Validation rules beyond the username sanitiser (password length, email format): **TBD** (placeholder copy says "At least 8 characters").

### 2.4 Editor dashboard
- **Top bar** (flat, not floating): flex, gap 16, padding 12/20, `bg-surface-card`, hairline bottom, wraps. `Logo size={20}` · spacer · ShareBar · primary "View page" (40px).
- **Body**: flex-wrap, stretch:
  - **Sidebar** `flex: 0 1 200px`, padding 20/12, hairline right, gap 4. Tab buttons: left-aligned, padding 10/14, `rounded-full`, 15px; active = cream-200 bg + 600; inactive transparent + 500. Tabs: Links · Appearance · Analytics.
  - **Main** `flex: 999 1 420px`, max-w 760, padding `32px clamp(20px,4vw,48px)`, gap 24. Section cards: padding 20, hairline, radius 14, `bg-surface-card`, gap 12. H2: Bricolage 800 30px −0.03em.
  - **Preview** `flex: 1 1 300px`, padding 32/24, hairline left, `bg-surface-soft`, centred column gap 12: "Live preview" 13px muted + framed ProfilePhone (max-w 290).
- Tab content: **Links** — add-link form (title + URL TextFields) and LinkRow list. **Appearance** — ThemeSwatch grid. **Analytics** — "Last 7 days": KPI StatCards (`auto-fit minmax(160px,1fr)`, gap 12) + ClickBar list.
- Empty states (no links, no analytics): **TBD**. Loading / error states: **TBD**. Mobile layout of sidebar (currently wraps above main): **TBD**.

### 2.5 Public profile page
- Fills viewport, theme bg/fg/font, padding 72/20/80, centred column.
- Content `max-w-[560px]`, gap 12: Portrait 96px in 4px `btnBg` ring · H1 700 28px −0.02em (mt 10) · bio 16px opacity .85 max-w 420 · links column (gap 12, mt 24) of `ProfileLink lg` (only `on` links) · SocialIcons.
- No Linkbase brand chrome except an optional "Made with linkbase" mark — exact placement **TBD**.
- Theme is runtime data: set colours via inline style or CSS variables on the page root, not Tailwind classes.

### 2.6 Surface rules
- Two card types only: (a) flat colour block, no border/shadow; (b) cream-50 + 1px cream-300 hairline, no shadow.
- No gradients, textures or left-border accents. Image placeholders: diagonal stripes (`repeating-linear-gradient` 45°/135°).
- Shadows only on: floating nav, floating stat, framed phone.
- Ember is reserved for conversion/selection. Iris is decorative only.

---

## 3. Content conventions
- Voice: "you / your page / your link"; rarely "we".
- Headlines: short declaratives, often ending in a period.
- Curly quotes and apostrophes (’ “ ”), en dash for ranges (7–3), em dash in numbered labels, `×` for close, `→` for CTA arrows.
- No exclamation marks in product copy.

---

## 4. Accessibility notes

### 4.1 Contrast (WCAG ratios computed from token hex values)

| Pair | Approx. ratio | Status |
|---|---|---|
| ink-900 on cream-100 | 16.2:1 | Pass |
| ink-700 (body) on cream-100 | 9.3:1 | Pass |
| ink-400 (muted) on cream-100 / cream-50 | 5.6:1 / 5.9:1 | Pass |
| ink-300 (placeholder) on cream-50 | 3.9:1 | **Fails 4.5:1** — placeholder only; never use for real text |
| ink-950 on ember-500 (primary button) | 6.4:1 | Pass |
| cream-150 on ink-900 | 16.0:1 | Pass |
| cream-400 helper on ink-900 (inverse ClaimInput) | 11.0:1 | Pass |
| green-500 / red-500 on cream-50 | 5.6:1 / 5.9:1 | Pass |
| ember-700 (link hover) on cream-100 | 4.8:1 | Pass |
| ember-500 as text on cream | 2.6:1 | **Fail** — never use ember-500 for text |
| Toggle track cream-300 vs page (off state) | 1.3:1 | **Fails 3:1 non-text** — add a border or darken the off track (**TBD**) |
| Profile themes | varies per template | Validate each template's btnFg/btnBg and fg/bg ≥ 4.5:1; Ledger link buttons rely on the 1.5px border |

### 4.2 Focus
- No focus-visible style is defined (**TBD**). Several inputs set `outline: 0`. Recommended baseline: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500`; on ember buttons use an ink-900 outline; for the ClaimInput/TextField, put the ring on the wrapper with `:focus-within`.

### 4.3 Semantics
- Use real `<button>` for actions and `<a>`/`<Link>` for navigation (reference uses `href="#"` + preventDefault — replace).
- Toggle: `role="switch"` + `aria-checked` + meaningful `aria-label` per link ("Show 'Shop the spring collection'").
- Chip groups and ThemeSwatch grids: expose selection state (`aria-pressed` or radio semantics).
- StepBars: `role="progressbar"` with value attributes; keep the "Step N of 4" text.
- Status messages (ClaimInput availability, ShareBar "Copied"): `aria-live="polite"`.
- TextField errors: link with `aria-describedby`, set `aria-invalid` on error.
- Decorative SVG/glyphs (`→`, logo mark, Portrait echo) are `aria-hidden`.
- Social links: human-readable `aria-label`s.

### 4.4 Targets
- Several hit targets are below 44×44: LinkRow reorder (26×20), delete (32×32), Banner close (32×32), SocialIcons (18–26px), Button `sm` (36px tall). Expand hit areas with padding or pseudo-elements on touch devices.

### 4.5 Motion
- Only 180ms colour/opacity/transform transitions. Respect `prefers-reduced-motion` by removing the ProfileLink lift and toggle slide (**TBD** in the system; recommended).

### 4.6 Keyboard
- LinkRow reorder must work by keyboard (arrow buttons already do). Drag-and-drop, if added, needs a keyboard alternative.
- Editor tabs: implement as `role="tablist"` with arrow-key navigation (**TBD** — reference uses plain buttons).
