# Linkbase — Design Foundations

Source of truth: `styles.css` → `tokens/*.css`. Values below are copied from those files. Anything the system doesn't define is marked **TBD**.

Stack target: Next.js + Tailwind. Tailwind class names below are derived 1:1 from the CSS token names (the system itself ships plain CSS custom properties, not a Tailwind config). Hex values are converted from the source `oklch()` — use the oklch value as canonical; hex is for tools that need it.

---

## 1. Colors

### 1.1 Cream (warm light neutrals)

| Token         | oklch                   | Hex       | Tailwind    | Used for                                          |
| ------------- | ----------------------- | --------- | ----------- | ------------------------------------------------- |
| `--cream-50`  | `oklch(0.995 0.004 80)` | `#fffdfa` | `cream-50`  | Card surface, inputs, nav pill                    |
| `--cream-100` | `oklch(0.975 0.008 80)` | `#faf6f1` | `cream-100` | Page background                                   |
| `--cream-150` | `oklch(0.97 0.008 80)`  | `#f8f5ef` | `cream-150` | Text on ink surfaces                              |
| `--cream-200` | `oklch(0.94 0.01 70)`   | `#f0eae4` | `cream-200` | Soft button, soft surfaces, track backgrounds     |
| `--cream-300` | `oklch(0.9 0.01 70)`    | `#e2ddd7` | `cream-300` | Hairline borders, toggle off, step bar off        |
| `--cream-350` | `oklch(0.88 0.01 70)`   | `#dcd6d1` | `cream-350` | Default border (outline button, chip, text field) |
| `--cream-400` | `oklch(0.85 0.01 70)`   | `#d2cdc7` | `cream-400` | Strong border (claim input), helper text on ink   |

### 1.2 Ink (warm dark neutrals)

| Token       | oklch                 | Hex       | Tailwind  | Used for                                   |
| ----------- | --------------------- | --------- | --------- | ------------------------------------------ |
| `--ink-300` | `oklch(0.6 0.02 60)`  | `#8a7e75` | `ink-300` | Placeholder text                           |
| `--ink-400` | `oklch(0.5 0.02 60)`  | `#6c6158` | `ink-400` | Muted text                                 |
| `--ink-500` | `oklch(0.45 0.02 60)` | `#5e534a` | `ink-500` | Not referenced by semantic aliases         |
| `--ink-600` | `oklch(0.4 0.02 60)`  | `#50453d` | `ink-600` | Secondary text                             |
| `--ink-700` | `oklch(0.38 0.02 60)` | `#4b4038` | `ink-700` | Body text                                  |
| `--ink-900` | `oklch(0.22 0.02 60)` | `#221811` | `ink-900` | Strong text, inverse surfaces, dark button |
| `--ink-950` | `oklch(0.2 0.02 60)`  | `#1d140d` | `ink-950` | Text on ember                              |

### 1.3 Brand accents

| Token         | oklch                 | Hex       | Tailwind    | Used for                                                                              |
| ------------- | --------------------- | --------- | ----------- | ------------------------------------------------------------------------------------- |
| `--ember-500` | `oklch(0.7 0.17 45)`  | `#f27636` | `ember-500` | **The** conversion colour: primary button, toggle on, selection ring, bars, logo mark |
| `--ember-600` | `oklch(0.65 0.17 45)` | `#e06623` | `ember-600` | Primary hover                                                                         |
| `--ember-700` | `oklch(0.55 0.17 45)` | `#bd4600` | `ember-700` | Text link hover                                                                       |
| `--iris-500`  | `oklch(0.7 0.17 265)` | `#6a99ff` | `iris-500`  | Decorative only (hero blob, feature tile, portrait tone)                              |

### 1.4 Illustration / misc

