---
paths:
  - "apps/web/src/**/*.tsx"
  - "apps/web/src/**/*.css"
---

# Xtrakto — Design System

Visual and UI guide for Xtrakto, based on **version 8** of the design canvas: v7 (the layout of v4 with the visual style of v6), adjusted after checking real Bancolombia files.

Reference screenshots of v8 live in [`docs/ui/`](../../docs/ui/README.md), every screen at desktop and phone width: they show layout and feel; this document wins on exact values.

The look is calm, light and clear: a cool grey-blue ground, translucent white cards with soft shadows, very rounded shapes, thin line icons, and **color that always means something**.

---

## 1. Principles

1. **Color is meaning.** Green is income, orange is real spending, blue is money that moved between the user's own accounts, investment and cards, in either direction. A color is never used for decoration if it already means something.
2. **Explain every number.** Every figure comes with one line saying what it is ("El 42% de lo que salió…"). No number stands alone.
3. **Calm over dense.** Generous spacing, few borders, soft shadows. Separation comes from surfaces and space, not lines.
4. **Actions say what they do.** "Ver en qué gastaste", not "Ver detalle". "Subir extracto", not "Enviar".
5. **Never rely on color alone.** Every colored element also has a label, a sign (+ / −) or a legend.
6. **Guess, then ask.** A movement the rules can't classify alone (a Bre-B _llave_ payment, a PSE payment to a fintech, a transfer to the holder's truncated name, a deposit at a _corresponsal_) gets the best guess and a "Por revisar" mark, and the quick review asks about it by group, never one by one. Answers become rules.
7. **Overlapping files are normal.** Users download several ranges of the same month: deduplicate and say so ("63 ya los tenías, no se duplican"), never as an error.

---

## 2. Brand

| Element    | Spec                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo       | "Cinta plegada": an X of two rounded bars, blue over orange. Files, variants, sizes, clear space and usage in [`docs/brand.md`](../../docs/brand.md) |
| Wordmark   | `XTRAKTO` — Outfit 500, 24px, uppercase, letter-spacing `0.3em`                                                                                      |
| Descriptor | `Extractos` — Outfit 300, 21px, color `--text-secondary`, baseline-aligned, 12px after the wordmark                                                  |
| Tagline    | "Cuentas claras, mente tranquila" — Manrope 400, 14px, `--text-muted`                                                                                |
| Domain     | xtrakto.site                                                                                                                                         |

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

**Moved goes both ways:** money out to the user's investment, accounts and cards, and money that came back from them (their Nequi, a transfer from their own name). Money that came back is never income.

**Rules**

- Inside data, kind colors mean kinds only. Outside data, the same hues carry a status, always next to its word: green for verified states ("Verificado", "Estable", `--status-ok`), orange for things to look at ("Por revisar", "Subió", `--status-attention`), soft blue for information ("Varios canales", "Completado").
- Blue is both the interactive color and the "moved" kind. Inside data, blue is always accompanied by the legend or a label, so it is never ambiguous.
- Signs: income `+$35.421.381`, outflows `−$1.472.800` (use the real minus sign `−`, U+2212). Moved amounts carry their direction too, both in the moved text color: `−$300.000` to the user's Nequi, `+$1.200.000` back from it.
- **Unclassified movements** have no kind color until the user answers: a neutral icon chip (`--surface-muted`, ink icon), an ink amount and the "Por revisar" badge.

### 3.5 Status and danger

| Token                | Value     | Use                                                                                                |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `--status-ok`        | `#34B873` | Verified states ("Saldo verificado", "Encadenado"): dot with a 4px halo `rgba(52, 184, 115, 0.18)` |
| `--status-attention` | `#EA6B2D` | Alert dot on tiles, icons and attention surfaces ("Por revisar", errors, "No cuadra por $12.400")  |
| `--text-faint`       | `#7A8597` | Dot of "Sin saldo para verificar" (a file without balances), with the same halo                    |
| `--danger`           | `#B91C1C` | Destructive actions only ("Borrar todos mis datos") and inline form errors                         |

Danger is not a kind: never use it for spending. Notice and error screens (`docs/ui/v8-13-estados`) don't use it either: notices sit on the normal surface; errors on the attention surface (`#FFF6EF`) with an orange dot, saying what happened and what to do, without apologizing.

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
| `--danger` on white / white on `--danger`              | 6.5:1  | ✅                                                 |
| `--danger` on `#EEF2F7`                                | 5.8:1  | ✅                                                 |

**Graphic colors** (`#34B873`, `#EA6B2D`, `#4C8DF6`) are not for text. The green one (2.6:1 on white) is below 3:1, so a green ring or line must always have its value printed next to it or inside it.

> **Corrections relative to the v7 mockup:** raw bank descriptions move from `#7A8597` to `--text-muted`; the text of active chips moves from `#2563EB` to `#1D4ED8`; text on the soft green background uses `#166534`.

---

## 4. Typography

| Role                       | Family                           | Fallback                            |
| -------------------------- | -------------------------------- | ----------------------------------- |
| Display, amounts, wordmark | **Outfit** (300, 400, 500, 600)  | `system-ui, sans-serif`             |
| UI and body                | **Manrope** (400, 500, 600, 700) | `"Segoe UI", system-ui, sans-serif` |

Both come from Google Fonts, as variable files kept in `apps/web/src/fonts/` (Latin subset): Next.js loads them with `next/font/local` and exposes them as CSS variables (`--font-outfit`, `--font-manrope`). With `next/font/google` every build downloaded them, and one of Google's answers broke the CI build.

### Type scale

| Style                           | Family  | Weight           | Size / line height | Notes                      |
| ------------------------------- | ------- | ---------------- | ------------------ | -------------------------- |
| Page title (H1)                 | Outfit  | 500              | 34 / 1.15          | letter-spacing `-0.01em`   |
| Landing headline (waitlist)     | Outfit  | 600              | 46 / 1.08          | 34 on phones; `-0.02em`    |
| Landing section (waitlist)      | Outfit  | 600              | 28 / 1.2           | centered                   |
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
- Raw bank descriptions are shown exactly as the bank prints them: case, truncation and double spaces included (`white-space: pre`), with letter-spacing `0.02em`. A description of `0` reads "Sin descripción del banco".
- The raw-text chip (§9) uses the system monospace stack (`ui-monospace, "SF Mono", Menlo, Consolas, monospace`) at 12px, so a double space is visible.

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
| Amounts on axes   | Compact, round without `,0`  | `$30M`, `$2,5M`, `$500 mil` |

Use compact amounts in cards and exact amounts in lists and detail views. `formatCompactAmount` and `formatSignedCompactAmount` (core) write them: whole thousands ("$392 mil"), millions with one decimal ("$51,3M"), and amounts under $1.000 exact ("$870").

---

## 5. Shape

### Radius

