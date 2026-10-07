---
paths:
  - "apps/web/src/**/*.tsx"
  - "apps/web/src/**/*.css"
---

# Xtrakto — Design System

Visual and UI guide for Xtrakto, based on **version 7** of the design canvas (layout of v4 with the visual style of v6).

The look is calm, light and clear: a cool grey-blue ground, translucent white cards with soft shadows, very rounded shapes, thin line icons, and **color that always means something**.

---

## 1. Principles

1. **Color is meaning.** Green is income, orange is real spending, blue is money that only moved. A color is never used for decoration if it already means something.
2. **Explain every number.** Every figure comes with one line saying what it is ("El 42% de lo que salió…"). No number stands alone.
3. **Calm over dense.** Generous spacing, few borders, soft shadows. Separation comes from surfaces and space, not lines.
4. **Actions say what they do.** "Ver en qué gastaste", not "Ver detalle". "Subir extracto", not "Enviar".
5. **Never rely on color alone.** Every colored element also has a label, a sign (+ / −) or a legend.

---

## 2. Brand

| Element    | Spec                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Wordmark   | `XTRAKTO` — Outfit 500, 24px, uppercase, letter-spacing `0.34em`                                    |
| Descriptor | `Extractos` — Outfit 300, 21px, color `--text-secondary`, baseline-aligned, 12px after the wordmark |
| Tagline    | "Cuentas claras, mente tranquila" — Manrope 400, 14px, `--text-muted`                               |
| Domain     | xtrakto.site                                                                                        |

### Signature elements

- **The statement object:** a statement seen from above, used as the brand illustration (account card, empty states, onboarding). A rounded light body (radius 26–28) with a dark glass panel containing light text lines, **one highlighted row in blue**, and an **orange bar** at the bottom.
  - Body: gradient `#FFFFFF → #D5DDE8` (top-left to bottom-right), stroke `#C8D2DE`.
  - Glass panel: gradient `#2D3846 → #0F151D` (top to bottom), radius 18.
  - Lines: white at 18–28% opacity, 4px tall, radius 2. Highlighted row: `#4C8DF6`, 14px tall, radius 7.
  - Bottom bar: `#EA6B2D`, 5px tall.
- **Balance silhouette:** the user's real balance curve drawn as a faint mountain range at the bottom of the page. Fill `#C9D6E6` at 40% opacity, no stroke (or a 1.2px `#B4C5DA` stroke at 80%).
- **Assistant mark:** a circular button with an open-ring arrow icon in blue, on a radial gradient `#FFFFFF → #DCE8FB`, shadow `--shadow-assistant`. It represents "Pregúntale a tu extracto" everywhere.

---

## 3. Color

### 3.1 Background and surfaces

| Token             | Value                                                            | Use                                           |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `--bg`            | `linear-gradient(180deg, #EEF2F7 0%, #E9EEF4 55%, #E2E8F0 100%)` | Page background                               |
| `--bg-top`        | `#EEF2F7`                                                        | Solid fallback for the background             |
| `--surface`       | `#FFFFFF`                                                        | Bubbles, tooltips, inputs, status pill        |
| `--surface-card`  | `rgba(255, 255, 255, 0.88)`                                      | Cards and tiles                               |
| `--surface-panel` | `rgba(255, 255, 255, 0.60)`                                      | Large panels (account, chat)                  |
| `--surface-muted` | `#F1F4F8`                                                        | Icon chips, inactive chips, secondary buttons |
| `--divider`       | `#EDF0F4`                                                        | Dividers between list rows only               |
| `--chart-grid`    | `#E6EAF0`                                                        | Chart gridlines                               |
| `--chart-axis`    | `#D6DCE4`                                                        | Chart baseline                                |
| `--ring-track`    | `#E3E8EF`                                                        | Empty part of progress rings and bars         |
| `--silhouette`    | `#C9D6E6` at 40%                                                 | Balance silhouette                            |

### 3.2 Text

| Token              | Value     | Use                                                        |
| ------------------ | --------- | ---------------------------------------------------------- |
| `--text`           | `#1C2430` | Titles, amounts, primary text                              |
| `--text-secondary` | `#3A4452` | Body text, explanations, descriptor                        |
| `--text-muted`     | `#5F6B7A` | Captions, subtitles, axis labels, raw bank descriptions    |
| `--text-faint`     | `#7A8597` | Only for text of 18px or more, or non-essential decoration |

### 3.3 Primary (interactive)