| Token           | oklch                 | Hex       | Tailwind      | Used for                |
| --------------- | --------------------- | --------- | ------------- | ----------------------- |
| `--paper-phone` | `oklch(0.97 0.03 75)` | `#fff3df` | `paper-phone` | Hero phone screen bg    |
| `--avatar-a`    | `oklch(0.86 0.03 70)` | `#decebc` | `avatar-a`    | Hero phone avatar       |
| `--avatar-b`    | `oklch(0.9 0.025 70)` | `#e9dccd` | `avatar-b`    | Hero phone avatar (alt) |

### 1.5 Status

| Token          | oklch                 | Hex       | Tailwind    | Used for       |
| -------------- | --------------------- | --------- | ----------- | -------------- |
| `--green-500`  | `oklch(0.5 0.12 150)` | `#21763c` | `green-500` | Success text   |
| `--green-400`  | `oklch(0.6 0.12 150)` | `#439458` | `green-400` | Success border |
| `--red-500`    | `oklch(0.52 0.17 28)` | `#b6322b` | `red-500`   | Error text     |
| `--red-400`    | `oklch(0.6 0.17 28)`  | `#d24d42` | `red-400`   | Error border   |
| Warning / info | —                     | **TBD**   | **TBD**     | Not defined    |

> Note: `green-*` / `red-*` collide with Tailwind's default palette names. Either override them in `@theme` (as below) or rename to `success-*` / `error-*`.

### 1.6 Semantic aliases (prefer these in components)

| Token                     | → Primitive | Hex       | Tailwind                                            |
| ------------------------- | ----------- | --------- | --------------------------------------------------- |
| `--bg-page`               | cream-100   | `#faf6f1` | `bg-page`                                           |
| `--surface-card`          | cream-50    | `#fffdfa` | `bg-surface-card`                                   |
| `--surface-soft`          | cream-200   | `#f0eae4` | `bg-surface-soft`                                   |
| `--surface-inverse`       | ink-900     | `#221811` | `bg-surface-inverse`                                |
| `--surface-accent`        | ember-500   | `#f27636` | `bg-surface-accent`                                 |
| `--surface-accent-alt`    | iris-500    | `#6a99ff` | `bg-surface-accent-alt`                             |
| `--text-strong`           | ink-900     | `#221811` | `text-strong`                                       |
| `--text-body`             | ink-700     | `#4b4038` | `text-body`                                         |
| `--text-secondary`        | ink-600     | `#50453d` | `text-secondary`                                    |
| `--text-muted`            | ink-400     | `#6c6158` | `text-muted`                                        |
| `--text-placeholder`      | ink-300     | `#8a7e75` | `text-placeholder` / `placeholder:text-placeholder` |
| `--text-on-inverse`       | cream-150   | `#f8f5ef` | `text-on-inverse`                                   |
| `--text-on-accent`        | ink-950     | `#1d140d` | `text-on-accent`                                    |
| `--link-hover`            | ember-700   | `#bd4600` | `hover:text-link-hover`                             |
| `--border-subtle`         | cream-300   | `#e2ddd7` | `border-subtle`                                     |
| `--border-default`        | cream-350   | `#dcd6d1` | `border-default`                                    |
| `--border-strong`         | cream-400   | `#d2cdc7` | `border-strong-border`                              |
| `--action-primary`        | ember-500   | `#f27636` | `bg-action-primary`                                 |
| `--action-primary-hover`  | ember-600   | `#e06623` | `hover:bg-action-primary-hover`                     |
| `--action-dark`           | ink-900     | `#221811` | `bg-action-dark`                                    |
| `--action-soft`           | cream-200   | `#f0eae4` | `bg-action-soft`                                    |
| `--status-success`        | green-500   | `#21763c` | `text-status-success`                               |
| `--status-success-border` | green-400   | `#439458` | `border-status-success-border`                      |
| `--status-error`          | red-500     | `#b6322b` | `text-status-error`                                 |
| `--status-error-border`   | red-400     | `#d24d42` | `border-status-error-border`                        |