| Token             | Value   | Use                                                                 |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `--radius-pill`   | `999px` | Buttons, chips, segmented control, the chat input                   |
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
Title row ..... page title, color legend below it
Controls ...... period selector (quarter + months) · the page's action ("Subir extracto")
Banner ........ review banner, while review groups are pending
Row 1 ......... Tu trimestre de un vistazo (2)   |  Tu cuenta (1)
Row 2 ......... Saldo y gasto real (2)           |  Dónde se fue más (1)
Row 3 ......... Tu extracto, traducido (2)       |  Pregúntale a tu extracto (1)
Dock .......... sticky at the bottom, centered
```

That is the summary; the other screens keep the header, title row and controls, then their own rows (`docs/ui`).

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

| Concept                                       | Icon                               |
| --------------------------------------------- | ---------------------------------- |
| Income                                        | `download` (arrow into tray)       |
| Real spending                                 | `shopping-cart`                    |
| Moved                                         | `arrow-left-right`                 |
| Investment                                    | `trending-up`                      |
| Loan / bank ("Créditos")                      | `landmark`                         |
| Credit card                                   | `credit-card`                      |
| Cash ("Efectivo")                             | `banknote`                         |
| Nequi / phone                                 | `smartphone`                       |
| Bank costs ("Costos del banco": 4x1000, fees) | `file-text`                        |
| Payments to people ("Pagos a personas")       | `users`                            |
| Payment gateways ("Pasarelas de pago")        | `globe`                            |
| Groceries ("Mercado")                         | `shopping-bag`                     |
| Restaurants and delivery                      | `utensils`                         |
| Shopping ("Compras")                          | `package`                          |
| Transport                                     | `car`                              |
| Home services ("Servicios del hogar")         | `house`                            |
| Health                                        | `heart`                            |
| Housing ("Vivienda")                          | `key-round`                        |
| Education ("Educación")                       | `graduation-cap`                   |
| Entertainment ("Entretenimiento")             | `clapperboard`                     |
| Subscriptions                                 | `repeat`                           |
| Other                                         | `ellipsis`                         |
| To review ("Por revisar")                     | `circle-alert`                     |
| A category, and rules from the quick review   | `tag`                              |
| Recurring payments                            | `calendar`                         |
| Privacy                                       | `shield-check`                     |
| Files we don't keep (privacy facts)           | `eye-off`                          |
| Numbers kept only as a code (privacy facts)   | `lock`                             |
| More, on the phone's bar ("Más")              | `ellipsis`                         |
| Upload                                        | `upload`                           |
| Download a CSV                                | `file-down` (`download` is income) |
| Ask / chat                                    | `message-square`                   |
| Summary                                       | `layout-grid`                      |
| Transactions                                  | `list`                             |
| Categories                                    | `chart-pie`                        |
| Notifications                                 | `bell`                             |
| Profile                                       | `user`                             |
| Assistant                                     | Custom open-ring arrow (see Brand) |

An unclassified movement shows the icon of its best guess in neutral ink, and one without a category shows `ellipsis`. Every income category uses `download`. Each category's icon is in `CATEGORY_ICONS`, and its chip is `MovementIcon` (`components/movement-icon/`), which Movimientos and Pagos fijos share.

---

## 9. Components

### Header

Wordmark block on the left, greeting with the assistant mark in the center, utilities on the right ("Tus datos son privados" with `shield-check`, notifications icon button, avatar). Wraps on small screens.

### Page title row

- H1 with the page or account name ("Resumen de tu cuenta de ahorros").
- **Color legend** right below: three dots of 10px with a bold label and a plain-language meaning. It appears on every screen that shows kinds, with this copy:
  - "**Ingresos:** lo que entró de otros" (green)
  - "**Gasto real:** lo que de verdad gastaste" (orange)
  - "**Movido:** lo que pasó entre tus cuentas, tu inversión o tus tarjetas, en cualquier sentido" (blue)
- Below it, the controls: period selector, then the page's action ("Subir extracto" on the summary, "Descargar CSV" on Movimientos). On phones they stack at full width.

### Buttons

| Variant     | Spec                                                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary     | Pill, `--primary` background, white Manrope 700 15px, min-height 50px, padding 0 22px, `--shadow-primary`, icon 18px on the left                                                                                                                 |
| Secondary   | Pill, `--surface` background, `--text` Manrope 600, `--shadow-chip`                                                                                                                                                                              |
| Icon button | 44px circle, `rgba(255,255,255,0.8)`, `--shadow-chip`, icon 19px; always with `aria-label`                                                                                                                                                       |
| Link action | Manrope 700 14px, `--primary`, no underline; underline on hover                                                                                                                                                                                  |
| Destructive | Pill, `--surface` background, `--danger` Manrope 700 text and `trash-2` icon, `--shadow-chip` ("Borrar todos mis datos", `destructive-secondary`). The confirmation dialog's confirm button is filled `--danger` with white text (`destructive`) |
| Answer      | Quick review answers: the suggested one as Primary, the others as Secondary, then a caption "Sugerido: la primera"                                                                                                                               |

### Period selector

- **Quarter picker:** white pill button (`--shadow-chip`, `calendar` icon, the quarter "Jul – sep 2026", chevron). It opens a popover (`--surface`, `--radius-md`, `--shadow-pop`) that lists the quarters with their status badge ("Verificado", "Sin verificar") and "Año 2026" with its coverage ("9 de 12 meses"); "Año" adds up the quarters the user has. The selected quarter has a `--primary-soft` background and `--primary-strong` text.
- **Months:** a segmented control with the quarter's three months and "Trimestre", the default. Pill container `rgba(255,255,255,0.8)` with 5px padding and `--shadow-chip`. Options: pill, min-height 40px, padding 0 16px, Manrope 600 14px `--text-muted`. Active: `--primary-soft` background, Manrope 700, `--primary-strong`.
- **As Phase 5.7b builds it** (`PeriodControls`): the quarters with movements, newest first; "Verificado" when every movement of the quarter carries the balance of a verified quarterly statement, "Sin verificar" otherwise; "Año" waits for Phase 10.2. The options are links, since the period lives in the URL (`?period=2026-q3`, `?period=2026-08`): the picker is a menu of links (Base UI `Menu.LinkItem`, the current one with `aria-current`), and the months a `<nav>` named "Mes del trimestre" whose current link has `aria-current="page"`. On phones each control takes the full width, the months sharing it with 6px of padding each, so a quarter's longest months ("Noviembre", "Diciembre") fit at 360px. Since 6.5b Movimientos and Pagos fijos share it (`components/period-controls/`), each page's links keeping its own filters.
- **Account switch:** only with several accounts, before the quarter picker: the same white pill with the short label ("Cuenta de ahorros ••••8901", so the digits never get cut) opening the accounts with their whole label ("Cuenta de ahorros · Bancolombia ••••8901"). Each opens on its latest quarter.

### Filter chips

Pill, min-height 38px, padding 0 14px, Manrope 13px. Inactive: `--surface-muted`, `--text-secondary`, 600. Active: `--primary-soft`, `--primary-strong`, 700, `aria-pressed="true"`. A chip can carry its count ("Por revisar · 24").

Chips whose filter lives in the URL are links instead, inside a named `<nav>`, and the current one has `aria-current="page"` (§12) (`FilterChips`, `components/filter-chips/`). Movimientos's "Todo / Ingresos / Gasto real / Movido / Por revisar · 24" work this way (Phase 6.2b), under the search, in a `<nav>` named "Mostrar". They keep the account, the period and the search, show the first 30 movements again, and leave the page's scroll where it is. Pagos fijos's "Activos · 7 / Ya no aparecen · 1" do too (6.5c).

### Stat card

- `--surface-card`, `--radius-md`, padding 20, `--shadow-card`, gap 12.
- Header: icon chip (38px, kind soft background, kind-colored icon) + label (Manrope 700 15px) on the left; **progress ring** on the right.
- Ring: 58px, radius 26, stroke 6, track `--ring-track`, progress in the kind's graphic color, round caps, starting at 12 o'clock; percentage in the center (Outfit 500 14px).
- Amount: Amount XL.
- Explanation: Caption, `--text-muted`, one sentence.
- Action link that names the destination ("Ver en qué gastaste").
- **As Phase 6.7a builds it** (`StatCard`, `ProgressRing`, `components/stat-card/`): the label is the card's `h3`, the amount is ink, and the action link sits at the card's bottom, so a row of cards lines its links up. The ring is hidden from screen readers, since the explanation says its share in words; with nothing to show it draws only its track, since a round cap would draw a dot.

### Summary ("Resumen")

As Phase 6.7a builds `v8-01` at `/`, for the account and period in the URL:

- **The top:** "Resumen de tu cuenta de ahorros", the color legend, the period controls of Movimientos and Pagos fijos with the Primary "Subir extracto" after the months (full width on phones), and the review banner while groups wait.
- **"Tu trimestre de un vistazo"** ("Tu mes de un vistazo" for a month; Section title) with the headline in Caption `--text-muted`: "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto.", or only what went out when nothing moved, or "No salió plata de tu cuenta.". Below, the three stat cards, `repeat(auto-fit, minmax(190px, 1fr))` with 16px gaps, stacked on phones, each with its compact total:
  - **Ingresos**, its ring the share of its largest kind: "El 85% llegó en 2 transferencias." ("abonos de intereses", "consignaciones", "devoluciones"), and "No incluye $2,8M que volvió de tus cuentas." when money came back; "Ver ingresos".
  - **Gasto real**, its ring its share of what went out: "El 45% de lo que salió." and its four largest categories, "Créditos, mercado, efectivo y pagos a personas."; "Ver en qué gastaste".
  - **Movido**, its ring the share of what went out to the user's own: "El 55% de lo que salió: a tu inversión y a tus tarjetas. Además volvieron $2,8M."; "Ver a dónde se movió".
  - Each link opens Movimientos on the period with its kind's filter. A kind without movements says so ("No hubo gasto real en este periodo.") over an empty ring.
- Before any movement counts, the page keeps its empty state (§14), or the way to a statement that doesn't reconcile.
- Beside the glance, "Tu cuenta" (6.7b, account card above); under the glance, in its two thirds, the day-by-day chart (6.7c, chart card above), after "Tu cuenta" on phones; and beside the chart, "Dónde se fue más" (6.7d, insight tile above), after the chart on phones. From `lg` the chart's card is as tall as "Dónde se fue más", as v8 draws it. "Tu extracto, traducido" and "Pregúntale a tu extracto" wait for 8.6 and 13.

### Kind total tile

On Movimientos (`KindTiles`, Phase 6.2b): three `tile` cards above the list, as wide as the list and the detail column beside it (6.3f), side by side from `sm` and stacked on phones. Each has:

- an icon chip, 44px, with the kind's soft background and its icon (§8) in the kind's text tone;
- the label, Manrope 700 14px;
- the period's total in Amount L, compact (§4), with its sign, in the kind's text color;
- the count, in Meta `--text-muted` ("41 movimientos").

Moved shows each direction that has movements: "−$29,8M · +$2,8M", "57 salieron · 8 volvieron". A line breaks only between directions. When money moved only one way it shows that one, and when none moved, "$0" and "0 movimientos".

The totals are the account's for the period: neither the search nor the filter changes them, and a movement without a category adds to none.

### Account card

- `--surface-panel`, `--radius-lg`, padding 22, `--shadow-panel`.
- Left: label "Saldo al 30 de septiembre", balance (Amount XL), account name with the number masked to its last 4 digits ("Cuenta de ahorros · Bancolombia ••••8821"), two small boxes with the bank's own figures ("Saldo promedio", "Intereses pagados"; `--surface`, `--radius-sm`), then the status pill.
- Right: statement object illustration, about 112×160px.
- **As Phase 6.7b builds it** (`AccountCard`, on the summary): "Tu cuenta" (Section title) with "Comparamos cada saldo con el de tu banco.", beside the glance from `lg` and under it on phones, the illustration 96px wide from `sm`. The balance is the one printed after the period's last movement that has one, exact with its cents ("Saldo al 30 de septiembre", "$7.818.518,82"); files without balances show none. The boxes are those of the quarterly statement the period shows, a million or more compact and less exact ("$5,1M", "$18,82"), and a month calls them its quarter's ("Saldo promedio del trimestre", "Intereses del trimestre"); a figure the statement didn't print has no box. The pill says what checks the balances: "Saldo verificado" with "312 movimientos cuadran", or "Encadenado con abr–jun 2026 · 312 cuadran" when it chains on to the quarter before; "No cuadra por $810" with "Revisa el archivo" when a statement of the period doesn't reconcile (only "No cuadra" when its closing balance adds up), followed by the link action "Ver dónde no cuadra"; and "Sin saldo para verificar" with "Archivo de movimientos" otherwise.

### Status pill

`--surface`, `--radius-sm`, padding 10px 14px, `--shadow-chip`. Status dot (10px with halo) + title (Manrope 700 14px) + detail (12px muted). The variant depends on the file:

| Variant           | Dot                  | Example                                               |
| ----------------- | -------------------- | ----------------------------------------------------- |
| Verified          | `--status-ok`        | "Saldo verificado" · "312 movimientos cuadran"        |
| Chained           | `--status-ok`        | "Encadenado" · "Empieza donde terminó abr-jun"        |
| Without balance   | `--text-faint`       | "Sin saldo para verificar" · "Archivo de movimientos" |
| Doesn't reconcile | `--status-attention` | "No cuadra por $12.400" · "Revisa el archivo"         |

A movements export without balances becomes "Verificado por tu extracto trimestral" once a quarterly statement covers its dates and agrees with it.

On the upload screen the same pill counts the month's statements, beside the page title (full width under it on phones): "7 de 10 disponibles" · "Archivos este mes" with the verified dot; with none left, "0 de 10 disponibles" · "Se renuevan el 1 de noviembre" with the attention dot (`StatusPill`, `components/status-pill/`).

On the quick review it counts the quarter's groups and their movements, answered or not, beside the title (full width under it on phones), as `v8-02` does: "6 grupos · 38 movimientos" · "Unos 2 minutos" with the information dot (`--moved`, tone `info`), about 30 seconds per open group ("Menos de un minuto", "Un minuto"); once none is open, "Todo respondido" with the verified dot.

### Chart card

- `--surface-card`, `--radius-lg`, padding 24.
- Title + one-line reading guide ("Si la línea naranja sube rápido, estás gastando rápido.").
- Legend as line swatches (18×3px): solid blue for balance, dashed orange for cumulative spending.
- Lines: balance `#4C8DF6` 2.6px solid with an area fill from 22% to 0% opacity; cumulative real spending `#EA6B2D` 2.4px dashed `7 6`.
- Grid `--chart-grid`, baseline `--chart-axis`; Y labels on the left (Meta style, right-aligned); 4 X labels.
- Highlighted event: white circle r=7 with a 3px `--primary` stroke, dashed vertical guide, and a tooltip (`--surface`, `--radius-sm`, `--shadow-pop`) explaining the event in plain language.
- **As Phase 6.7c builds it** (`DayByDayChart`, on the summary): "Tu saldo y tu gasto real, día a día" (Section title) and its guide inside the card, the legend beside them from `sm` and under them on phones. The plot is 192px tall, an SVG stretched to its width whose lines keep their width and dashes (`non-scaling-stroke`); the amounts on the left, the days under it, the circle and the note are HTML over it, so they never stretch. It draws each day from the period's opening (the day before its first, "30 jun") through its last day with movements, on an axis that runs to the period's last day: the balance each day, the same over a day without movements, when every movement printed it; and the real spending so far, from $0. The amounts are round, three steps at most ("$30M", "$20M", "$10M", "$0"; steps of 1, 2, 2,5 and 5 times a power of ten, from $10); the days are a quarter's opening and its months' last days ("30 jun", "31 jul", "31 ago", "30 sep"), or a month's opening, 10th, 20th and last day. The event is the day the most income came in, when it is a tenth of the scale or more: "4 de agosto: entraron $31,5M" over "Ese mismo día $22,0M pasaron a tu inversión. No fue gasto.", or "Fue el día con más ingresos del trimestre." when nothing moved that day. Its note sits beside the circle from `sm`, on the side with more room, and under the plot on phones. The plot is one image whose name says the conclusion ("Tu saldo pasó de $13,8M el 30 de junio a $6,5M el 30 de septiembre, y tu gasto real llegó a $24,4M."); the note stays outside it. Without balances (movements exports only) it is "Tu gasto real, día a día", with "Tus archivos de movimientos no traen saldo." under the guide, the spending's line alone and no event; without spending either, there is no card.
- **Shared** (since 6.8c, `LineChartPlot`, `components/line-chart/`): the amounts on the left, the days under the plot, the gridlines, and the point singled out with its guide, circle and note; the round amounts and where days and amounts fall (`line-chart.helpers.ts`). Each chart draws its own lines and areas inside the SVG, and its dots in HTML over it. "Tu saldo y tu gasto real, día a día" and a category's "Semana a semana" (below) use them.