| Token              | Value     | Use                                                      |
| ------------------ | --------- | -------------------------------------------------------- |
| `--primary`        | `#2563EB` | Primary buttons, links, focus ring, active text on white |
| `--primary-strong` | `#1D4ED8` | Hover; **text on `--primary-soft`**                      |
| `--primary-soft`   | `#E3EDFE` | Active chips and segmented options                       |
| `--primary-soft-2` | `#E8F0FE` | Active item in the navigation dock                       |

### 3.4 Kind colors (the core of the system)

Every amount belongs to one of three kinds. Each kind has four tones:

| Kind                           | Graphic (lines, rings, dots) | Text on white | Soft background | Text on soft background |
| ------------------------------ | ---------------------------- | ------------- | --------------- | ----------------------- |
| **Income** (`income`)          | `#34B873`                    | `#15803D`     | `#E3F6EC`       | `#166534`               |
| **Real spending** (`spending`) | `#EA6B2D`                    | `#C2410C`     | `#FDEEE4`       | `#9A3412`               |
| **Moved** (`moved`)            | `#4C8DF6`                    | `#2563EB`     | `#E3EDFE`       | `#1D4ED8`               |

Extras:

- Spending gradient for bars: `linear-gradient(90deg, #F59E5B, #EA6B2D)`.
- "Needs attention" surface (e.g. the 4x1000 tile): `#FFF6EF`, with an `#EA6B2D` dot of 9px.

**Rules**

- Kind colors are used **only** for kinds. Don't use orange or green for anything else.
- Blue is both the interactive color and the "moved" kind. Inside data, blue is always accompanied by the legend or a label, so it is never ambiguous.
- Signs: income `+$35.421.381`, outflows `−$1.472.800` (use the real minus sign `−`, U+2212).

### 3.5 Status

| Token                | Value     | Use                                                                |
| -------------------- | --------- | ------------------------------------------------------------------ |
| `--status-ok`        | `#34B873` | "Saldo verificado" dot, with a 4px halo `rgba(52, 184, 115, 0.18)` |
| `--status-attention` | `#EA6B2D` | Alert dot on tiles and icons                                       |

### 3.6 Verified contrast (WCAG AA)

| Text / background                                      | Ratio  | Result                                             |
| ------------------------------------------------------ | ------ | -------------------------------------------------- |
| `--text` on white                                      | 15.6:1 | ✅                                                 |
| `--text-secondary` on white                            | 9.9:1  | ✅                                                 |
| `--text-muted` on white                                | 5.4:1  | ✅                                                 |
| `--text-muted` on `#EEF2F7`                            | 4.8:1  | ✅                                                 |
| `--text-muted` on `#E2E8F0` (bottom of the background) | 4.4:1  | ⚠️ keep muted text on cards or the top of the page |
| `--text-faint` on white                                | 3.7:1  | ❌ for small text: use `--text-muted`              |
| `--primary` on white / white on `--primary`            | 5.2:1  | ✅                                                 |
| `--primary` on `--primary-soft`                        | 4.4:1  | ❌ for small text: use `--primary-strong` (5.7:1)  |
| Income text `#15803D` on white                         | 5.0:1  | ✅                                                 |
| Income `#15803D` on its soft background                | 4.5:1  | ⚠️ use `#166534` (6.3:1)                           |
| Spending text `#C2410C` on white                       | 5.2:1  | ✅                                                 |
| Spending `#9A3412` on its soft background              | 6.5:1  | ✅                                                 |

**Graphic colors** (`#34B873`, `#EA6B2D`, `#4C8DF6`) are not for text. The green one (2.6:1 on white) is below 3:1, so a green ring or line must always have its value printed next to it or inside it.

> **Corrections relative to the v7 mockup:** raw bank descriptions move from `#7A8597` to `--text-muted`; the text of active chips moves from `#2563EB` to `#1D4ED8`; text on the soft green background uses `#166534`.

---

## 4. Typography

| Role                       | Family                           | Fallback                            |
| -------------------------- | -------------------------------- | ----------------------------------- |
| Display, amounts, wordmark | **Outfit** (300, 400, 500, 600)  | `system-ui, sans-serif`             |
| UI and body                | **Manrope** (400, 500, 600, 700) | `"Segoe UI", system-ui, sans-serif` |

Both come from Google Fonts. In Next.js, load them with `next/font/google` and expose them as CSS variables (`--font-display`, `--font-body`).

### Type scale