Dark mode: **TBD** (not defined; the marketing site and app are light-only).

### 1.7 Profile template palette (data, not theme)

Public profile pages don't use the Linkbase brand. Each template is a data object (`components/profile/templates.js` → `PROFILE_TEMPLATES`). Apply these via inline style / CSS variables at runtime, **not** Tailwind classes.

| id       | Category       | bg        | fg        | btnBg     | btnFg     | radius | font            |
| -------- | -------------- | --------- | --------- | --------- | --------- | ------ | --------------- |
| kiln     | Creators       | `#f4e6d2` | `#2d1d14` | `#7a462e` | `#f9f4ee` | 6px    | Instrument Sans |
| tidepool | Travel         | `#246d85` | `#f2fafd` | `#f2fafd` | `#003444` | 999px  | Manrope         |
| halfpipe | Sports         | `#242530` | `#f0f1f9` | `#e7c952` | `#191a24` | 0px    | Manrope         |
| encore   | Music          | `#b94548` | `#fff6f6` | `#271515` | `#fff6f6` | 14px   | Geist           |
| ledger   | Small business | `#f9f8f5` | `#1c1a15` | `#f9f8f5` | `#1c1a15` | 999px  | Instrument Sans |
| hem      | Fashion        | `#c9dac5` | `#172614` | `#172614` | `#e4efe2` | 4px    | Geist           |
| rep      | Fitness        | `#f27636` | `#1e130e` | `#1e130e` | `#fbf3f0` | 12px   | DM Sans         |

Each entry also carries `btnBorder`, `avatar`, `avatar2`, `title`, `bio`, `links` (see the source file for oklch originals). Categories: `All, Creators, Fashion, Fitness, Music, Small business, Sports, Travel`.

---

## 2. Typography

### 2.1 Families

| Role      | Token            | Stack                                          | Tailwind                    | Weights loaded                 |
| --------- | ---------------- | ---------------------------------------------- | --------------------------- | ------------------------------ |
| Display   | `--font-display` | `'Bricolage Grotesque', system-ui, sans-serif` | `font-display`              | 500, 700, 800 (opsz 12–96)     |
| Body / UI | `--font-body`    | `'DM Sans', system-ui, sans-serif`             | `font-body` (set as `sans`) | 400, 500, 600, 700 (opsz 9–40) |
| Mono      | `--font-mono`    | `'JetBrains Mono', ui-monospace, monospace`    | `font-mono`                 | 400, 500                       |

Load with `next/font/google` (`Bricolage_Grotesque`, `DM_Sans`, `JetBrains_Mono`) and expose as CSS variables. Template-only fonts (Instrument Sans, Manrope, Geist) load only on profile pages that need them.

Weights: `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600`, `--weight-bold 700`, `--weight-black 800`.

### 2.2 Display scale (Bricolage, weight 800 unless noted)

| Token               | Size                     | Line height | Tracking  | Tailwind          | Use                           |
| ------------------- | ------------------------ | ----------- | --------- | ----------------- | ----------------------------- |
| `--text-hero`       | `clamp(52px, 7vw, 96px)` | 0.94        | −0.045em  | `text-hero`       | H1 hero                       |
| `--text-cta`        | `clamp(40px, 6vw, 80px)` | 0.95        | −0.045em* | `text-cta`        | CTA panel headline            |
| `--text-h2`         | `clamp(40px, 5vw, 64px)` | 1           | −0.04em   | `text-h2`         | Section headings              |
| `--text-h3`         | 34px                     | 1           | −0.03em   | `text-h3`         | Feature card title, KPI value |
| `--text-stat`       | 28px                     | TBD         | −0.03em*  | `text-stat`       | Floating stat value           |
| `--text-logo`       | 24px                     | 1           | −0.03em   | `text-logo`       | Wordmark                      |
| `--text-title`      | 20px                     | TBD         | −0.02em   | `text-title`      | Footer column heads (700)     |
| `--text-card-title` | 18px                     | TBD         | TBD       | `text-card-title` | Template card name (700)      |

