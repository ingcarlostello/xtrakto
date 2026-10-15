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

Use compact amounts in cards and exact amounts in lists and detail views.

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
| Subscriptions                                 | `repeat`                           |
| Other                                         | `ellipsis`                         |
| To review ("Por revisar")                     | `circle-alert`                     |
| Rules from the quick review                   | `tag`                              |
| Recurring payments                            | `calendar`                         |
| Privacy                                       | `shield-check`                     |
| Upload                                        | `upload`                           |
| Ask / chat                                    | `message-square`                   |
| Summary                                       | `layout-grid`                      |
| Transactions                                  | `list`                             |
| Categories                                    | `chart-pie`                        |
| Notifications                                 | `bell`                             |
| Profile                                       | `user`                             |
| Assistant                                     | Custom open-ring arrow (see Brand) |

An unclassified movement shows the icon of its best guess in neutral ink.

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

| Variant     | Spec                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary     | Pill, `--primary` background, white Manrope 700 15px, min-height 50px, padding 0 22px, `--shadow-primary`, icon 18px on the left                                                                        |
| Secondary   | Pill, `--surface` background, `--text` Manrope 600, `--shadow-chip`                                                                                                                                     |
| Icon button | 44px circle, `rgba(255,255,255,0.8)`, `--shadow-chip`, icon 19px; always with `aria-label`                                                                                                              |
| Link action | Manrope 700 14px, `--primary`, no underline; underline on hover                                                                                                                                         |
| Destructive | Pill, `--surface` background, `--danger` Manrope 700 text and `trash-2` icon, `--shadow-chip` ("Borrar todos mis datos"). The confirmation dialog's confirm button is filled `--danger` with white text |
| Answer      | Quick review answers: the suggested one as Primary, the others as Secondary, then a caption "Sugerido: la primera"                                                                                      |

### Period selector

- **Quarter picker:** white pill button (`--shadow-chip`, `calendar` icon, the quarter "Jul – sep 2026", chevron). It opens a popover (`--surface`, `--radius-md`, `--shadow-pop`) that lists the quarters with their status badge ("Verificado", "Sin verificar") and "Año 2026" with its coverage ("9 de 12 meses"); "Año" adds up the quarters the user has. The selected quarter has a `--primary-soft` background and `--primary-strong` text.
- **Months:** a segmented control with the quarter's three months and "Trimestre", the default. Pill container `rgba(255,255,255,0.8)` with 5px padding and `--shadow-chip`. Options: pill, min-height 40px, padding 0 16px, Manrope 600 14px `--text-muted`. Active: `--primary-soft` background, Manrope 700, `--primary-strong`.

### Filter chips

Pill, min-height 38px, padding 0 14px, Manrope 13px. Inactive: `--surface-muted`, `--text-secondary`, 600. Active: `--primary-soft`, `--primary-strong`, 700, `aria-pressed="true"`. A chip can carry its count ("Por revisar · 24").

### Stat card

- `--surface-card`, `--radius-md`, padding 20, `--shadow-card`, gap 12.
- Header: icon chip (38px, kind soft background, kind-colored icon) + label (Manrope 700 15px) on the left; **progress ring** on the right.
- Ring: 58px, radius 26, stroke 6, track `--ring-track`, progress in the kind's graphic color, round caps, starting at 12 o'clock; percentage in the center (Outfit 500 14px).
- Amount: Amount XL.
- Explanation: Caption, `--text-muted`, one sentence.
- Action link that names the destination ("Ver en qué gastaste").

### Kind total tile

On Movimientos: icon chip 44px with the kind's soft background, the label, the total in Amount L with its sign and the kind's text color, and the count ("41 movimientos"). Moved shows both directions: "−$29,8M · +$2,8M", "57 salieron · 8 volvieron".

### Account card