### Insight tile

- `--surface-card`, `--radius-md`, padding 16, gap 8.
- Icon chip 44px `--surface-muted`; title (Manrope 700 14px); Amount L; note (12px muted).
- **Attention variant:** `#FFF6EF` background, white icon chip, 9px orange dot on the chip, and an explicit verb in the title or note ("Revisa si tu cuenta es exenta").
- One component (`InsightTile`, `components/insight-tile/`) draws it on the summary (6.7d) and on Categorías (6.8a), with its category's icon in the chip.
- **As Phase 6.7d builds it** ("Dónde se fue más", `WhereItWent`, on the summary): "Dónde se fue más" (Section title) with "Lo que más pesa en tu gasto real.", then the tiles two by two at every width, 16px apart. Each is a `tile` card with its category's icon in the chip, the category as its title (`h3`), what it took (Amount L, ink; a million or more compact and less exact, as the account card's boxes write it) and its note (Meta `--text-muted`). They are the three categories that weigh most in real spending, the largest first, then "Costos del banco · revisar" on the attention surface when the bank charged the 4x1000; without the 4x1000, the four that weigh most. A category's note says its share ("46% de tu gasto real.", "Menos del 1% de tu gasto real.") and what we know of it: what its bank text doesn't say, in its insight's words ("3 retiros de efectivo. No sabemos en qué se usó."; a gateway's payments, on the attention surface as "Pasarelas de pago · revisar"), its fixed payments paid in the period and their days ("1 cuota, entre el 2 y el 3 de cada mes.", "2 pagos fijos, entre el 5 y el 12 de cada mes."), or how many payments it took and their channels, the most used first ("5 pagos por Nequi, QR y transferencia."). The bank's costs speak with the 4x1000's insight: "Te cobraron 4x1000 del 10 al 18 de julio, en 9 cobros. Revisa si tu cuenta es exenta." No tiles without real spending; nothing in them takes the focus.

### Transaction row ("Tu extracto, traducido")

- Divider `--divider` on top, padding 14px 0, wraps on small screens.
- Icon chip 44px with the kind's soft background and kind icon.
- Plain-language title (Manrope 700 15px) and, below it, the raw bank text (12px, `--text-muted`, as printed).
- Explanation (13px, `--text-secondary`), then the channel tag and any badge ("Por revisar", "Subió").
- Amount (Amount S) in the kind's text color, with its sign, right-aligned in a 128px column.
- Unclassified rows: neutral icon chip and ink amount (§3.4), with "Por revisar".
- The daily interest rows of a month are one row ("Intereses de septiembre", "30 abonos diarios, agrupados en una línea").
- A raw text of `0` is titled "Sin descripción del banco", with a link to name it.
- On Movimientos the rows are grouped by day, each header with the day's balance ("Saldo del día $6.482.310"), and a row opens a detail panel: "Así lo escribe el banco", "También aparece como" (the other ways the bank wrote it), channel, reference, source files, balance after, kind and category with the reason ("Regla del sistema, sin IA").

### Movements list ("Todos los movimientos")

As Phases 5.7a, 6.1b and 6.2b build it (`TransactionList`):

- Above the card, in order: the color legend under the page title (`KindLegend`, `components/kind-legend/`), the period controls, any statement that doesn't reconcile, and the kind total tiles.
- A card (`--surface-card`, `--radius-lg`), its title and one line with the period's days and the account ("Del 1 de julio al 30 de septiembre de 2026. Cuenta de ahorros · Bancolombia ••••8901."). A month without movements reads "No hay movimientos en este periodo." From `lg` it takes two thirds of a row whose other third is the movement's detail (Phase 6.3f, below); under `lg`, the whole width.
- Day headers: the weekday and the date in Manrope 700 14px ("Miércoles 30 de septiembre", with the year when it isn't the current one), and "Saldo del día $6.482.310" in Caption `--text-muted` on the right, under it on phones. A day of a file without balances has no balance.
- Rows: the bank's text as the title, Manrope 600 15px with letter-spacing `0.02em` and `white-space: pre-wrap`, so double spaces show and a long text wraps only at its spaces; "Sin descripción del banco" with the bank's `0` under it in Meta. Under it, on one line that wraps, the channel tag and the category tag, or "Por revisar" instead while the category is only a guess (Phase 6.1b); a row of a statement that doesn't reconcile shows its channel only, since it counts nowhere. Each row starts with a 44px icon chip: its category's icon (§8) on the kind's soft background, in the kind's text tone. The amount is in Amount S with its sign, in the kind's text color (Phase 6.2b). The chip is neutral (`--surface-muted`, ink icon) and the amount ink (§3.4) when the category is only a guess, when there is none, or when the row belongs to a statement that doesn't reconcile.
- Footer: "Mostrando 30 de 312" (Meta, `--text-muted`) and the link action "Mostrar 30 más" (fewer when fewer are left). The count lives in the URL (`?show=60`) with the account and the period, the page keeps its scroll, and the focus moves to the first movement the link brought, also when the link goes away because every movement shows. Choosing another period or account shows the first 30 again.
- **Daily interest** (Phase 6.7e): a month's "ABONO INTERESES AHORROS", those the table's rule still calls interest, show in one line where its newest abono goes, when the month has two or more: the 44px chip with income's icon and tones, "Intereses de septiembre" (Body 700), the bank's text under it (Meta `--text-muted`, as printed), "30 abonos diarios, agrupados en una línea." (Caption `--text-secondary`) and the abonos added up in income's color ("+$420"). The line opens no detail, since it is no single movement. A day whose only movements were abonos has no header; every other day keeps the balance it closed with, abonos included. The page's subtitle adds "Los 90 abonos diarios de intereses se ven agrupados por mes.", also over a search or a filter that groups some. "Mostrar 30 más" adds lines, and the footer counts the movements they hold ("Mostrando 59 de 312"), so it reaches the subtitle's count. "Ver dónde no cuadra" keeps every row, to find where the balance breaks.
- The upload result links to its file's movements with the link action "Ver movimientos": its account, and the month that holds the file or the quarter of its last day. A statement that doesn't reconcile has none to show.
- **Search** (Phase 5.7c), under the card's header: a white pill (the text field with `--radius-pill` and `--shadow-chip`) with the `search` icon at 18px inside on the left and "Busca por descripción o monto" (references are stored as hashes, so v8's "o referencia" waits). Its label is visually hidden ("Buscar movimientos"). It's a GET form inside `role="search"`, so the term lands in the URL (`?q=`) with the account, the period and the filter, Enter searches, and the period and account links keep it. It finds the bank's text ignoring case, accents and extra spaces, and an amount typed the Colombian way ("$90.000", "1.234,56") with either sign. The page's subtitle then says "3 movimientos coinciden con “nequi”."
- **No matches** (`docs/ui/v8-13`): in the card, a 44px `--surface-muted` chip with `search`, "No encontramos “netflix”" (Manrope 700 15px), "Busca por otra palabra o por el monto, o quita la búsqueda." (Caption `--text-muted`) and a small Secondary "Quitar búsqueda", in a `role="status"` region. The footer's "Mostrando…" is a polite live region too.
- **Filters by kind** (Phase 6.2b), under the search: the filter chips (above). A filter keeps only its kind's movements, by their categories, or those waiting for review. It lives in the URL (`?filter=income`, `spending`, `moved` or `review`) with the account, the period and the search, and their links keep it. A filter with nothing to show reads "No hay movimientos de este tipo en el periodo."; the page's subtitle counts what the list shows.
- **A category's movements** (Phase 6.8b): a category's detail opens the list with `?category=restaurants`, instead of a filter. The list keeps that category's movements, the chips gain the category's name after "Por revisar · 24" as the current one, and any other chip leaves it; the search, the period links, "Mostrar 30 más" and the detail keep it. The page's subtitle reads "31 movimientos de «Restaurantes y domicilios»." (a search's words win), the tiles stay the period's, and a period without the category's movements reads "No hay movimientos de esta categoría en el periodo."

### Movement detail

As Phase 6.3f builds `v8-03`'s panel (`MovementDetailColumn`, `MovementDetailPanel`, `MovementSheet`):