\* Used in component code but no dedicated tracking token.

Variants used ad hoc in UI kits (not tokenised): Templates page H2 `clamp(44px,6vw,80px)`; Stories H2 `clamp(36px,4.4vw,56px)`; editor H2 30px / −0.03em.

### 2.3 Body scale (DM Sans)

| Token          | Size | Tailwind     | Use                         |
| -------------- | ---- | ------------ | --------------------------- |
| `--text-lead`  | 19px | `text-lead`  | Hero paragraph              |
| `--text-lg`    | 18px | `text-lg`    | Section intro, quote        |
| `--text-input` | 17px | `text-input` | Claim input, lg button      |
| `--text-md`    | 16px | `text-md`    | Default body, text fields   |
| `--text-nav`   | 15px | `text-nav`   | Nav links, md button, chips |
| `--text-sm`    | 14px | `text-sm`    | Labels, helper text, banner |
| `--text-xs`    | 13px | `text-xs`    | Meta, sm button             |
| `--text-2xs`   | 12px | `text-2xs`   | Small meta                  |

Line heights: `--leading-body 1.5` (`leading-body`), `--leading-tight 1.4` (`leading-tight`).

### 2.4 Mono labels (JetBrains Mono, uppercase)

| Token               | Size | Tracking | Tailwind                              | Use                            |
| ------------------- | ---- | -------- | ------------------------------------- | ------------------------------ |
| `--text-eyebrow`    | 13px | 0.04em   | `text-eyebrow tracking-eyebrow`       | Section kicker                 |
| `--text-eyebrow-sm` | 12px | 0.06em   | `text-eyebrow-sm tracking-eyebrow-sm` | Card kickers, "01 — Analytics" |
| `--text-micro`      | 11px | TBD      | `text-micro`                          | Floating stat label            |

Mono is also used (not uppercase) for URLs/handles: 12–14px.

---

## 3. Spacing

Literal px scale. Tailwind's default 4px scale doesn't cover every step (e.g. 14, 18, 22), so define named keys equal to the px value.

| Token        | Value | Tailwind key             |
| ------------ | ----- | ------------------------ |
| `--space-2`  | 2px   | `0.5` (default) or `2px` |
| `--space-4`  | 4px   | `1`                      |
| `--space-6`  | 6px   | `1.5`                    |
| `--space-8`  | 8px   | `2`                      |
| `--space-10` | 10px  | `2.5`                    |
| `--space-12` | 12px  | `3`                      |
| `--space-14` | 14px  | `3.5`                    |
| `--space-16` | 16px  | `4`                      |
| `--space-18` | 18px  | `4.5` (custom)           |
| `--space-20` | 20px  | `5`                      |
| `--space-22` | 22px  | `5.5` (custom)           |
| `--space-24` | 24px  | `6`                      |
| `--space-28` | 28px  | `7`                      |
| `--space-32` | 32px  | `8`                      |
| `--space-36` | 36px  | `9`                      |
| `--space-40` | 40px  | `10`                     |
| `--space-48` | 48px  | `12`                     |
| `--space-56` | 56px  | `14`                     |
| `--space-72` | 72px  | `18` (custom)            |
| `--space-80` | 80px  | `20`                     |
| `--space-96` | 96px  | `24`                     |

With Tailwind v4's `--spacing: 4px` base, every value above is reachable as `p-{px/4}` (e.g. `p-4.5` = 18px).

### Layout tokens

| Token             | Value  | Tailwind          |
| ----------------- | ------ | ----------------- |
| `--container-max` | 1280px | `max-w-container` |
| `--gutter`        | 24px   | `px-6`            |
| `--section-y`     | 96px   | `py-24`           |
| `--control-h-lg`  | 60px   | `h-15`            |
| `--control-h-md`  | 52px   | `h-13`            |
| `--control-h-sm`  | 46px   | `h-11.5`          |