| Style                           | Family  | Weight           | Size / line height | Notes                      |
| ------------------------------- | ------- | ---------------- | ------------------ | -------------------------- |
| Page title (H1)                 | Outfit  | 500              | 34 / 1.15          | letter-spacing `-0.01em`   |
| Amount XL (stat cards, balance) | Outfit  | 500              | 34 / 1.1           | letter-spacing `-0.01em`   |
| Amount L (tiles)                | Outfit  | 500              | 24 / 1.2           |                            |
| Amount M (chat answer)          | Outfit  | 500              | 22 / 1.2           |                            |
| Amount S (list rows)            | Outfit  | 500              | 16 / 1.3           | colored by kind            |
| Section title (H2)              | Manrope | 700              | 18 / 1.3           |                            |
| Card title                      | Manrope | 700              | 15–16 / 1.35       |                            |
| Body                            | Manrope | 500              | 15 / 1.5           |                            |
| Body small                      | Manrope | 400–500          | 14 / 1.5           | subtitles, legend          |
| Caption                         | Manrope | 400              | 13 / 1.5           | explanations in cards      |
| Meta                            | Manrope | 400              | 12 / 1.45          | axis labels, raw bank text |
| Button / chip                   | Manrope | 600–700          | 13–15              |                            |
| Navigation label                | Manrope | 600 (700 active) | 14                 |                            |

- Amounts in columns and tables: `font-variant-numeric: tabular-nums`.
- Titles: `text-wrap: balance`.
- Raw bank descriptions are shown as the bank prints them (uppercase), with letter-spacing `0.02em`.

### Number and date formats (es-CO)

| Case              | Format                       | Example                     |
| ----------------- | ---------------------------- | --------------------------- |
| Exact amount      | Dots as thousands separators | `$8.119.555`                |
| Compact millions  | One decimal with a comma     | `$51,3M`                    |
| Compact thousands | "mil"                        | `$392 mil`                  |
| Income / outflow  | Sign always                  | `+$35.421.381`, `−$643.000` |
| Percentage        | No decimals                  | `42%`                       |
| Dates in text     | Day and month in words       | `4 de agosto`               |
| Dates on axes     | Short                        | `31 jul`                    |

Use compact amounts in cards and exact amounts in lists and detail views.

---

## 5. Shape

### Radius

| Token             | Value   | Use                                                                 |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `--radius-pill`   | `999px` | Buttons, chips, segmented control, inputs                           |
| `--radius-xl`     | `30px`  | Navigation dock                                                     |
| `--radius-lg`     | `26px`  | Large panels and cards (chart, account, chat, translated statement) |
| `--radius-md`     | `22px`  | Stat cards, tiles, navigation items                                 |
| `--radius-sm`     | `16px`  | Tooltips, status pill                                               |
| `--radius-bubble` | `18px`  | Chat bubbles; the corner nearest the speaker is `4px`               |
| `--radius-xs`     | `2–7px` | Small bars and lines inside illustrations                           |
| Circle            | `50%`   | Icon chips, icon buttons, avatars, status dots                      |

### Circular sizes

| Size | Use                                                                 |
| ---- | ------------------------------------------------------------------- |
| 38px | Icon chip in a stat card header                                     |
| 44px | Icon buttons, avatar, assistant mark, icon chips in lists and tiles |
| 52px | Large icon chips (toggle groups)                                    |
| 58px | Progress ring in stat cards                                         |

**No borders on cards.** Cards are separated by their translucent surface and shadow. Lines appear only as dividers inside lists.

---

## 6. Elevation

| Token                | Value                                 | Use                                          |
| -------------------- | ------------------------------------- | -------------------------------------------- |
| `--shadow-card`      | `0 8px 22px rgba(80, 98, 125, 0.08)`  | Cards and tiles                              |
| `--shadow-panel`     | `0 18px 44px rgba(80, 98, 125, 0.12)` | Large translucent panels                     |
| `--shadow-float`     | `0 16px 40px rgba(80, 98, 125, 0.18)` | Navigation dock                              |
| `--shadow-pop`       | `0 10px 26px rgba(80, 98, 125, 0.18)` | Tooltips, popovers                           |
| `--shadow-chip`      | `0 6px 16px rgba(80, 98, 125, 0.12)`  | Icon buttons, white pills, segmented control |
| `--shadow-primary`   | `0 10px 24px rgba(37, 99, 235, 0.28)` | Primary button                               |
| `--shadow-assistant` | `0 6px 18px rgba(37, 99, 235, 0.18)`  | Assistant mark                               |