- **Opening it:** each row's bank text is a link stretched over the whole row, with the focus ring around the row and its text underlined on hover. It opens the movement's detail in the URL (`?movement=`), keeping the list's account, period, search, filter and count, and the page's scroll. The open row sits on `--primary-soft-2` with a 1px `--primary` ring at 40%, like a marked row, and its link has `aria-current="true"`. A movement that isn't one of the account's that count opens nothing.
- **Beside the list, from `lg`:** the right third of the row, sticky 24px from the top, so it stays in sight while the list scrolls (it scrolls inside itself when taller than the screen). Before a movement is chosen it holds a card with "Elige un movimiento" (Section title) and what the detail shows (Caption `--text-muted`); on phones it holds nothing.
- **The panel:** a card (`--surface-card`, `--radius-lg`, padding 24, gap 20) with, at the top, the category's 44px chip in the kind's tones (neutral while it's a guess), the bank's text as the title (Section title, `0.02em`, `pre-wrap`; "Sin descripción del banco" for its `0`) over the day in words ("Miércoles 12 de agosto de 2026", Caption `--text-muted`), and the X icon button ("Cerrar el detalle") on the right. Then the amount in Amount XL with its sign, in the kind's text color or ink as in the list; "Así lo escribe el banco" (Meta 700) with the raw-text chip, on `--surface-muted` with `--radius-md`; and a list of lines, each with a `--divider` line above it, its label in Meta `--text-muted` and its value in Caption: "Canal", "Referencia" ("••• 1270", the only digits kept), "Fuente" ("Extracto trimestral jul–sep 2026", "Movimientos 1–7 oct 2026") and "Saldo después". A line it doesn't have isn't shown. Since 6.3g its kind and category are choices (below), between the lines and why.
- **Why:** the `info` icon in `--primary` and "**Por qué:**" then the rule's reason and "Regla del sistema, sin IA.", "lo decidiste tú." for the user's answer, or "ninguna regla conoce este movimiento todavía.", in Caption `--text-secondary`. A guess adds "Es nuestra mejor suposición: confírmala en la revisión." and the link action "Ir a la revisión", to the quick review of the movement's quarter.
- **On phones** (under `lg`): the same panel as a full-screen sheet on the page's background, padding 16, a modal `<dialog>` once the page runs, so the page behind it is inert and holds still. Its X, Escape or the browser's Back close it.
- **The focus** goes to the panel's title when it opens, and back to the movement's link when it closes. Escape closes it from inside on wide screens too. v8's "También aparece como" (10.1), "Es un pago fijo" (6.5) and the plain-language title (8.6) aren't there yet.

As Phase 6.3g makes them choices (`CorrectionForm`):

- **Tipo:** a segmented control of radios in a `fieldset` (the container and options of the period selector's months, §9), only the kinds the money's direction allows: "Gasto real" and "Movido" for money going out, "Ingreso" and "Movido" for money coming in. The arrow keys move between them, and choosing one starts its categories on the one it says when nothing more is known ("Otros", "Otros ingresos", "Entre tus cuentas").
- **Categoría:** its label in Body 700, with the "Por revisar" badge beside it while it's a guess, over a native `<select>` drawn as a white pill (48px, `--shadow-chip`) with the chosen category's icon on the left and a chevron on the right; it lists the chosen kind's categories in the table's order, and "Sin categoría" until one is chosen when the movement has none.
- **Why** follows, then the Primary "Guardar cambios", which gives that movement the user's category, and, when its text makes a rule (not the bank's `0`), the Secondary "Aplicar a los 3 parecidos" ("Aplicar al parecido" for one, "Aplicar también a los próximos" when no other movement has its text), which saves the rule for its text and direction and gives the category to every movement with it, in every statement. While it sends, both keep their focus and wait (`aria-disabled`).
- **After saving:** the page refreshes the list, its totals and the panel, whose reason becomes "lo decidiste tú.", and a polite status says what changed in Caption 600 `--text-secondary`: "Listo: este movimiento cuenta como movido." or "Listo: los movimientos con este texto cuentan como gasto real, también los próximos." A failure says "No pudimos guardar el cambio. Vuelve a intentarlo." in Caption 600 `--danger`, as an alert.

As Phase 6.3h adds what the user said is theirs (`OwnRules`), between the lines and the choices:

- **A Nequi number:** a send to Nequi, or money from it, that carries the number (only movements exports do) shows a row with a `--divider` line above it: the 44px neutral chip (`--surface-muted`, ink icon at 1.7) with `smartphone`, "Nequi ••• 1270" in Manrope 700 14px, and what the user said in Caption `--text-muted`: "¿Es tuyo? Lo que le envías y lo que llega de él contaría como movido.", "Es tuyo: lo que le envías y lo que llega de él cuenta como movido." or "Dijiste que no es tuyo." Under them, the small Secondary "Es mío" until it's the user's, and the link action "Deshacer" once they answered, here or in the quick review, read with the number ("Deshacer: Nequi ••• 1270").
- **The user's rule for its text:** the same row with `tag`, "Tu regla para este texto" and "Los movimientos con este texto cuentan como «Inversiones».", and "Deshacer" ("Deshacer tu regla para este texto"). Without a number or a rule, the block takes no room.
- **After a change:** the page refreshes the list, its totals and the panel, and the polite status of 6.3g says it: "Listo: ese Nequi es tuyo.", "Listo: deshicimos tu respuesta para ese Nequi." or "Listo: deshicimos tu regla para este texto."; a failure is its alert. An undone rule's movements take what the user's other rules say, else the table's guess again, with "Por revisar". The focus goes to the button that takes the place of the one pressed ("Deshacer" after "Es mío", and back), or to the status when its row leaves. While it sends, the buttons keep their focus and wait (`aria-disabled`).
- **The choices** show the movement's kind and category again when the page brings others, as after "Es mío", and keep the user's choice after saving.

### Where a statement doesn't reconcile ("Ver dónde no cuadra")

As Phase 5.7d builds it, from `v8-13`'s "El saldo no cuadra" (`StatementBreaksView`, `/transactions/breaks/<id>`):

- **Above the list:** when a quarterly statement of the shown period doesn't reconcile, a row on the attention surface (`--radius-md`, at most 896px wide) with the 9px orange dot, "Tu extracto trimestral jul–sep 2026 no cuadra por $810: sus movimientos no se cuentan aquí." in Caption `--text-secondary`, and the link action "Ver dónde no cuadra". The quarter picker marks such a quarter with the `attention` badge "No cuadra", and an account whose only statements don't reconcile is in the account switch too.
- **The view:** the page title "Dónde no cuadra" with the statement and its account as subtitle; a card on the attention surface with the white 44px chip, `circle-alert` and its orange dot, "El saldo final no cuadra por $810" (or "El saldo no cuadra"), "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre." and how many rows break the chain, then the link action "Ir a la primera fila que no cuadra" (to the oldest one) and a small Secondary "Subir de nuevo". Below, "Movimientos del extracto": every row it printed, by day, newest first; a row that breaks the chain sits on the attention surface with the dot and "Con el saldo anterior ($X) y este movimiento quedaría $Y; el banco dice $Z." in Caption `--text-secondary`.
- **Elsewhere:** the upload result of such a statement links to the view ("Ver dónde no cuadra"), and the summary, when nothing else counts, says "El saldo de tu extracto no cuadra" with the same action instead of inviting a first upload.

### Channel tag

A small tag on each movement: pill, `--surface` background, 1px `--chart-axis` border, Manrope 600 11px `--text-secondary` (`Badge` variant `tag`, which a file's tags use too). It comes from the start of the bank's text (`CHANNELS` and `channelOf` in core), the first row that matches; interest, the 4x1000 and the bank's `0` have none. Screen readers hear "Canal:" before it.

| Tag              | Bank text                                             |
| ---------------- | ----------------------------------------------------- |
| PSE              | `PAGO PSE`                                            |
| Llave Bre-B      | `PAGO LLAVE`                                          |
| QR               | `PAGO QR`, `TRANSF QR`                                |
| Nequi            | `TRANSFERENCIAS A NEQUI`, `TRANSFERENCIA DESDE NEQUI` |
| Cajero           | `RETIRO CAJERO`                                       |
| Débito           | `COMPRA EN`                                           |
| Sucursal virtual | `PAGO SUC VIRT`, `TRANSFERENCIA CTA SUC VIRTUAL`      |
| Transferencia    | `TRANSF A`, `TRANSF DE`, `PAGO INTERBANC`             |
| Corresponsal     | `CORRESPONSAL` anywhere in the text, tried last       |

### Category tag

The category of a movement, after its channel tag: the `neutral` badge (`--surface-muted`, `--text-secondary`) with the `tag` icon at 14px and the category's label ("Pagos a personas"). Screen readers hear "Categoría:" before it. A movement whose category is only a guess shows "Por revisar" instead; one without a category, none.

### Badges

Pills without a border, Manrope 600 12px, on a soft background:

| Badge                                                  | Background        | Text                 |
| ------------------------------------------------------ | ----------------- | -------------------- |
| Por revisar (`circle-alert`, `Badge` variant `review`) | `--spending-soft` | `--spending-on-soft` |
| Subió (`arrow-up-right`)                               | `--spending-soft` | `--spending-on-soft` |
| Estable, Verificado                                    | `--income-soft`   | `--income-on-soft`   |
| Varios canales, Completado, Muy pronto (`info`)        | `--primary-soft`  | `--primary-strong`   |
| Monto variable, Sin verificar                          | `--surface-muted` | `--text-secondary`   |

### Raw-text chip

The bank's text exactly as printed, for the quick review, the profile and the detail panel: `--surface`, 1px `--ring-track` border, radius 8, padding 4px 10px, monospace 12px (§4), `white-space: pre`, in `--text-muted`. Repeats show as "×3" beside it (Meta, `--text-muted`), which screen readers hear as "3 veces" (`RawTextChip`, `components/raw-text-chip/`; the waitlist's sample draws its own).

### Review banner

On the summary while review groups are pending: the attention surface (`#FFF6EF`), `--radius-lg`, a white icon chip with the 9px orange dot, a title with the count ("Tienes 4 grupos por revisar (24 movimientos)"), one line ("Mientras tanto usamos nuestra mejor suposición. Confírmalos: pueden cambiar tu gasto real.") and a Primary "Revisar ahora".

As Phase 6.3c builds it (`ReviewBanner`, `components/review-banner/`): under the page title, as wide as the page, padding 20, the `circle-alert` chip, the title in Manrope 700 15px and the line in Caption `--text-secondary`; the button goes under them on phones. It counts the open groups and their movements of the account and quarter the review opens on, links to that review with both in the URL, and leaves once nothing waits.

### Review group card

The quick review asks one question per group:

- **Open:** `--surface-card`, `--radius-lg`, padding 24. Neutral icon chip, the question as card title ("¿Qué son estos pagos con llave (Bre-B)?"), one line of context, the amount at stake and its count on the right (Amount S, ink), the raw-text chips of the group, and the answers (Answer buttons, §9). A group of references (Nequi numbers) lists each one with its count and total and an "Es mío" switch, then "Guardar" and "Ninguno es mío".
- **Answered:** collapses to one line on `--surface-card`: a check icon chip (`--income-soft`), the group and what it now counts as ("Son tuyas: 5 movimientos cuentan como movido.") and a "Cambiar" link.
- Beside the groups, the panel "Lo que está en juego": progress ("2 de 6 respondidos"), each open group with its amount and what the answer would change ("Si son compras, tu gasto real sube a $30,4M"), and "Ver mi resumen" / "Responder después".

As Phase 6.3b builds the quick review (`/review`, `ReviewGroupCard`):

- **The page:** the title "Revisa antes de ver tu resumen" and v8's subtitle, then the account's quarter in Body small 600 `--text-secondary` ("Jul – sep 2026 · Cuenta de ahorros ••••8901"). The quarter is the account's latest, or the one the URL asks, as in Movimientos, with no picker. Below, one open card per group, at most 896px wide; since Phase 6.3e, the groups take the main column of a row (§7) and "Lo que está en juego" the side one, and the status pill sits at the page's right edge. A quarter with nothing to ask shows a card with "Nada por revisar en este trimestre", one line, and the link action "Ver movimientos". The dock lights Resumen.
- **An open card:** a grid with the 44px neutral chip (`--surface-muted`, ink icon at 1.7), the question (Manrope 700 16px) and its context (Caption `--text-muted`), and the amount at stake with its sign and its count on the right. On phones the amount moves under the question. Then the raw-text chips, most repeated first, and the answers: small pills of 44px, the suggested one Primary and the others Secondary, inside a `role="group"` named "Respuestas", then "Sugerido: la primera" in Caption `--text-muted`.
- **Sending:** each answer is a submit button of one form. While it sends, every button keeps its focus and waits (`aria-disabled`). An answer that couldn't be saved says "No pudimos guardar tu respuesta. Vuelve a intentarlo." under the buttons, in Caption 600 `--danger`, as an alert.

As Phase 6.3c closes answered groups (`AnsweredGroup`, `ReviewGroupItem`):

- **In its place:** an answered group stays where it was, in the review's order, as a card (`--surface-card`, `--radius-lg`, padding 20): the 44px check chip (`--income-soft`, `check` in `--income-on-soft`), the group's name with up to two of the bank's texts it answered, quoted as printed ("Transferencias a tu nombre (“TRANSF A ANA LUCIA MAR” y “Ana Lucia Mar”)", then "y 2 más"; the bank's `0` isn't quoted) in Body 700, and what its movements count as now in Caption `--text-muted`, one sentence per answer: "Son tuyas: 5 movimientos cuentan como movido.", or for "No sé" "No sé: 2 movimientos siguen como movido, nuestra mejor suposición." The link action "Cambiar" sits on the right, under the text on phones, and is read with the group's name ("Cambiar: Transferencias a tu nombre"). A group with movements still waiting stays open, asking only about those. Once every group is answered, the cards stay and the status pill says "Todo respondido".
- **Cambiar** opens the card again in the same place, about the movements answered, with every answer but "No sé" (an answer changes, it doesn't go back to the guess) and the link action "Mantener mi respuesta" under them, which closes it unchanged.
- **The focus** stays on the group: once answered, or kept, on the closed card (a `role="group"` named by its title and described by its sentence, with the focus ring around it); when "Cambiar" opens it, on its question. A group loaded already answered takes no focus.

As Phase 6.3d asks about the Nequi numbers (`NumbersCard`, `NumbersForm`), after "Plata que entró", as `v8-02` orders them:

- **Open:** the same card, with the `smartphone` chip, "¿Alguno de estos números de Nequi es tuyo?" and its context, and the amount and count of the sends that wait. Below, one row per number, the most sends first, each with a `--divider` line above it: the raw-text chip with the bank's text and the number's digits ("TRANSFERENCIAS A NEQUI · ref ••• 1270"), what went there in Meta `--text-muted` ("6 envíos · $480.000"), and "Es mío" with its switch on the right, under them on phones. Then a small Primary "Guardar" and a small Secondary "Ninguno es mío".
- **Answered:** the closed card names the numbers instead of the bank's text ("Números de Nequi (••• 4567 y ••• 6543)"), with "Son tuyos: 1 movimiento cuenta como movido." and "No son tuyos: 1 movimiento cuenta como gasto real."
- **Cambiar:** a number already the user's reads "Es tuyo", without a switch (its movement's detail takes it back, 6.3h); the others keep theirs. "Mantener mi respuesta" replaces "Ninguno es mío", and "Guardar" leaves when no number is left to mark.

As Phase 6.3e builds "Lo que está en juego" (`StakesPanel`), beside the groups, under them on phones:

- **The panel:** a card (`--surface-card`, `--radius-lg`, padding 24) named by its title, "Lo que está en juego" in Section title, with "Usamos nuestra mejor suposición mientras respondes." in Caption `--text-muted`, or "Respondiste todos los grupos de este trimestre." once none is open.
- **Progress:** "2 de 6 respondidos" (Manrope 700 14px) and "24 movimientos pendientes" on the right (Meta `--text-muted`, under it when it doesn't fit), then an 8px bar of `--primary` on `--ring-track` that only repeats them (`aria-hidden`). A group is answered once nothing in it waits.
- **Each open group,** in the review's order, in a list named "Grupos por responder", each with a `--divider` line above it: its name (Manrope 700 14px) and what waits in it on the right, compact and without a sign (Outfit 500 16px: "$6,0M", "$622 mil", where v8 writes "$0,62M"). Under them, in Meta `--text-muted`, what it counts as today in the kinds' words, as an answered group says it, and what its other answer would make the quarter's totals: "Hoy cuentan como movido. Si son compras, tu gasto real sube a $30,4M." Each group weighs the one answer of its own that changes a kind (`whatIf` in `REVIEW_GROUPS`), against the totals Movimientos's tiles add up, with the guesses as they stand, one group at a time: real spending, which counts what went out, else the income ("Si es un ingreso, tus ingresos suben a $49,6M"). When no total would change, only "Hoy…". v8's "Hoy cuentan como inversión" and "Hoy cuenta como tuya" become the kinds' words, and v8's Nequi and corresponsal rows, which say only what they count as, gain their "Si…".
- **Actions:** the Primary "Ver mi resumen" and, while a group is open, the Secondary "Responder después", both to the summary, whose banner brings the user back; then "Recordamos tus respuestas para los próximos extractos." in Meta `--text-muted`. v8's "Puedes cambiarlas en cada movimiento." waits for the detail panel (6.3f).
- An answer refreshes the panel with the page: its group leaves the list, the progress moves on, and the others weigh against the new totals.

### Recurring payments ("Pagos fijos")

As Phases 6.5b and 6.5c build `v8-04` (`RecurringTiles`, `RecurringList`, `RecurringRow`, `MonthBars`, `PaymentsCalendar`, `HowWeFindThem`), for the account and period in the URL, with the period controls:

- **The page:** "Pagos fijos" with "Lo que se repite cada mes. Encontramos 7 gastos fijos y 2 pagos que se repiten pero no son gasto.", the controls, the tiles, then a row (§7): the payments' card in the main column, and this month's calendar over "Cómo los encontramos" in the side one, under it on phones. The rows are the payments the period's last month with movements expects: those paid in it and, while its movements don't reach its last day, those of the month before, which may still come.
- **Tiles** (`RecurringTiles`, 6.5c): a list named "Lo que pagas", `repeat(auto-fit, minmax(190px, 1fr))` with 16px gaps, so they stack on phones. Each is a `tile` card with a 44px neutral chip (`--surface-muted`, ink icon at 1.7), its label (Body 700), its figure (Amount XL, ink, compact as §4 writes it) and what it means (Caption `--text-muted`): "Pagas al mes" (`calendar`) with each fixed payment's latest month added up ("$2,5M", where v8 writes "$2,46M") and "Sale de tu cuenta aunque no hagas nada."; "Al año" (`repeat`) with twelve of those months and "Lo que suman estos 7 pagos en 12 meses." ("este pago" for one); and, when a payment rose, the one that rose the most, by its percent and then by its money, on the attention surface with a white chip of its category's icon and the 9px orange dot: "EMPRESA DE ENERGIA subió 12%", the rise with its sign, exact ("+$19.700"), and "De $162.300 en julio a $182.000 en septiembre. Revisa tu consumo o la tarifa.", from its first month to its last as its trend measures it. No tiles without fixed payments.
- **The card** (`card`): "Tus pagos fijos" (Section title) with "Ordenados por monto. Las barras muestran julio, agosto y septiembre." (Caption `--text-muted`), its rows, then "Total en septiembre" (Body 700) with what the month's payments added up to in Amount L, in spending's text color. Then "También se repiten, pero no son gasto" with "Plata que pasa a tu tarjeta o a tu ahorro. Sigue siendo tuya.", whose rows have no bars.
- **"Activos · 7 / Ya no aparecen · 1"** (6.5c): when a fixed payment stopped, the filter chips (§9) on the right of the card's title, under it on phones, in a `<nav>` named "Mostrar". The list lives in the URL (`?filter=stopped`), and the period links keep it. "Ya no aparecen" lists the real spending that repeated in the past year and stopped before the page's month (or before the month before it, while the page's month goes on), with "Se repetían cada mes, pero no aparecen en septiembre. Las barras muestran …" and no total; what only moves keeps its own list. A list without payments says "No hay pagos fijos en septiembre." in Caption `--text-muted`.
- **A row:** a `--divider` line above, padding 14px 0. The category's 44px chip, neutral for real spending and in the moved tone for what only moves; who was paid (Body 700) over the bank's text as printed (Meta `--text-muted`, `pre-wrap`), "También: “PAGO PSE Electrificadora de S”." for its other texts, "2 cuotas: $1.540.000 y $311.000." when its month held several, and, in Meta `--text-muted`, "Aún no aparece en octubre." for a payment still expected in the page's month or "Último pago el 10 de agosto." for one that stopped; "Mensual · día 5" or "Mensual · entre el 1 y el 4" (Caption `--text-secondary`) over its channel tags, how its amount moves ("Estable" `ok`, "Subió 12%" `spending`, "Varía poco" and "Monto variable" `neutral`) and "Varios canales" (`info`); from `lg`, its bars; and its amount (Amount S) in the kind's text color with its sign, its latest month's when the page's month hasn't one, or "$48.000 a $2.090.000" when it moves a lot. Under `lg` the amount stays beside the name, at most 128px wide, and the days and tags go under the name.
- **Bars:** three tracks of 12×28px (`--surface-muted`, radius 4), each filled to the month's share of the most of the three: `--spending` for the page's month, at 40% before it; the short month under each (10px, `--text-muted`). They are one `role="img"` named "Lo pagado cada mes: Julio $162.300, Agosto $170.000, Septiembre $182.000" ("sin pago" for a month without), hidden under `lg`.
- **This month's calendar** (`PaymentsCalendar`, 6.5c): a `card` named by its title, today's month in Bogotá ("Octubre", Section title) with "Cuándo sale cada pago. Hoy es 20 de octubre." (Caption `--text-muted`), while the page's month is this one or the one before; none for an older period. Under the weekdays ("L M M J V S D", Meta 600 `--text-muted`), seven columns of square days 6px apart, radius 10, Manrope 14px: a fixed payment's range of days on `--spending-soft` (600, ink), its single day with a 6px `--spending` dot under the number, the 31st on a shorter month's last day, and today on `--primary` (700, white, the dot white). The grid is one `role="img"` named "Cuándo sale cada pago en octubre: Financiera Andes S, del 2 al 4; …", the earliest first. Below, the legend ("Rango de días", "Día fijo", "Hoy", Meta `--text-muted`, with swatches), and, once the page shows this month's movements, each fixed payment that hasn't appeared though its days began, the earliest first, on `--surface` (`--radius-md`, padding 14, `--shadow-chip`) with the 10px orange dot and its 4px halo: "Pendiente: GAS NATURAL CIUDAD, del 8 al 12." (Manrope 700 14px) over "Aún no aparece. Unos $31 mil, por transferencia o PSE." (Caption `--text-muted`, its latest month compact, its channels as running text writes them); with none, "Nada pendiente hasta hoy.". Without this month's movements it says nothing of what's pending, so it never claims a payment didn't come.
- **"Cómo los encontramos":** a card with the `info` chip on `--primary-soft`, its title (Body 700) and "Un pago es fijo si aparece al menos 3 meses seguidos, …" (Caption `--text-secondary`). v8's "¿Falta alguno? Márcalo como fijo" waits for a phase that marks payments by hand.
- **Empty:** before any movement counts, the page's empty state; a period without fixed payments, "No hay pagos fijos en este periodo" with "Ir a Subir".
- The titles in plain words ("Energía", "Pendiente: gas") and their own icons come with 8.6; v8's legend names the payment due today ("Hoy · gimnasio"), which the calendar's name already says.

### Categories ("Categorías")

As Phase 6.8a builds `v8-05` at `/categories`, for the account and period in the URL:

- **The top:** "Categorías" with "En qué se fue tu gasto real y a dónde se movió lo demás.", the color legend and the period controls of the other pages. Before any movement counts, the page's empty state ("Aún no hay categorías", with "Ir a Subir").
- **The row:** "Tu gasto real por categoría" in the main column (§7), and in the side one, under it on phones, "Movido no es gasto", the gateways' insight tile and "Tus reglas".
- **"Tu gasto real por categoría"** (`card`): its title over "$24,4M en el trimestre, de mayor a menor. Toca una para ver sus movimientos." ("en agosto" for a month; "No hubo gasto real en este periodo." without any). One row per category of real spending, the largest first, each with a `--divider` line above it: the category's 44px chip, neutral (`--surface-muted`, ink icon); its name (Body 700) and what it took on the right (Outfit 500 16px; a million or more compact and less exact, as the account card's boxes write it); an 8px bar on `--ring-track`, filled from `--spending` at 60% to `--spending` as far as its share of the largest category, a sliver at least; in Meta `--text-muted`, "19% de tu gasto real · 3 movimientos · PSE": its share ("menos del 1%" for a sliver), its count and the channels its money went out through, the most used first; and a `chevron-right` (16px, `--text-muted`) on the right. Since 6.8b the name is a link stretched over the row, as Movimientos's rows are, with the focus ring around the row: it opens the category's detail (below) in the same account and period. "Movido no es gasto"'s rows open nothing, as v8 draws them.
- **"Movido no es gasto"** (`card`): "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo." (only what happened, or "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas."), then one row per place money only went, the most first: the 44px chip in the moved tone, "A tu inversión", "A tus cuentas" or "Pago de tarjetas", the amount with its sign in moved's text color ("−$22,0M"), and a `--moved` bar against the most; then "Volvió de tus cuentas" with "+$2,8M" and "Plata tuya que regresó: no es ingreso." in Meta, without a bar.
- **Payments through gateways:** when some went out, the insight tile (above) on the attention surface, in its insight's words: "6 pagos sin tienda identificada", "$600.000" and the way to name them in Movimientos.
- **"Tus reglas"** (`card`): "Lo que respondiste en la revisión o corregiste en Movimientos, aplicado a todos tus extractos.", then each of the user's rules, the bank's texts in alphabetical order and then the numbers: the 44px neutral chip with `tag`, the text as folded ("TRANSF A ANA LUCIA MAR") or the number ("ref ••• 1270") in Meta `--text-muted`, and, after a `chevron-right`, what it says in Caption 700: "Si sale: Entre tus cuentas · movido", "Si entra: Consignaciones · ingreso", a number's without a direction. Without rules, "Aún no tienes reglas. Las crean tus respuestas en la revisión y tus correcciones en Movimientos." v8's "Ver y editar tus reglas" waits for a page that edits them (decided with the human).

### A category's detail

As Phases 6.8b and 6.8c build `v8-06` at `/categories/<category>` (`CategoryTitle`, `CategoryTiles`, `WeeklyChart`, `TopPlaces`, `CategoryMovements`, `CategorySettings`), for the account and period in the URL. Only categories of real spending have one; any other is not found.

- **The top:** the link action "Categorías" with a 16px `chevron-left`, back to Categorías in the same account and period; then the category's 44px chip in spending's tones beside its name (the page's H1) over "Gasto real · julio a septiembre de 2026" ("agosto de 2026" for a month; `--text-muted`); then the period controls of the other pages, whose links keep the category. The dock lights Categorías.
- **The tiles** (a list named "Lo que se fue en esta categoría"): `tile` cards, each with its 44px chip, its label (Body 700), its figure (Amount XL) and what it means (Caption `--text-muted`). "Total del trimestre" ("Total de agosto") with the category's chip and its figure in spending's text color: "$2,4M" (a million or more compact and less exact, as the boxes write it), "31 movimientos · 10% de tu gasto real.", the same share as its row in Categorías. "Promedio por movimiento" with `tag` on a neutral chip and its figure in ink, to the peso ("$75.852"), with "El más alto: $186.000, el 12 de agosto." (the first of a tie), or "Un solo movimiento, el 12 de agosto."; v8's "en un restaurante" waits for 8.6. For a quarter, "Por mes" with `calendar`: a box per month the account has movements in (`--surface-muted`, `--radius-sm`, padding 10px 12px), the month in Meta `--text-muted` over what the category took in Body 700 ("$710 mil", "$1,0M", "$0", compact as §4 writes it), the month it took the most on the attention surface when there are several, which screen readers hear as "el mes con más". The tiles stack on phones, go two by two from `sm` with "Por mes" under them at full width, and three in a row from `xl`, where a third of the row holds its three boxes. A month has no "Por mes", and a period without the category's movements has no tiles.
- **The rows** (§7): "Semana a semana" beside "Dónde más" (6.8c), then "Movimientos de esta categoría" beside "Ajustes de esta categoría"; on phones, one under the other in that order. Without the category's movements in the period, no chart and no places.
- **"Semana a semana"** (chart card, 6.8c): "Cada punto es lo que gastaste en esa semana. Si sube, algo cambió." and the legend "Gasto por semana" (solid `--spending` swatch). Weeks of seven days from the period's first, the last one shorter, through the account's last day with movements: a `--spending` line of 2.4px over its area (18% to nothing) and an 8px dot a week. Days under it: a quarter's months and last day ("1 jul" … "30 sep"), or a month's weeks. The week that took the most stands out when it took half again a normal week (the middle one), or when most weeks took nothing: "Semana del 5 de agosto: $410.000" over "9 movimientos. Una semana normal es de $210 mil." (decided with the human) or "1 movimiento. La mayoría de las semanas no tuvo gasto en «Efectivo»."
- **"Dónde más"** (`card`, 6.8c): "Juntamos las formas en que el banco escribe el mismo lugar.", then up to five places, the most money first: who was paid as the bank last wrote it, after its channel's words ("APP DOMICILIOS"), a number by its channel ("Nequi ••• 1270"), or the whole text when it names no one; what it took; Categorías's bar against the most; and "22 movimientos · COMPRA EN APP DOMICILIOS · también PAGO QR APP DOMICIL" (Meta `--text-muted`, as printed). A cut name joins the longest one it starts, as in Pagos fijos (`placesOf`); names that start differently stay apart ("REST EL FOGON", "EL FOGON"). "Y 3 lugares más: $45 mil." when more are left. v8's plain names wait for 8.6.
- **"Movimientos de esta categoría"** (`card`): "Los más recientes primero.", or "No hubo gasto en «Efectivo» en este periodo." Its four newest movements, each as Movimientos draws a row (§9): the chip in spending's tones, the bank's text as printed, as a link stretched over the row that opens its detail in Movimientos among the category's movements; under it the day ("27 de septiembre", Caption `--text-muted`) and its tags, the channel and "Por revisar" while it's a guess; and the amount with its sign, neutral and in ink while it's a guess. The bank's `0` reads "Sin descripción del banco". v8's plain-language titles ("Domicilio de comida") wait for 8.6. The footer: "Mostrando 4 de 31" (Meta `--text-muted`) and the link action "Ver los 31 movimientos" ("Ver en Movimientos" for one), to Movimientos with the category (below).
- **"Ajustes de esta categoría"** (`card`): a box (`--surface-muted`, `--radius-md`, padding 16) with "Cuenta como gasto real" (Body 700) over "Efectivo siempre suma a tu gasto real." (Caption `--text-muted`); then the 44px neutral chip with `tag` beside "2 reglas tuyas" ("1 regla tuya", or "Sin reglas tuyas"; Body 700) over the user's rules that give the category, as "Tus reglas" orders them, up to three then "y 2 más" (Meta `--text-muted`, as the bank prints them), or "Las crean tus respuestas en la revisión y tus correcciones en Movimientos." v8's "Mover movimientos a otra categoría" and "Ver reglas" wait for a phase that moves movements or edits rules (decided with the human).

### Coverage timeline

The months the user has, on the upload screen, the upload result and the profile: one rounded segment per month (8px tall, 6px apart) with the month below (Meta), and a legend:

| Segment                                     | Color                                        |
| ------------------------------------------- | -------------------------------------------- |
| Quarterly statement, verified               | `--status-ok`                                |
| Also in movements exports (a line below it) | `--moved`, 4px                               |
| Without balance to verify                   | stripes of `--text-faint` and `--chart-axis` |
| Missing                                     | `--ring-track`                               |

### Drop zone

On the upload screen, inside the card "Elige uno o varios archivos": `--radius-md`, a 2px dashed border in `--primary` at 30%, padding 40px 20px, centered. A 72px `--primary-soft` circle with the `upload` icon (28px, `--primary`), the title "Arrastra tus extractos aquí" (Outfit 500 24px), the Primary "Elegir archivos" button with `file-text`, and a caption with the size limit and where files are read. While files are dragged over it, the border turns solid `--primary` on `--primary-soft`. The button is the way in with a keyboard and on phones; a file dropped elsewhere on the page is ignored, so the browser never opens it. The welcome's last step (below) shows the same zone in a card "Súbelos aquí": the files chosen there go to the upload screen, which reads and sends them (`UploadShortcut`).

### File row

One per chosen file, in a list with dividers: a 44px icon chip (`--surface-muted`, `file-spreadsheet` in ink), the file name (Manrope 700 15px, cut with an ellipsis; it never leaves the browser) and "Quitar" on the right (link action, with an `aria-label` that names the file; the focus then goes back to "Elegir archivos"). Under the name, announced politely:

- Waiting or being read: the step, in Caption `--text-muted` ("Leyendo el archivo…").
- Read: the tags (bank, format, file type and period: "jul–sep 2026" for a statement's own period, "1–15 ago 2026" for a range of movements), then the count ("33 movimientos").
- With a problem: the row sits on the attention surface (`#FFF6EF`, `--radius-md`, reaching past the row so the chips stay aligned), the chip turns white with the 9px orange dot, and it says what happened (Manrope 700 14px) and what to do (Caption), as `v8-13` does.

Below the list, a Primary "Subir N archivos" for the files read whose account is settled: a movements export that has to ask waits for the choice. The files go up one at a time; each row keeps its tags and adds a line in Caption 600 `--text-secondary` ("Subiendo…", then "Subido · en cola para procesar"), without "Quitar" once it's on its way. Meanwhile the button reads "Subiendo…" and keeps its focus (`aria-disabled`, faded like a disabled button). A file that got no answer sits on the attention surface ("No se subió") with a "Reintentar" link action under its text. Once sent, the same line follows its job every 2 seconds: "Procesando…", then the row becomes the upload result below; a job that failed sits on the attention surface with what happened, one message per error code as `v8-13` writes them ("No pudimos leer este archivo", "No alcanzamos a procesarlo"), and one open for more than 2 minutes adds a Caption `--text-muted` line: "Está tardando más de lo normal; seguimos revisando." After a reload, the jobs the URL's fragment kept come back as rows named by format and period ("Extracto trimestral jul–sep 2026"), since a file's name never leaves the browser. When the screen stops asking (3 failures in a row, or 10 minutes without a change), a Caption `--text-secondary` line below the list says so, with a "Revisar de nuevo" link action, in a `role="status"` region. When the month's statements run out, the button stays disabled with a caption: "Llegaste al límite de este mes. Se renuevan el 1 de noviembre."

### Upload result

A processed file's row in the list, as `v8-08` shows it within Stage 5 (`UploadResult`):

- Header: a 44px chip (`--income-soft` with `circle-check` in `--income-on-soft`), the outcome as Card title ("Listo: leímos tu archivo", "Ya tenías todo este archivo", "Listo: reemplazamos el extracto que no cuadraba"), the file's name in Caption `--text-muted` (its format and period after a reload) and its tags.
- Count tiles: `--surface-muted`, `--radius-md`, padding 12px 16px; the number in Amount L with `tabular-nums` and its meaning in Caption `--text-muted`: "movimientos en el archivo", "ya los tenías: no se duplican", "nuevos". Three columns, two on phones.
- The status pill: "Saldo verificado" · "33 movimientos cuadran", "Sin saldo para verificar" · "Archivo de movimientos" (`--text-faint` dot) or "No cuadra por $810" · "Revisa el archivo". A verified quarterly statement that opens with the closing balance of the account's previous one reads "Encadenado" · "Empieza donde terminó abr–jun 2026", whichever was uploaded first.
- The steps, in order: "Leído en tu navegador", "Reconocido", "Revisando duplicados" and the balance check. Each has a 24px mark (`--income-soft` with a check), its title (Manrope 700 14px) and one Caption `--text-muted` line, joined to the next by a 1px `--divider` line.
- A statement that doesn't reconcile sits on the attention surface: white chip with the orange dot, the title "El saldo final no cuadra por $810", "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre.", only the file's count (nothing of it counts), white tiles, and its balance step marked with the orange dot on `--spending-soft`.

### Uploaded files

"Archivos subidos", beside the upload card on the upload screen (below it on phones), once the user has sent a file (`UploadedFiles`, `v8-07`): a card with its title, "Los más recientes primero." and one row per file sent, newest first, each with a `--divider` line above it.

- Each row: the 44px file chip, the file named by format and period in Card title with `text-wrap: balance` ("Extracto trimestral jul–sep 2026"; its name never leaves the browser), one Caption `--text-muted` line with what came of it, and a badge on the right, under the text on phones:

| What came of it                          | Line                                           | Badge                         |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------- |
| A quarterly statement that reconciles    | "Excel · 379 movimientos · cuadra al centavo"  | "Verificado" (`ok`)           |
| One that starts where the previous ended | "Excel · 355 movimientos · encadenado"         | "Verificado" (`ok`)           |
| A movements export with new movements    | "Excel · 21 nuevos · sin saldo para verificar" | "Sin verificar"               |
| A file the account already had           | "Excel · 63 ya los tenías · nada nuevo"        | "Sin cambios"                 |
| A statement that doesn't reconcile       | "Excel · 33 movimientos · no cuadra por $810"  | "No cuadra" (`attention`)     |
| A failed job                             | What happened, as its error code says it       | "No se procesó" (`attention`) |
| A job still open                         | "Excel"                                        | "En proceso"                  |

- The first 5 rows show; a link action "Ver N más" shows the rest (the latest 30) and then reads "Ver menos", with `aria-expanded` and the focus kept on it.

### Welcome (onboarding)

As Phase 5.8 builds `v8-15` to `v8-17`, at `/onboarding`, where Clerk sends a new account: signed in, without the app's header and dock, in the waitlist's 1120px column.

- **Header:** the logo, which links nowhere; "Paso 1 de 3" in Caption `--text-muted` and the link action "Saltar" (read "Saltar la bienvenida"), which goes to the upload screen from every step. Below, three 6px segments 8px apart, at most 420px wide (the full width on phones): `--primary` up to the current step, then `--chart-axis`, since `--ring-track` vanishes on the page's background. They only repeat the step's text (`aria-hidden`).
- **Step 1:** the Landing headline, the subtitle in Body `--text-secondary` (18px from `sm`), what works today as a list with neutral 44px chips (`--surface` at 80% with `--shadow-chip`, ink icons), and the Primary "Empezar" with "Gratis. Sin conectar tu banco: tú subes el archivo." beside it. Beside them from `lg`, below on phones, an example panel: the neutral badge "Ejemplo", "Julio a septiembre", the three kinds of an invented quarter (each on `--surface` with `--radius-md` and `--shadow-card`: its ring, its label in Manrope 700 14px and its total in its kind's text color, 18px on phones and Amount L from `sm`), then the statement object and the verified status pill. The rings came back with the summary (6.7a).
- **Step 2:** a card at most 820px wide whose page title is the question. Each file is a radio card (`--surface`, `--radius-md`, `--shadow-card`, padding 20): a 44px chip, `--primary-soft` with a `--primary` icon once chosen and `--surface-muted` with ink before; the title in Body 700, with the `ok` badge "Recomendado" on the quarterly statement; its line in Caption `--text-muted`; and, once chosen, a 2px `--primary` border and a 24px `--primary` circle with a white check. The radios are native, so the arrow keys move the choice, and the focus ring goes around the card. Then "No te pedimos tu nombre…" in Caption `--text-secondary` on `--primary-soft-2` (radius 16, padding 16, `user-round` in `--primary-strong`), and a Secondary "Atrás" and a Primary "Continuar" at each end.
- **Step 3:** two cards side by side from `lg` (5:4), stacked on phones: the guides (the page title; a subtitle that follows the step 2 choice; one `--surface-muted` panel per file, the chosen one first, with its icon, its name in Body 700 and its numbered steps, 28px `--primary-soft` circles with `--primary-strong` numbers) and "Súbelos aquí" with the drop zone.

### Switch

For "Es mío", the email notices and "Permitir la medición de uso" in the profile: `--primary` when on, `--ring-track` when off, always with a visible label.

As Phase 6.3d builds it (`Switch`, `components/ui/switch.tsx`, on Base UI): a 44 × 26 pill with a 20px white thumb and `--shadow-chip`; off, the track is edged in 1.5px `--text-faint`, as the checkbox (3.7:1 on white, which a control's edge needs). Its visible label sits beside it, Manrope 700 14px, inside a `<label>` that wraps it, and it's named by what it changes ("Es mío: Nequi terminado en 1270"). Its hidden input sends its value with the form when it's on; its hit area reaches 44px.

### Analytics consent

v8 doesn't draw it; as Phase 7.4a builds it (`features/analytics/`, ADR 0029), only where PostHog has a key:

- **The notice** (`ConsentNotice`): once per browser on the app's pages, until answered. Fixed above the dock, so the page doesn't move when it appears after hydrating: 10px above the phone's bottom bar, 8px from each side, and from `sm` 14px above the dock, centered, at most 560px wide. `--surface`, `--radius-lg`, padding 20, `--shadow-panel`; the title in Outfit 600 18px ("¿Nos dejas medir cómo usas Xtrakto?"), the line in Caption `--text-secondary` with "tu perfil" as an inline link (`--primary`, 700, underline on hover), then "Sí, acepto" and "No, gracias", small Secondary buttons of the same weight. A region named by its title; once answered it goes, and the focus goes to the page's `main`.
- **"Medición de uso"** (`AnalyticsSetting`) in the profile's side column: a card with its line and the switch "Permitir la medición de uso", disabled until the browser has read the answer.

### Text field

As the waitlist design draws it (`Input`): `--surface`, a 1px `--chart-axis` border, radius 12px, 48px tall, padding 0 16px, `--text` with a `--text-muted` placeholder, and 16px text on phones (15px from `sm`), so iOS doesn't zoom in. Its `<label>` sits above it (Caption, 700, `--text`). An error turns the border `--danger` and shows below in Caption 600 `--danger`, joined to the field by `aria-describedby`, with `aria-invalid`. The focus ring is the global one. The chat input keeps its pill.

### Checkbox

22px, radius 6px, a 1.5px `--text-faint` border on `--surface` (3.7:1, enough for a control's edge), and `--primary` with a white check when on (`Checkbox`, Base UI). Never checked by default. A long label wraps it, so the text toggles it too.

### Waitlist page

The landing of the human's design, `/waitlist`, max width 1120px:

- **Header:** the logo, which links nowhere, and a Secondary small "Unirme a la lista" ("Unirme" on phones) that leads to the form's card (`#lista`).
- **Hero:** the `info` badge "Para extractos de Bancolombia · Muy pronto", the Landing headline with "gastaste" in `--spending` text and "moviste" in `--moved` text (their kinds' colors, with their words), and the pitch in Body `--text-secondary` (18px from `sm`).
- **"Tu trimestre, de un vistazo":** a tile with "Ejemplo con datos ficticios" (Meta `--text-muted`), a 12px bar of what went out (real spending, then moved, `role="img"` with its reading), and three figures (Entró, Gasto real, Solo movido) in their kinds' text colors, the label in Meta 700 and the amount in Amount L.
- **"Míralo en un minuto":** the promo video, 16:9, at most 640px wide, `--radius-lg`, `--shadow-panel`; its poster until a 64px `--primary` circle with a play icon is pressed (nothing downloads before), then the browser's controls, with the focus on the video and a description for screen readers. Never plays on its own.
- **"Lo que vas a poder hacer":** three cards (`--surface`), each with a small visual (the kinds' three dots, the raw-text chip, the privacy chip), a title in Outfit 600 22px and its line in Body `--text-secondary`.
- From `lg`, the form's card sits beside the hero and its example; on phones, one column: hero, form, example, video, benefits.

### Waitlist form

The consent sits in a `--primary-soft-2` panel (radius 16, padding 16): the box, the consent in Caption `--text-secondary`, and the deletion line in `--text-muted`. Until the box is checked, the full-width primary button is grey (`--chart-axis`, `--text-secondary`, no shadow), focusable, with "Marca la casilla para poder enviar." below it in Caption `--text-muted` as its description. A failure sits on the attention surface with its dot, saying what to do. "Ya estás en la lista" is a centered card with an 80px `--income-soft` circle and its check, then the deletion line below it.

### Privacy page

v8 doesn't draw it; as Phase 7.5 builds it (`/privacy`, public): the waitlist's frame (its header without the action, and its footer, which links the page beside the contact), and a 760px column: the page title ("Cómo cuidamos tus datos") with one line in Body `--text-secondary` and the date it took effect in Caption `--text-muted`, then one `card` with the sections 32px apart, each an h2 in Outfit 600 18px over its paragraphs and its bulleted list in Body `--text-secondary` (`--text-faint` bullets). The contact address is a link wherever it's named. The analytics notice and "Medición de uso" link it too.

### CSV downloads

As Phase 7.6 builds them (`CsvDownloadButton`, `components/csv-download/`): a Secondary button with `file-down` that asks the server for the file and hands it to the browser. While it waits it reads "Preparando el archivo…", keeps its focus and can't be pressed again; a failure shows below it in Caption 600 `--danger` with `role="alert"`. Movimientos puts "Descargar CSV" after the period controls, as their action (full width on phones); the profile's "Privacidad y datos" has "Descargar mis datos (CSV)", before the deletion.

### Profile ("Tu perfil")

`/profile`, as Phase 7.7a builds `v8-11`: the page title ("Tu perfil") with its subtitle, then a main column and a side one (§7), which phones stack. Their cards' titles are Section titles (Manrope 700 18px).

- **"Privacidad y datos"** (`PrivacyAndData`, main column): a `card` with three facts, side by side from `md` and stacked below, each on `--surface-muted` (`--radius-sm`, padding 16) with its 18px icon and title in Manrope 700 14px and one Caption `--text-muted` line: "No guardamos tus archivos" (`eye-off`), "Teléfonos de terceros protegidos" (`lock`) and "Sin datos para publicidad" (`shield-check`), saying only what is true today. Below them "Descargar mis datos (CSV)", the line "Borra movimientos, reglas y tu cuenta. No se puede deshacer." in Caption `--text-muted`, and the destructive "Borrar todos mis datos", which the line describes (`aria-describedby`) and which asks in a dialog before deleting; one row from `lg`, stacked and aligned to the left below.
- **"Medición de uso"** (side column), where `v8-11` draws the email notices (10.4).

v8 draws more than the MVP brings: the coverage timeline ("Tus datos") comes with 10.2, the email notices with 10.4, "Preguntas hoy" with 13 and the PDF limits with 9.

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
- Items: icon 22px above a 14px label, min-width 86px, padding 10px 14px, `--radius-md`. Between `sm` and `md` they go without the minimum, padding 10px, so six fit at 640px.
- Active item: `--primary-soft-2` background, `--primary` text and icon, weight 700, `aria-current="page"`.
- Items: Resumen, Movimientos, Pagos fijos, Categorías, Subir, Pregúntale, Perfil. Each one appears when its screen exists. An item stands for the pages under it, and Resumen for the quick review too, as `v8-02` shows.
- On phones (`NavDock`, since Phase 6.8a brought the fifth item): the bar sits 8px from each side, padding 6, and its items share its width, 2px apart, each label 11px with tight letter-spacing, so five fit at 360px (320px too). From `sm` it is the floating pill above.
- **"Más"** (`MoreMenu`, since Phase 7.7a brought the sixth item): the phone's bar shows Resumen, Movimientos and Subir, then "Más" (`ellipsis`), as `v8-11` does; Pregúntale joins before it. "Más" opens a menu above the bar, aligned to its right edge (`--surface`, `--radius-md`, padding 6, `--shadow-pop`): Pagos fijos, Categorías and Perfil, each a 44px row with its 20px icon and its label in Manrope 600 14px, the page open in `--primary-soft-2` with `--primary` 700 and `aria-current="page"`. "Más" looks active while one of them is open. The arrow keys move through the menu, and Escape closes it and gives the focus back to "Más".

---

## 10. Data visualization rules

1. Color by kind only: income green, spending orange, moved blue.
2. One percentage → a ring. Comparisons over time → lines. No pie charts with more than three slices; use a ranked list instead.
3. Every chart has a title, a one-line reading guide and a legend.
4. Print the values: never make the user read a value off an axis.
5. Highlight at most one event per chart, explained in plain language.
6. Daily interest rows are grouped into one line per month.

---

## 11. Voice and copy

- Spanish (es-CO), addressing the user as **tú**.
- Sentence case everywhere ("Tu extracto, traducido"), except the wordmark and raw bank text.
- Plain words over banking jargon: "Movido", not "transferencias internas"; "Gasto real", not "débitos".
- Every number gets its meaning: "El 58% de lo que salió. Sigue siendo tuyo."
- Actions name the result: "Ver los 21 retiros", "Subir extracto".
- Errors say what happened and what to do, without apologizing: "Este PDF tiene contraseña. Escríbela para abrirlo; no sale de tu navegador."
- A best guess says so: "Creemos que es tu inversión. Confírmalo en la revisión."
- Repeated files and missing balances are facts, not errors: "Ya tenías todo este archivo", "Este archivo no trae saldos".

---

## 12. Accessibility

- Text contrast of at least 4.5:1 (3:1 for 24px and up). Use the verified pairs in section 3.6.
- Touch targets of at least 44×44px.
- Focus ring: `3px solid #2563EB` with a 3px offset, on every interactive element.
- Real `<button>`, `<a href>` and `<input>` with `<label>`. Icon-only buttons have an `aria-label`.
- A field's error is joined to it with `aria-describedby` and `aria-invalid`, and the focus goes to the first wrong field. A button disabled until something happens stays focusable and says why.
- Toggle groups use `role="group"` with `aria-label`, and options use `aria-pressed`. The active navigation item uses `aria-current="page"`, and so do filters that are links, such as the period selector's months.
- Switches use `role="switch"` with a label that names what they change ("Es mío: Nequi terminado en 1270").
- The coverage timeline has a text alternative that states it ("Enero a septiembre completo y verificado; octubre sin saldo").
- Charts have `role="img"` and an `aria-label` that states the conclusion.
- Color is never the only signal: legend, labels and signs always accompany it.
- Respect `prefers-reduced-motion`.

---

## 13. Implementation (Tailwind CSS v4)

```css
/* apps/web/src/app/globals.css */
@import "tailwindcss";

/* `static` emits every token as a CSS variable, used or not, so inline
   styles, charts and third-party components can read them. */
@theme static {
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

  /* Destructive actions and errors only */
  --color-danger: #b91c1c;

  /* Type scale (§4): text-title, text-amount-xl/l/m, text-section, text-body,
     text-caption and text-meta. Each sets its size and line height. */
  --text-title: 34px;
  --text-title--line-height: 1.15;
  --text-title--letter-spacing: -0.01em;
  --text-amount-xl: 34px;
  --text-amount-xl--line-height: 1.1;
  --text-amount-xl--letter-spacing: -0.01em;
  --text-amount-l: 24px;
  --text-amount-l--line-height: 1.2;
  --text-amount-m: 22px;
  --text-amount-m--line-height: 1.2;
  --text-section: 18px;
  --text-section--line-height: 1.3;
  --text-body: 15px;
  --text-body--line-height: 1.5;
  --text-caption: 13px;
  --text-caption--line-height: 1.5;
  --text-meta: 12px;
  --text-meta--line-height: 1.45;

  /* Layout: max-w-page */
  --container-page: 1360px;

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

/* Fonts (variables set by next/font) and shadcn's semantic colors, which
   point at the tokens above: bg-card is the surface, text-muted-foreground
   is ink-muted, ring and primary are the primary blue, destructive is danger. */
@theme inline {
  --font-display: var(--font-outfit), system-ui, sans-serif;
  --font-sans: var(--font-manrope), "Segoe UI", system-ui, sans-serif;
  --color-card: var(--color-surface);
  --color-muted-foreground: var(--color-ink-muted);
  /* … the rest of shadcn's names, in globals.css */
}

body {
  background: linear-gradient(180deg, #eef2f7 0%, #e9eef4 55%, #e2e8f0 100%);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

```tsx
// apps/web/src/app/layout.tsx
import localFont from "next/font/local";

const outfit = localFont({
  src: "../fonts/outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit",
});
const manrope = localFont({
  src: "../fonts/manrope-latin.woff2",
  weight: "200 800",
  variable: "--font-manrope",
});

// <html lang="es" className={`${outfit.variable} ${manrope.variable}`}>
```

Translucent surfaces are written with opacity modifiers: `bg-surface/88` (cards), `bg-surface/60` (panels), `bg-surface/94` (dock).

Spacing needs no tokens: Tailwind's scale is 4px per step, so every value of §7 has a class (`gap-5.5` is 22px, `py-7.5` is 30px). Base components live in `apps/web/src/components/ui/` (shadcn on Base UI, ADR 0015): `Button` and `IconButton`, `Card` (`tile`, `card`, `panel`), `Badge` (one variant per kind, plus `neutral`, `attention` for the attention surface ("No cuadra"), `review` for "Por revisar", `tag`, `ok` for verified states and `info`), `Input` and `Checkbox`. Classes are merged with `cn` from `@/utils/cn.utils` (the shadcn CLI writes that import): it knows the text sizes of this section, and a new `--text-*` token joins its list, or `cn` drops it whenever a text color follows (a test checks they match). The development page `/design-system` shows every token and component.

v8 needs no new color tokens: the grey status dot is `ink-faint`, and the coverage timeline uses `income`, `moved`, `ink-faint`, `chart-axis` and `ring-track`. Each v8 component (§9) is built with its first consumer: `Button` gains the white destructive variant and `Badge` the status badges of §9 then, and the development page shows them.

---

## 14. Pending

- **Dark mode:** not designed yet. When it is, every token above gets a dark value; components keep using tokens only.
- **Phone layout:** follows §7; every v8 screen has a 390px capture (`docs/ui/v8-*-movil.png`), with the bottom tab bar Resumen, Movimientos, Subir, Pregúntale and "Más".
- **States:** ingestion in progress follows the processing steps of `v8-08`; notices and errors follow `v8-13`. The empty states (Phase 4.6) use the statement illustration of §2 in a translucent panel, with one action: "Ir a Subir", a link to the upload screen, the only place where files are uploaded (the welcome's drop zone takes them there); `v8-12` adds the bank's download paths.
- **Screens:** v8 covers every MVP screen, including the quick review, the upload result, the profile and onboarding. `docs/ROADMAP.md` says which phase builds each.