Note: Button `md` is 48px and `sm` 36px in code; `--control-h-*` is used by text fields/claim input. Keep both.

---

## 4. Radius

| Token             | Value | Tailwind         | Use                                                             |
| ----------------- | ----- | ---------------- | --------------------------------------------------------------- |
| `--radius-xs`     | 4px   | `rounded-xs`     | Reorder arrow buttons                                           |
| `--radius-sm`     | 6px   | `rounded-sm`     | TBD (defined, no brand use)                                     |
| `--radius-md`     | 14px  | `rounded-md`     | Text fields, link rows, KPI tiles, quote cards, portrait rect   |
| `--radius-input`  | 16px  | `rounded-input`  | Claim input                                                     |
| `--radius-stat`   | 18px  | `rounded-stat`   | Floating stat chip, theme swatch                                |
| `--radius-screen` | 28px  | `rounded-screen` | Phone screen                                                    |
| `--radius-card`   | 32px  | `rounded-card`   | Feature cards                                                   |
| `--radius-panel`  | 40px  | `rounded-panel`  | CTA panel                                                       |
| `--radius-phone`  | 44px  | `rounded-phone`  | Phone bezel (code uses 38px on framed ProfilePhone — reconcile) |
| `--radius-blob`   | 48px  | `rounded-blob`   | Hero iris blob                                                  |
| `--radius-pill`   | 999px | `rounded-full`   | All buttons, chips, nav, share bar                              |

These override Tailwind's default `rounded-sm/md` values — intentional.

---

## 5. Borders

| Token               | Value                              | Tailwind                                    |
| ------------------- | ---------------------------------- | ------------------------------------------- |
| `--border-hairline` | `1px solid var(--border-subtle)`   | `border border-subtle`                      |
| `--border-input`    | `1.5px solid var(--border-strong)` | `border-[1.5px] border-strong-border`       |
| `--phone-bezel`     | `8px solid var(--ink-900)`         | `border-8 border-ink-900`                   |
| Validation          | `1.5px solid` status-*-border      | `border-[1.5px] border-status-error-border` |

---

## 6. Shadows

Only three. Always warm, soft, negative spread.

| Token            | Value                                           | Tailwind       | Use                        |
| ---------------- | ----------------------------------------------- | -------------- | -------------------------- |
| `--shadow-nav`   | `0 8px 30px -12px oklch(0.3 0.03 60 / 0.18)`    | `shadow-nav`   | Floating nav pill          |
| `--shadow-float` | `0 12px 30px -10px oklch(0.3 0.03 60 / 0.3)`    | `shadow-float` | Floating stat chip         |
| `--shadow-phone` | `0 30px 60px -20px oklch(0.25 0.05 265 / 0.45)` | `shadow-phone` | Framed phone (iris-tinted) |

Hex equivalents of shadow colour: nav/float `#392a1e` at 18% / 30%; phone `#16213a` at 45%. Cards, buttons and inputs have **no** shadow. Elevation scale beyond these: **TBD**.

---

## 7. Breakpoints

**TBD — the system defines no breakpoints and no `@media` queries.** All layouts are intrinsic (flex-wrap and `auto-fit/auto-fill minmax()` grids) and type is fluid via `clamp(…, vw, …)`.

Effective reflow thresholds from the existing layouts (reference only, not breakpoints):