Shadows always use the cool slate tint `rgb(80, 98, 125)`, never pure black.

---

## 7. Spacing and layout

### Spacing scale (base 2px, most values multiples of 4)

`4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 28`

| Use                                          | Value                         |
| -------------------------------------------- | ----------------------------- |
| Page side padding                            | 28px (16px on phones)         |
| Page top padding                             | 30px                          |
| Gap between page sections                    | 26px                          |
| Gap between columns and between cards        | 22px (16px inside card grids) |
| Card padding                                 | 20px (24px on large cards)    |
| Gap inside a card                            | 12–16px                       |
| Gap between a section title and its subtitle | 2px                           |
| Gap between a section header and its content | 14px                          |

### Page structure

```
Header ........ wordmark · greeting with assistant mark · privacy · notifications · avatar
Title row ..... page title + color legend        |  period selector + "Subir extracto"
Row 1 ......... Tu trimestre de un vistazo (2)   |  Tu cuenta (1)
Row 2 ......... Saldo y gasto real (2)           |  Dónde se fue más (1)
Row 3 ......... Tu extracto, traducido (2)       |  Pregúntale a tu extracto (1)
Dock .......... sticky at the bottom, centered
```

- Max content width: **1360px**, centered.
- Each row is a wrapping flex row: main column `flex: 2 1 600px`, side column `flex: 1 1 340px`, both with `min-width: 0`.
- Stat cards: `grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))`.
- On phones every row stacks into one column; the dock becomes a bottom tab bar (5 items maximum, the rest under "Más").

---

## 8. Iconography

- **Style:** line icons on a 24×24 grid, round caps and joins, no fills. Matches **Lucide** (`lucide-react`).
- **Stroke width:** 1.7 for neutral icons, 1.9 for colored icons inside chips, 2–2.2 on buttons.
- **Sizes:** 19–20px inside chips, 22px in navigation, 18px inside buttons.
- **Color:** neutral icons `#2A3340` (or `--text`); colored icons use the kind's **text** tone (`#15803D`, `#C2410C`, `#2563EB`).
- **Never emoji.**

### Concept → icon (Lucide names)

| Concept                | Icon                               |
| ---------------------- | ---------------------------------- |
| Income                 | `download` (arrow into tray)       |
| Real spending          | `shopping-cart`                    |
| Moved                  | `arrow-left-right`                 |
| Investment             | `trending-up`                      |
| Loan / bank            | `landmark`                         |
| Credit card            | `credit-card`                      |
| Cash                   | `banknote`                         |
| Nequi / digital wallet | `smartphone`                       |
| 4x1000 / fees          | `file-text`                        |
| Recurring payments     | `calendar`                         |
| Privacy                | `shield-check`                     |
| Upload                 | `upload`                           |
| Ask / chat             | `message-square`                   |
| Summary                | `layout-grid`                      |
| Transactions           | `list`                             |
| Categories             | `chart-pie`                        |
| Notifications          | `bell`                             |
| Profile                | `user`                             |
| Assistant              | Custom open-ring arrow (see Brand) |

---

## 9. Components

### Header

Wordmark block on the left, greeting with the assistant mark in the center, utilities on the right ("Tus datos son privados" with `shield-check`, notifications icon button, avatar). Wraps on small screens.

### Page title row

- H1 with the account name ("Resumen de tu cuenta de ahorros").
- **Color legend** right below: three dots of 10px with a bold label and a plain-language meaning ("**Gasto real:** lo que de verdad gastaste"). It appears on every screen that shows kinds.
- On the right: period selector and primary button.

### Buttons

| Variant     | Spec                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Primary     | Pill, `--primary` background, white Manrope 700 15px, min-height 50px, padding 0 22px, `--shadow-primary`, icon 18px on the left |
| Secondary   | Pill, `--surface` background, `--text` Manrope 600, `--shadow-chip`                                                              |
| Icon button | 44px circle, `rgba(255,255,255,0.8)`, `--shadow-chip`, icon 19px; always with `aria-label`                                       |
| Link action | Manrope 700 14px, `--primary`, no underline; underline on hover                                                                  |

### Segmented control (period)

Pill container `rgba(255,255,255,0.8)` with 5px padding and `--shadow-chip`. Options: pill, min-height 40px, padding 0 16px, Manrope 600 14px `--text-muted`. Active: `--primary-soft` background, Manrope 700, `--primary-strong`.