- `--surface-panel`, `--radius-lg`, padding 22, `--shadow-panel`.
- Left: label "Saldo al 30 de septiembre", balance (Amount XL), account name with the number masked to its last 4 digits ("Cuenta de ahorros · Bancolombia ••••8821"), two small boxes with the bank's own figures ("Saldo promedio", "Intereses pagados"; `--surface`, `--radius-sm`), then the status pill.
- Right: statement object illustration, about 112×160px.

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
- Explanation (13px, `--text-secondary`), then the channel tag and any badge ("Por revisar", "Subió").
- Amount (Amount S) in the kind's text color, with its sign, right-aligned in a 128px column.
- Unclassified rows: neutral icon chip and ink amount (§3.4), with "Por revisar".
- The daily interest rows of a month are one row ("Intereses de septiembre", "30 abonos diarios, agrupados en una línea").
- A raw text of `0` is titled "Sin descripción del banco", with a link to name it.
- On Movimientos the rows are grouped by day, each header with the day's balance ("Saldo del día $6.482.310"), and a row opens a detail panel: "Así lo escribe el banco", "También aparece como" (the other ways the bank wrote it), channel, reference, source files, balance after, kind and category with the reason ("Regla del sistema, sin IA").

### Channel tag

A small tag on each movement: pill, `--surface` background, 1px `--chart-axis` border, Manrope 600 11px `--text-secondary` (`Badge` variant `tag`, which a file's tags use too). It comes from the bank's text:

| Tag              | Bank text                |
| ---------------- | ------------------------ |
| PSE              | `PAGO PSE`               |
| Llave Bre-B      | `PAGO LLAVE`             |
| QR               | `PAGO QR`, `TRANSF QR`   |
| Nequi            | `TRANSFERENCIAS A NEQUI` |
| Cajero           | `RETIRO CAJERO`          |
| Corresponsal     | `CORRESPONSAL`           |
| Débito           | `COMPRA EN`              |
| Sucursal virtual | `PAGO SUC VIRT`          |
| Transferencia    | `TRANSF A`, `TRANSF DE`  |

### Badges

Pills without a border, Manrope 600 12px, on a soft background:

| Badge                                           | Background        | Text                 |
| ----------------------------------------------- | ----------------- | -------------------- |
| Por revisar (`circle-alert`)                    | `--spending-soft` | `--spending-on-soft` |
| Subió (`arrow-up-right`)                        | `--spending-soft` | `--spending-on-soft` |
| Estable, Verificado                             | `--income-soft`   | `--income-on-soft`   |
| Varios canales, Completado, Muy pronto (`info`) | `--primary-soft`  | `--primary-strong`   |
| Monto variable, Sin verificar                   | `--surface-muted` | `--text-secondary`   |

### Raw-text chip

The bank's text exactly as printed, for the quick review, the profile and the detail panel: `--surface`, 1px `--ring-track` border, radius 8, padding 4px 10px, monospace 12px (§4), `white-space: pre`. Repeats show as "×3" beside it.

### Review banner

On the summary while review groups are pending: the attention surface (`#FFF6EF`), `--radius-lg`, a white icon chip with the 9px orange dot, a title with the count ("Tienes 4 grupos por revisar (24 movimientos)"), one line ("Mientras tanto usamos nuestra mejor suposición. Confírmalos: pueden cambiar tu gasto real.") and a Primary "Revisar ahora".

### Review group card

The quick review asks one question per group:

- **Open:** `--surface-card`, `--radius-lg`, padding 24. Neutral icon chip, the question as card title ("¿Qué son estos pagos con llave (Bre-B)?"), one line of context, the amount at stake and its count on the right (Amount S, ink), the raw-text chips of the group, and the answers (Answer buttons, §9). A group of references (Nequi numbers) lists each one with its count and total and an "Es mío" switch, then "Guardar" and "Ninguno es mío".
- **Answered:** collapses to one line on `--surface-card`: a check icon chip (`--income-soft`), the group and what it now counts as ("Son tuyas: 5 movimientos cuentan como movido.") and a "Cambiar" link.
- Beside the groups, the panel "Lo que está en juego": progress ("2 de 6 respondidos"), each open group with its amount and what the answer would change ("Si son compras, tu gasto real sube a $30,4M"), and "Ver mi resumen" / "Responder después".

### Coverage timeline

The months the user has, on the upload screen, the upload result and the profile: one rounded segment per month (8px tall, 6px apart) with the month below (Meta), and a legend:

| Segment                                     | Color                                        |
| ------------------------------------------- | -------------------------------------------- |
| Quarterly statement, verified               | `--status-ok`                                |
| Also in movements exports (a line below it) | `--moved`, 4px                               |
| Without balance to verify                   | stripes of `--text-faint` and `--chart-axis` |
| Missing                                     | `--ring-track`                               |

### Drop zone

On the upload screen, inside the card "Elige uno o varios archivos": `--radius-md`, a 2px dashed border in `--primary` at 30%, padding 40px 20px, centered. A 72px `--primary-soft` circle with the `upload` icon (28px, `--primary`), the title "Arrastra tus extractos aquí" (Outfit 500 24px), the Primary "Elegir archivos" button with `file-text`, and a caption with the size limit and where files are read. While files are dragged over it, the border turns solid `--primary` on `--primary-soft`. The button is the way in with a keyboard and on phones; a file dropped elsewhere on the page is ignored, so the browser never opens it.

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

### Switch

For "Es mío" and the email notices: `--primary` when on, `--ring-track` when off, always with a visible label.

### Text field

As the waitlist design draws it (`Input`): `--surface`, a 1px `--chart-axis` border, radius 12px, 48px tall, padding 0 16px, `--text` with a `--text-muted` placeholder, and 16px text on phones (15px from `sm`), so iOS doesn't zoom in. Its `<label>` sits above it (Caption, 700, `--text`). An error turns the border `--danger` and shows below in Caption 600 `--danger`, joined to the field by `aria-describedby`, with `aria-invalid`. The focus ring is the global one. The chat input keeps its pill.

### Checkbox

22px, radius 6px, a 1.5px `--text-faint` border on `--surface` (3.7:1, enough for a control's edge), and `--primary` with a white check when on (`Checkbox`, Base UI). Never checked by default. A long label wraps it, so the text toggles it too.

### Waitlist form

The consent sits in a `--primary-soft-2` panel (radius 16, padding 16): the box, the consent in Caption `--text-secondary`, and the deletion line in `--text-muted`. Until the box is checked, the full-width primary button is grey (`--chart-axis`, `--text-secondary`, no shadow), focusable, with "Marca la casilla para poder enviar." below it in Caption `--text-muted` as its description. A failure sits on the attention surface with its dot, saying what to do. "Ya estás en la lista" is a centered card with an 80px `--income-soft` circle and its check, then the deletion line below it.

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
- Items: Resumen, Movimientos, Pagos fijos, Categorías, Subir, Pregúntale, Perfil. Each one appears when its screen exists.

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
- Toggle groups use `role="group"` with `aria-label`, and options use `aria-pressed`. The active navigation item uses `aria-current="page"`.
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

Spacing needs no tokens: Tailwind's scale is 4px per step, so every value of §7 has a class (`gap-5.5` is 22px, `py-7.5` is 30px). Base components live in `apps/web/src/components/ui/` (shadcn on Base UI, ADR 0015): `Button` and `IconButton`, `Card` (`tile`, `card`, `panel`), `Badge` (one variant per kind, plus `neutral`, `attention`, `tag`, `ok` for verified states and `info`), `Input` and `Checkbox`. The development page `/design-system` shows every token and component.

v8 needs no new color tokens: the grey status dot is `ink-faint`, and the coverage timeline uses `income`, `moved`, `ink-faint`, `chart-axis` and `ring-track`. Each v8 component (§9) is built with its first consumer: `Button` gains the white destructive variant and `Badge` the status badges of §9 then, and the development page shows them.

---

## 14. Pending

- **Dark mode:** not designed yet. When it is, every token above gets a dark value; components keep using tokens only.
- **Phone layout:** follows §7; every v8 screen has a 390px capture (`docs/ui/v8-*-movil.png`), with the bottom tab bar Resumen, Movimientos, Subir, Pregúntale and "Más".
- **States:** ingestion in progress follows the processing steps of `v8-08`; notices and errors follow `v8-13`. The empty states (Phase 4.6) use the statement illustration of §2 in a translucent panel, with one action: "Ir a Subir", a link to the upload screen, the only place where files are uploaded; `v8-12` adds the bank's download paths.
- **Screens:** v8 covers every MVP screen, including the quick review, the upload result, the profile and onboarding. `docs/ROADMAP.md` says which phase builds each.