| Layout                 | Rule                                                    | Collapses below approx. |
| ---------------------- | ------------------------------------------------------- | ----------------------- |
| Hero 2-col             | `repeat(auto-fit, minmax(min(100%,460px),1fr))`, gap 56 | ~976px container        |
| Feature trio / Stories | `minmax(min(100%,300px),1fr)`, gap 20                   | 3-up ≥ ~940px           |
| Template grid          | `auto-fill minmax(min(100%,240px),1fr)`, gap 28         | —                       |
| Theme swatches         | `auto-fill minmax(150px,1fr)`, gap 12                   | —                       |
| KPI tiles              | `auto-fit minmax(160px,1fr)`, gap 12                    | —                       |
| Footer columns         | `auto-fit minmax(min(100%,180px),1fr)`, gap 32          | —                       |

Use Tailwind's default `sm/md/lg/xl` only if a layout genuinely needs a query; prefer the intrinsic patterns above.

---

## 8. Motion

| Token        | Value                      | Tailwind       | Use                                     |
| ------------ | -------------------------- | -------------- | --------------------------------------- |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` | `ease-brand`   | All transitions                         |
| `--dur-base` | 180ms                      | `duration-180` | Colour, opacity, transform, toggle knob |
| `--dur-fast` | 120ms                      | `duration-120` | Defined; no current use                 |

Rules:

- Transition `background-color`, `opacity`, `transform` only.
- Primary hover → ember-600. Other buttons → `opacity: .85`. Links → ember-700. Profile links → `translateY(-2px)`.
- No press shrink, no bounce, no page transitions.
- ShareBar "Copied" state holds 1500ms.
- `prefers-reduced-motion` handling: **TBD** (recommend disabling the translate on ProfileLink).

---

## 9. Opacity

| Use                                 | Value     |
| ----------------------------------- | --------- |
| Disabled                            | 0.4       |
| Non-primary button hover            | 0.85      |
| Hidden link row (editor)            | 0.55      |
| Profile bio / social row over theme | 0.82–0.85 |
| Portrait logo echo                  | 0.12      |

---

## 10. Tailwind setup

### Tailwind v4 (`app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-cream-50: oklch(0.995 0.004 80);
  --color-cream-100: oklch(0.975 0.008 80);
  --color-cream-150: oklch(0.97 0.008 80);
  --color-cream-200: oklch(0.94 0.01 70);
  --color-cream-300: oklch(0.9 0.01 70);
  --color-cream-350: oklch(0.88 0.01 70);
  --color-cream-400: oklch(0.85 0.01 70);
  --color-ink-300: oklch(0.6 0.02 60);
  --color-ink-400: oklch(0.5 0.02 60);
  --color-ink-500: oklch(0.45 0.02 60);
  --color-ink-600: oklch(0.4 0.02 60);
  --color-ink-700: oklch(0.38 0.02 60);
  --color-ink-900: oklch(0.22 0.02 60);
  --color-ink-950: oklch(0.2 0.02 60);
  --color-ember-500: oklch(0.7 0.17 45);
  --color-ember-600: oklch(0.65 0.17 45);
  --color-ember-700: oklch(0.55 0.17 45);
  --color-iris-500: oklch(0.7 0.17 265);
  --color-paper-phone: oklch(0.97 0.03 75);
  --color-avatar-a: oklch(0.86 0.03 70);
  --color-avatar-b: oklch(0.9 0.025 70);
  --color-green-400: oklch(0.6 0.12 150);
  --color-green-500: oklch(0.5 0.12 150);
  --color-red-400: oklch(0.6 0.17 28);
  --color-red-500: oklch(0.52 0.17 28);

  /* semantic */
  --color-page: var(--color-cream-100);
  --color-surface-card: var(--color-cream-50);
  --color-surface-soft: var(--color-cream-200);
  --color-surface-inverse: var(--color-ink-900);
  --color-surface-accent: var(--color-ember-500);
  --color-surface-accent-alt: var(--color-iris-500);
  --color-strong: var(--color-ink-900);
  --color-body: var(--color-ink-700);
  --color-secondary: var(--color-ink-600);
  --color-muted: var(--color-ink-400);
  --color-placeholder: var(--color-ink-300);
  --color-on-inverse: var(--color-cream-150);
  --color-on-accent: var(--color-ink-950);
  --color-link-hover: var(--color-ember-700);
  --color-subtle: var(--color-cream-300);
  --color-default: var(--color-cream-350);
  --color-strong-border: var(--color-cream-400);
  --color-action-primary: var(--color-ember-500);
  --color-action-primary-hover: var(--color-ember-600);
  --color-action-dark: var(--color-ink-900);
  --color-action-soft: var(--color-cream-200);
  --color-status-success: var(--color-green-500);
  --color-status-success-border: var(--color-green-400);
  --color-status-error: var(--color-red-500);
  --color-status-error-border: var(--color-red-400);

  --font-display: var(--font-bricolage), system-ui, sans-serif;
  --font-sans: var(--font-dm-sans), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;

  --text-hero: clamp(52px, 7vw, 96px);
  --text-hero--line-height: 0.94;
  --text-hero--letter-spacing: -0.045em;
  --text-cta: clamp(40px, 6vw, 80px);
  --text-cta--line-height: 0.95;
  --text-cta--letter-spacing: -0.045em;
  --text-h2: clamp(40px, 5vw, 64px);
  --text-h2--line-height: 1;
  --text-h2--letter-spacing: -0.04em;
  --text-h3: 34px;
  --text-h3--line-height: 1;
  --text-h3--letter-spacing: -0.03em;
  --text-stat: 28px;
  --text-logo: 24px;
  --text-title: 20px;
  --text-card-title: 18px;
  --text-lead: 19px;
  --text-lg: 18px;
  --text-input: 17px;
  --text-md: 16px;
  --text-nav: 15px;
  --text-sm: 14px;
  --text-xs: 13px;
  --text-2xs: 12px;
  --text-eyebrow: 13px;
  --text-eyebrow--letter-spacing: 0.04em;
  --text-eyebrow-sm: 12px;
  --text-eyebrow-sm--letter-spacing: 0.06em;
  --text-micro: 11px;
  --leading-body: 1.5;
  --leading-tight: 1.4;

  --spacing: 4px;
  --container-container: 1280px;

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 14px;
  --radius-input: 16px;
  --radius-stat: 18px;
  --radius-screen: 28px;
  --radius-card: 32px;
  --radius-panel: 40px;
  --radius-phone: 44px;
  --radius-blob: 48px;

  --shadow-nav: 0 8px 30px -12px oklch(0.3 0.03 60 / 0.18);
  --shadow-float: 0 12px 30px -10px oklch(0.3 0.03 60 / 0.3);
  --shadow-phone: 0 30px 60px -20px oklch(0.25 0.05 265 / 0.45);

  --ease-brand: cubic-bezier(0.2, 0.7, 0.2, 1);
}

@layer base {
  body {
    @apply bg-page text-strong font-sans antialiased;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  a:hover {
    color: var(--color-link-hover);
  }
  input::placeholder {
    color: var(--color-placeholder);
  }
}
```

Usage: `bg-surface-card`, `text-muted`, `border-subtle`, `bg-action-primary hover:bg-action-primary-hover`, `duration-180 ease-brand`, `max-w-container`.

### Fonts (`app/layout.tsx`)

```tsx
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-bricolage",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});
// <html className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable}`}>
```

---

## 11. Assets

| File                   | Use                         |
| ---------------------- | --------------------------- |
| `assets/logo.svg`      | Full lockup                 |
| `assets/logo-mark.svg` | Mark only (favicon, avatar) |

Mark: ember rounded diamond with a cream-50 centre dot (ink-900 dot on dark surfaces). Wordmark: lowercase "linkbase", Bricolage 800, −0.03em.

Icons: no icon set defined. Unicode glyphs only (`×`, `▲ ▼`, `→`). Social glyphs via Simple Icons CDN (flagged substitution). UI icon set: **TBD** (readme suggests Lucide, 1.75px stroke, if needed).