### Filter chips

Pill, min-height 38px, padding 0 14px, Manrope 13px. Inactive: `--surface-muted`, `--text-secondary`, 600. Active: `--primary-soft`, `--primary-strong`, 700, `aria-pressed="true"`.

### Stat card

- `--surface-card`, `--radius-md`, padding 20, `--shadow-card`, gap 12.
- Header: icon chip (38px, kind soft background, kind-colored icon) + label (Manrope 700 15px) on the left; **progress ring** on the right.
- Ring: 58px, radius 26, stroke 6, track `--ring-track`, progress in the kind's graphic color, round caps, starting at 12 o'clock; percentage in the center (Outfit 500 14px).
- Amount: Amount XL.
- Explanation: Caption, `--text-muted`, one sentence.
- Action link that names the destination ("Ver en qué gastaste").

### Account card

- `--surface-panel`, `--radius-lg`, padding 22, `--shadow-panel`.
- Left: label "Saldo al 30 de septiembre", balance (Amount XL), account name, status pill.
- Right: statement object illustration, about 112×160px.

### Status pill

`--surface`, `--radius-sm`, padding 10px 14px, `--shadow-chip`. Status dot (10px with halo) + title (Manrope 700 14px) + detail (12px muted). Example: "Saldo verificado · 379 movimientos cuadran".

### Chart card

- `--surface-card`, `--radius-lg`, padding 24.
- Title + one-line reading guide ("Si la línea naranja sube rápido, estás gastando rápido.").
- Legend as line swatches (18×3px): solid blue for balance, dashed orange for cumulative spending.
- Lines: balance `#4C8DF6` 2.6px solid with an area fill from 22% to 0% opacity; cumulative real spending `#EA6B2D` 2.4px dashed `7 6`.
- Grid `--chart-grid`, baseline `--chart-axis`; Y labels on the left (Meta style, right-aligned); 4 X labels.
- Highlighted event: white circle r=7 with a 3px `--primary` stroke, dashed vertical guide, and a tooltip (`--surface`, `--radius-sm`, `--shadow-pop`) explaining the event in plain language.

### Insight tile

- `--surface-card`, `--radius-md`, padding 16, gap 8.
- Icon chip 44px `--surface-muted`; title (Manrope 700 14px); Amount L; note (12px muted).
- **Attention variant:** `#FFF6EF` background, white icon chip, 9px orange dot on the chip, and an explicit verb in the title or note ("Revisa si tu cuenta es exenta").

### Transaction row ("Tu extracto, traducido")

- Divider `--divider` on top, padding 14px 0, wraps on small screens.
- Icon chip 44px with the kind's soft background and kind icon.
- Plain-language title (Manrope 700 15px) and, below it, the raw bank text (12px, `--text-muted`, as printed).
- Explanation (13px, `--text-secondary`).
- Amount (Amount S) in the kind's text color, with its sign, right-aligned in a 128px column.

### Chat ("Pregúntale a tu extracto")

- Panel: `--surface-panel`, `--radius-lg`, `--shadow-panel`.
- Header: assistant mark + title + one line on what the answer includes.
- User bubble: `--primary` background, white Manrope 600 14px, radius `18 18 4 18`, aligned right.
- Answer bubble: `--surface`, radius `18 18 18 4`, `--shadow-chip`; the key figure in Outfit 22px, then the explanation and a link to the transactions used.
- Suggestion chips: white pills with `--shadow-chip`.
- Input: white pill with `--shadow-chip`, transparent input (min-height 44px) and a primary pill button "Preguntar". The input always has a `<label>` (visually hidden if needed).

### Navigation dock

- Floating pill: `rgba(255,255,255,0.94)`, `--radius-xl`, padding 8, `--shadow-float`.
- `position: sticky; bottom: 16px`, centered.
- Items: icon 22px above a 14px label, min-width 86px, padding 10px 14px, `--radius-md`.
- Active item: `--primary-soft-2` background, `--primary` text and icon, weight 700, `aria-current="page"`.
- Items: Resumen, Movimientos, Pagos fijos, Categorías, Subir, Pregúntale, Perfil.

---

## 10. Data visualization rules

1. Color by kind only: income green, spending orange, moved blue.
2. One percentage → a ring. Comparisons over time → lines. No pie charts with more than three slices; use a ranked list instead.
3. Every chart has a title, a one-line reading guide and a legend.
4. Print the values: never make the user read a value off an axis.
5. Highlight at most one event per chart, explained in plain language.
6. Daily interest rows are grouped into one line per period.

---

## 11. Voice and copy

- Spanish (es-CO), addressing the user as **tú**.
- Sentence case everywhere ("Tu extracto, traducido"), except the wordmark and raw bank text.
- Plain words over banking jargon: "Movido", not "transferencias internas"; "Gasto real", not "débitos".
- Every number gets its meaning: "El 58% de lo que salió. Sigue siendo tuyo."
- Actions name the result: "Ver los 21 retiros", "Subir extracto".
- Errors say what happened and what to do, without apologizing: "Este PDF tiene contraseña. Escríbela para abrirlo; no sale de tu navegador."

---

## 12. Accessibility

- Text contrast of at least 4.5:1 (3:1 for 24px and up). Use the verified pairs in section 3.6.
- Touch targets of at least 44×44px.
- Focus ring: `3px solid #2563EB` with a 3px offset, on every interactive element.
- Real `<button>`, `<a href>` and `<input>` with `<label>`. Icon-only buttons have an `aria-label`.
- Toggle groups use `role="group"` with `aria-label`, and options use `aria-pressed`. The active navigation item uses `aria-current="page"`.
- Charts have `role="img"` and an `aria-label` that states the conclusion.
- Color is never the only signal: legend, labels and signs always accompany it.
- Respect `prefers-reduced-motion`.

---

## 13. Implementation (Tailwind CSS v4)

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Fonts (variables set by next/font) */
  --font-display: var(--font-outfit), system-ui, sans-serif;
  --font-sans: var(--font-manrope), "Segoe UI", system-ui, sans-serif;

  /* Surfaces */
  --color-bg: #eef2f7;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f4f8;
  --color-divider: #edf0f4;
  --color-chart-grid: #e6eaf0;
  --color-chart-axis: #d6dce4;
  --color-ring-track: #e3e8ef;

  /* Text */
  --color-ink: #1c2430;
  --color-ink-secondary: #3a4452;
  --color-ink-muted: #5f6b7a;
  --color-ink-faint: #7a8597;

  /* Primary */
  --color-primary: #2563eb;
  --color-primary-strong: #1d4ed8;
  --color-primary-soft: #e3edfe;
  --color-primary-soft-2: #e8f0fe;

  /* Kinds */
  --color-income: #34b873;
  --color-income-text: #15803d;
  --color-income-soft: #e3f6ec;
  --color-income-on-soft: #166534;
  --color-spending: #ea6b2d;
  --color-spending-text: #c2410c;
  --color-spending-soft: #fdeee4;
  --color-spending-on-soft: #9a3412;
  --color-spending-surface: #fff6ef;
  --color-moved: #4c8df6;
  --color-moved-text: #2563eb;
  --color-moved-soft: #e3edfe;
  --color-moved-on-soft: #1d4ed8;

  /* Radius */
  --radius-sm: 16px;
  --radius-bubble: 18px;
  --radius-md: 22px;
  --radius-lg: 26px;
  --radius-xl: 30px;

  /* Shadows */
  --shadow-card: 0 8px 22px rgb(80 98 125 / 0.08);
  --shadow-panel: 0 18px 44px rgb(80 98 125 / 0.12);
  --shadow-float: 0 16px 40px rgb(80 98 125 / 0.18);
  --shadow-pop: 0 10px 26px rgb(80 98 125 / 0.18);
  --shadow-chip: 0 6px 16px rgb(80 98 125 / 0.12);
  --shadow-primary: 0 10px 24px rgb(37 99 235 / 0.28);
  --shadow-assistant: 0 6px 18px rgb(37 99 235 / 0.18);
}

body {
  background: linear-gradient(180deg, #eef2f7 0%, #e9eef4 55%, #e2e8f0 100%);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

```tsx
// apps/web/src/app/layout.tsx
import { Manrope, Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

// <html lang="es" className={`${outfit.variable} ${manrope.variable}`}>
```

Translucent surfaces are written with opacity modifiers: `bg-surface/88` (cards), `bg-surface/60` (panels), `bg-surface/94` (dock).

---

## 14. Pending

- **Dark mode:** not designed yet. When it is, every token above gets a dark value; components keep using tokens only.
- **Phone layout:** the one-column version and the bottom tab bar need their own artboards.
- **States:** empty (no statements yet), loading (ingestion in progress) and error screens.
- **Remaining screens** in this style: upload, transactions, recurring payments, categories and settings.
