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

| Concept                                       | Icon                                |
| --------------------------------------------- | ----------------------------------- |
| Income                                        | `download` (arrow into tray)        |
| Real spending                                 | `shopping-cart`                     |
| Moved                                         | `arrow-left-right`                  |
| Investment                                    | `trending-up`                       |
| Loan / bank ("Créditos")                      | `landmark`                          |
| Credit card                                   | `credit-card`                       |
| Cash ("Efectivo")                             | `banknote`                          |
| Nequi / phone                                 | `smartphone`                        |
| Bank costs ("Costos del banco": 4x1000, fees) | `file-text`                         |
| Payments to people ("Pagos a personas")       | `users`                             |
| Payment gateways ("Pasarelas de pago")        | `globe`                             |
| Groceries ("Mercado")                         | `shopping-bag`                      |
| Restaurants and delivery                      | `utensils`                          |
| Shopping ("Compras")                          | `package`                           |
| Transport                                     | `car`                               |
| Home services ("Servicios del hogar")         | `house`                             |
| Energy, in Pagos fijos                        | `zap`                               |
| Gas, in Pagos fijos                           | `flame`                             |
| Water, in Pagos fijos                         | `droplet`                           |
| Phone or internet, in Pagos fijos             | `smartphone`                        |
| Television, in Pagos fijos                    | `tv`                                |
| Health                                        | `heart`                             |
| Housing ("Vivienda")                          | `key-round`                         |
| Education ("Educación")                       | `graduation-cap`                    |
| Entertainment ("Entretenimiento")             | `clapperboard`                      |
| Subscriptions                                 | `repeat`                            |
| Other                                         | `ellipsis`                          |
| To review ("Por revisar")                     | `circle-alert`                      |
| A category, and rules from the quick review   | `tag`                               |
| Recurring payments                            | `calendar`                          |
| Privacy                                       | `shield-check`                      |
| Files we don't keep (privacy facts)           | `eye-off`                           |
| Files joined without duplicating (coverage)   | `layers`                            |
| Numbers kept only as a code (privacy facts)   | `lock`                              |
| More, on the phone's bar ("Más")              | `ellipsis`                          |
| Signs in with Google (profile)                | `globe`                             |
| Signs in by email (profile)                   | `mail`                              |
| Sign out ("Cerrar sesión")                    | `log-out`                           |
| The example ("Estás viendo un ejemplo")       | `eye`                               |
| Upload                                        | `upload`                            |
| A chosen Excel file, a PDF                    | `file-spreadsheet`, `file-text`     |
| A PDF's password                              | `lock` (`eye-off` / `eye` shows it) |
| A column a mapping reads, one it ignores      | `check`, `eye-off`                  |
| A new format's bank ("¿De qué banco es?")     | `landmark`                          |
| Download a CSV                                | `file-down` (`download` is income)  |
| Ask / chat                                    | `message-square`                    |
| Summary                                       | `layout-grid`                       |
| Transactions                                  | `list`                              |
| Categories                                    | `chart-pie`                         |
| Notifications                                 | `bell`                              |
| Profile                                       | `user`                              |
| Assistant                                     | Custom open-ring arrow (see Brand)  |

An unclassified movement shows the icon of its best guess in neutral ink, and one without a category shows `ellipsis`. Every income category uses `download`. Each category's icon is in `CATEGORY_ICONS`, and its chip is `MovementIcon` (`components/movement-icon/`), which Movimientos and Pagos fijos share. A fixed payment of a home service whose words name it shows its service's icon instead (`SERVICE_ICONS`, Phase 8.6d), as v8-04 draws them.

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
- **As Phase 5.7b builds it** (`PeriodControls`): the quarters with movements, newest first; "Verificado" when every movement of the quarter carries the balance of a verified quarterly statement, "Sin verificar" otherwise; "Año" came with Phase 10.2b (below). The options are links, since the period lives in the URL (`?period=2026-q3`, `?period=2026-08`): the picker is a menu of links (Base UI `Menu.LinkItem`, the current one with `aria-current`), and the months a `<nav>` named "Mes del trimestre" whose current link has `aria-current="page"`. On phones each control takes the full width, the months sharing it with 6px of padding each, so a quarter's longest months ("Noviembre", "Diciembre") fit at 360px. Since 6.5b Movimientos and Pagos fijos share it (`components/period-controls/`), each page's links keeping its own filters.
- **A year** (Phase 10.2b, `v8-18`), on Movimientos, Categorías and a category's detail, and since 10.2c on Resumen and Pagos fijos; the quick review stays by quarter, and the summary's banner keeps pointing to the review's quarter. After the quarters, the picker lists each of their years, the latest first: "Año 2026" with the `info` badge "10 de 12 meses", the months the account has in it as its coverage timeline counts them (10.2a). The year lives in the URL as `?period=2026`, the picker then reads "Año 2026" (named "Periodo: Año 2026"), and the row under it holds the year's quarters with movements, in order, then "Año" ("Ene–mar · Abr–jun · Jul–sep · Año"), in a `<nav>` named "Trimestre del año" (decided with the human). A year's days run from 1 January to 31 December; a page that doesn't read a year opens on the latest quarter.
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

- **The top:** "Resumen de tu cuenta de ahorros", the color legend, the period controls of Movimientos and Pagos fijos with the Primary "Subir extracto" after the months (full width on phones), the review banner while groups wait, and the missing months (§9) while the account misses some.
- **"Tu trimestre de un vistazo"** ("Tu mes de un vistazo" for a month, "Tu año de un vistazo" for a year; Section title) with the headline in Caption `--text-muted`: "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto.", or only what went out when nothing moved, or "No salió plata de tu cuenta."; a year's reads "En 2026 salieron $54,2M, pero no todo fue gasto." (10.2c). Below, the three stat cards, `repeat(auto-fit, minmax(190px, 1fr))` with 16px gaps, stacked on phones, each with its compact total:
  - **Ingresos**, its ring the share of its largest kind: "El 85% llegó en 2 transferencias." ("abonos de intereses", "consignaciones", "devoluciones"), and "No incluye $2,8M que volvió de tus cuentas." when money came back; "Ver ingresos".
  - **Gasto real**, its ring its share of what went out: "El 45% de lo que salió." and its four largest categories, "Créditos, mercado, efectivo y pagos a personas."; "Ver en qué gastaste".
  - **Movido**, its ring the share of what went out to the user's own: "El 55% de lo que salió: a tu inversión y a tus tarjetas. Además volvieron $2,8M."; "Ver a dónde se movió".
  - Each link opens Movimientos on the period with its kind's filter. A kind without movements says so ("No hubo gasto real en este periodo.") over an empty ring.
- Before any movement counts, the page keeps its empty state (§14), or the way to a statement that doesn't reconcile.
- Beside the glance, "Tu cuenta" (6.7b, account card above); under the glance, in its two thirds, the day-by-day chart (6.7c, chart card above), after "Tu cuenta" on phones; and beside the chart, "Dónde se fue más" (6.7d, insight tile above), after the chart on phones. From `lg` the chart's card is as tall as "Dónde se fue más", as v8 draws it. Under the chart, in its two thirds, "Tu extracto, traducido" (8.6c, transaction row below), last on phones; "Pregúntale a tu extracto", beside it, waits for Stage 13.

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
- **As Phase 6.7b builds it** (`AccountCard`, on the summary): "Tu cuenta" (Section title) with "Comparamos cada saldo con el de tu banco.", beside the glance from `lg` and under it on phones, the illustration 96px wide from `sm`. The balance is the one printed after the period's last movement that has one, exact with its cents ("Saldo al 30 de septiembre", "$7.818.518,82"); files without balances show none. The boxes are those of the quarterly statement the period shows, a million or more compact and less exact ("$5,1M", "$18,82"), and a month calls them its quarter's ("Saldo promedio del trimestre", "Intereses del trimestre"); a figure the statement didn't print has no box. A year (10.2c) has one box, its quarterly statements' interest added up, "Intereses del año" with the four and "Intereses de 3 trimestres" without them, and no average balance, which the bank prints for a quarter only (decided with the human); its pill counts the movements that reconcile in all of them ("Saldo verificado" · "1.040 movimientos cuadran"), without the chain. The pill says what checks the balances: "Saldo verificado" with "312 movimientos cuadran", or "Encadenado con abr–jun 2026 · 312 cuadran" when it chains on to the quarter before; "No cuadra por $810" with "Revisa el archivo" when a statement of the period doesn't reconcile (only "No cuadra" when its closing balance adds up), followed by the link action "Ver dónde no cuadra"; and "Sin saldo para verificar" with "Archivo de movimientos" otherwise. What the balance typed says of the period (10.3) comes after a statement that doesn't reconcile and before the others, when its days after the latest verified closing meet the period's: "Cuadra con tu banco" with "Con el saldo que escribiste el 9 de noviembre", the balance being the last one it worked out; or "No cuadra con tu banco por $12.400" with "Puede faltar un archivo de movimientos.", and no balance of those days.

### Status pill

`--surface`, `--radius-sm`, padding 10px 14px, `--shadow-chip`. Status dot (10px with halo) + title (Manrope 700 14px) + detail (12px muted). The variant depends on the file:

| Variant           | Dot                  | Example                                               |
| ----------------- | -------------------- | ----------------------------------------------------- |
| Verified          | `--status-ok`        | "Saldo verificado" · "312 movimientos cuadran"        |
| Chained           | `--status-ok`        | "Encadenado" · "Empieza donde terminó abr-jun"        |
| Without balance   | `--text-faint`       | "Sin saldo para verificar" · "Archivo de movimientos" |
| Doesn't reconcile | `--status-attention` | "No cuadra por $12.400" · "Revisa el archivo"         |

A movements export without balances becomes "Verificado por tu extracto trimestral" once a quarterly statement covers its dates and agrees with it. As Phase 10.1b builds it: verified quarterly statements cover every day of the file and every movement on those days has its twin (10.1a), worked out when read, so the upload order doesn't matter and a file uploaded twice reads the same; "Verificado por tu extracto trimestral" · "Este tipo de archivo no trae saldos; lo comparamos con jul–sep 2026 y coincide." with the verified dot.

On the upload screen the same pill counts the month's statements, beside the page title (full width under it on phones): "7 de 10 disponibles" · "Archivos este mes" with the verified dot; with none left, "0 de 10 disponibles" · "Se renuevan el 1 de noviembre" with the attention dot (`StatusPill`, `components/status-pill/`).

On the quick review it counts the quarter's groups and their movements, answered or not, beside the title (full width under it on phones), as `v8-02` does: "6 grupos · 38 movimientos" · "Unos 2 minutos" with the information dot (`--moved`, tone `info`), about 30 seconds per open group ("Menos de un minuto", "Un minuto"); once none is open, "Todo respondido" with the verified dot.

### Chart card

- `--surface-card`, `--radius-lg`, padding 24.
- Title + one-line reading guide ("Si la línea naranja sube rápido, estás gastando rápido.").
- Legend as line swatches (18×3px): solid blue for balance, dashed orange for cumulative spending.
- Lines: balance `#4C8DF6` 2.6px solid with an area fill from 22% to 0% opacity; cumulative real spending `#EA6B2D` 2.4px dashed `7 6`.
- Grid `--chart-grid`, baseline `--chart-axis`; Y labels on the left (Meta style, right-aligned); 4 X labels.
- Highlighted event: white circle r=7 with a 3px `--primary` stroke, dashed vertical guide, and a tooltip (`--surface`, `--radius-sm`, `--shadow-pop`) explaining the event in plain language.
- **As Phase 6.7c builds it** (`DayByDayChart`, on the summary): "Tu saldo y tu gasto real, día a día" (Section title) and its guide inside the card, the legend beside them from `sm` and under them on phones. The plot is 192px tall, an SVG stretched to its width whose lines keep their width and dashes (`non-scaling-stroke`); the amounts on the left, the days under it, the circle and the note are HTML over it, so they never stretch. It draws each day from the period's opening (the day before its first, "30 jun") through its last day with movements, on an axis that runs to the period's last day: the balance each day, the same over a day without movements, when every movement printed it; and the real spending so far, from $0. The amounts are round, three steps at most ("$30M", "$20M", "$10M", "$0"; steps of 1, 2, 2,5 and 5 times a power of ten, from $10); the days are a quarter's opening and its months' last days ("30 jun", "31 jul", "31 ago", "30 sep"), a month's opening, 10th, 20th and last day, or a year's quarters' last days ("31 mar", "30 jun", "30 sep", "31 dic", 10.2c), since its opening would read "31 dic" twice. A year's lines start at the opening of its first quarter with movements ("30 jun" when its files begin in July), since a balance isn't known before its quarterly statement opens, on the axis that starts at 31 December. The event is the day the most income came in, when it is a tenth of the scale or more: "4 de agosto: entraron $31,5M" over "Ese mismo día $22,0M pasaron a tu inversión. No fue gasto.", or "Fue el día con más ingresos del trimestre." ("del mes", "del año") when nothing moved that day. Its note sits beside the circle from `sm`, on the side with more room, and under the plot on phones. The plot is one image whose name says the conclusion ("Tu saldo pasó de $13,8M el 30 de junio a $6,5M el 30 de septiembre, y tu gasto real llegó a $24,4M."); the note stays outside it. Without balances (movements exports only) it is "Tu gasto real, día a día", with "Tus archivos de movimientos no traen saldo." under the guide, the spending's line alone and no event; without spending either, there is no card. Both lines break over the months the account doesn't have between its first and its last (10.2d, decided with the human), so the chart invents nothing there: a piece after them starts on their last day, as a quarterly statement opens on the previous quarter's last, with the balance its statement opens with; a piece without movements isn't drawn. The balances a balance typed that adds up worked out (10.3) draw as any other, with "Desde el 1 de octubre, el saldo es calculado y cuadra con el de tu banco." under the guide.
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
- **As Phase 8.6c builds it** (`TranslatedStatement`, on the summary): a card (`--surface-card`, `--radius-lg`, padding 24) with "Tu extracto, traducido" (Section title) over "Lo que dice el banco y lo que significa." (Caption `--text-muted`), and the filter chips beside them from `lg`, under them before: "Todo", "Gasto", "Movido", "Ingresos" and "Por revisar · 24", links that keep the account, the period and the page's scroll (`?lines=spending`). Up to five lines, the largest first: one per bank text, way and category, each the largest of its movements in the period. "Todo" first takes the largest line of each kind that has one (income, real spending, money that moved out, money that came back, a guess to review), then fills to five by amount; any other filter takes its five largest, the movements Movimientos's same filter keeps. Each line has the 44px chip of its category in its kind's tones (neutral while it's a guess); the title in plain words (Body 700) as a link to its detail in Movimientos, over the bank's text (Meta `--text-muted`, as printed), or the bank's text alone when nothing names it; the explanation (Caption `--text-secondary`), then the channel tag and "Por revisar" while it's a guess; and the amount, exact with its sign (Amount S, in its kind's text color, ink while it's a guess). From `md` the explanation and tags take a column of their own between the title and the amount; under `md` the amount sits beside the title and the rest stacks under it. The explanation is the code's, the first that holds: the guess ("Creemos que es tu inversión. Confírmalo en la revisión."); a fixed payment's days ("Se repite entre el 1 y el 4 de cada mes."); what money that moved is ("Ese gasto está en el extracto de la tarjeta. Aquí no lo contamos dos veces.", "No es gasto: pasó a tu inversión.", "No es gasto: pasó a otra cuenta tuya.", "No es ingreso: es tu propia plata que regresó."); what its text adds up to in the period ("Con el del 30 de julio suman $39,8M.", "Con otros 3 suman $4,2M."); else what it counts as ("Cuenta como gasto real.", "Cuenta como ingreso.", "Aún no sabemos qué es: no cuenta en tus totales."). Last, "Ver los 312 movimientos" (link action) opens Movimientos on the period with the filter; a filter without lines says "No hubo movimientos de este tipo en el periodo." instead of them.
- On Movimientos the rows are grouped by day, each header with the day's balance ("Saldo del día $6.482.310"), and a row opens a detail panel: "Así lo escribe el banco", "También aparece como" (the other ways the bank wrote it), channel, reference, source files, balance after, kind and category with the reason ("Regla del sistema, sin IA").

### Movements list ("Todos los movimientos")

As Phases 5.7a, 6.1b and 6.2b build it (`TransactionList`):

- Above the card, in order: the color legend under the page title (`KindLegend`, `components/kind-legend/`), the period controls, any statement that doesn't reconcile, and the kind total tiles.
- A card (`--surface-card`, `--radius-lg`), its title and one line with the period's days and the account ("Del 1 de julio al 30 de septiembre de 2026. Cuenta de ahorros · Bancolombia ••••8901."). A month without movements reads "No hay movimientos en este periodo." From `lg` it takes two thirds of a row whose other third is the movement's detail (Phase 6.3f, below); under `lg`, the whole width.
- **The files it joined** (Phase 10.1c, `v8-03`): the line ends with them when a movements file is among several files that saved the period's movements, those that count and those hidden behind a verified quarterly statement: "Juntamos tu extracto trimestral y 2 archivos de movimientos, sin duplicar.", or "Juntamos 3 archivos de movimientos, sin duplicar." without a quarterly statement. A file whose movements another saved before saved none and isn't named, nor is a statement that doesn't reconcile; one file, or quarterly statements alone, say nothing. The line keeps them over a search, a filter or a category, since they are the period's. Another bank's account (Phase 11.3c) names its files with balances by what they are: "Juntamos tu archivo con saldos y 2 archivos de movimientos, sin duplicar."
- Day headers: the weekday and the date in Manrope 700 14px ("Miércoles 30 de septiembre", with the year when it isn't the current one), and "Saldo del día $6.482.310" in Caption `--text-muted` on the right, under it on phones. A day of a file without balances has no balance. A day only movements files cover shows the balance a balance typed that adds up worked out (10.3), and the list's line ends with "Desde el 1 de octubre, el saldo es calculado y cuadra con el de tu banco."
- Rows: the title in plain words (Phase 8.6a, Body 700) over the bank's text as printed (Meta `--text-muted`, letter-spacing `0.02em`, `white-space: pre-wrap`, so double spaces show and a long text wraps only at its spaces), which screen readers hear after the title (`aria-describedby`). The title is its rule's ("Envío por Nequi", "Retiro en cajero", "Pago de energía" where the rule's words name what was paid) while its category is the rule's; the LLM's while its category is the LLM's answer (Phase 8.6b, "Compra en una droguería"); and its category's once the user gave another, or the LLM gave one without a title in plain words ("A tu inversión", "Salud"). A movement nothing names keeps the bank's text as the title, Manrope 600 15px with the same letter-spacing and wrapping; the bank's `0` reads "Sin descripción del banco" with its `0` under it. Under it, on one line that wraps, the channel tag and the category tag, or "Por revisar" instead while the category is only a guess (Phase 6.1b); a row of a statement that doesn't reconcile shows its channel only, since it counts nowhere. Each row starts with a 44px icon chip: its category's icon (§8) on the kind's soft background, in the kind's text tone. The amount is in Amount S with its sign, in the kind's text color (Phase 6.2b). The chip is neutral (`--surface-muted`, ink icon) and the amount ink (§3.4) when the category is only a guess, when there is none, or when the row belongs to a statement that doesn't reconcile.
- Footer: "Mostrando 30 de 312" (Meta, `--text-muted`) and the link action "Mostrar 30 más" (fewer when fewer are left). The count lives in the URL (`?show=60`) with the account and the period, the page keeps its scroll, and the focus moves to the first movement the link brought, also when the link goes away because every movement shows. Choosing another period or account shows the first 30 again.
- **Daily interest** (Phase 6.7e): a month's "ABONO INTERESES AHORROS", those the table's rule still calls interest, show in one line where its newest abono goes, when the month has two or more: the 44px chip with income's icon and tones, "Intereses de septiembre" (Body 700), the bank's text under it (Meta `--text-muted`, as printed), "30 abonos diarios, agrupados en una línea." (Caption `--text-secondary`) and the abonos added up in income's color ("+$420"). The line opens no detail, since it is no single movement. A day whose only movements were abonos has no header; every other day keeps the balance it closed with, abonos included. The page's subtitle adds "Los 90 abonos diarios de intereses se ven agrupados por mes.", also over a search or a filter that groups some. "Mostrar 30 más" adds lines, and the footer counts the movements they hold ("Mostrando 59 de 312"), so it reaches the subtitle's count. "Ver dónde no cuadra" keeps every row, to find where the balance breaks.
- The upload result links to its file's movements with the link action "Ver movimientos": its account, and the month that holds the file or the quarter of its last day. A statement that doesn't reconcile has none to show, and a file the account had all of points to "Lo que tienes" instead (10.2d).
- **Search** (Phase 5.7c), under the card's header: a white pill (the text field with `--radius-pill` and `--shadow-chip`) with the `search` icon at 18px inside on the left and "Busca por descripción o monto" (references are stored as hashes, so v8's "o referencia" waits). Its label is visually hidden ("Buscar movimientos"). It's a GET form inside `role="search"`, so the term lands in the URL (`?q=`) with the account, the period and the filter, Enter searches, and the period and account links keep it. It finds the bank's text ignoring case, accents and extra spaces, and an amount typed the Colombian way ("$90.000", "1.234,56") with either sign. The page's subtitle then says "3 movimientos coinciden con “nequi”."
- **No matches** (`docs/ui/v8-13`): in the card, a 44px `--surface-muted` chip with `search`, "No encontramos “netflix”" (Manrope 700 15px), "Busca por otra palabra o por el monto, o quita la búsqueda." (Caption `--text-muted`) and a small Secondary "Quitar búsqueda", in a `role="status"` region. The footer's "Mostrando…" is a polite live region too.
- **Filters by kind** (Phase 6.2b), under the search: the filter chips (above). A filter keeps only its kind's movements, by their categories, or those waiting for review. It lives in the URL (`?filter=income`, `spending`, `moved` or `review`) with the account, the period and the search, and their links keep it. A filter with nothing to show reads "No hay movimientos de este tipo en el periodo."; the page's subtitle counts what the list shows.
- **A category's movements** (Phase 6.8b): a category's detail opens the list with `?category=restaurants`, instead of a filter. The list keeps that category's movements, the chips gain the category's name after "Por revisar · 24" as the current one, and any other chip leaves it; the search, the period links, "Mostrar 30 más" and the detail keep it. The page's subtitle reads "31 movimientos de «Restaurantes y domicilios»." (a search's words win), the tiles stay the period's, and a period without the category's movements reads "No hay movimientos de esta categoría en el periodo."

### Movement detail

As Phase 6.3f builds `v8-03`'s panel (`MovementDetailColumn`, `MovementDetailPanel`, `MovementSheet`):

- **Opening it:** each row's title is a link stretched over the whole row, with the focus ring around the row and its text underlined on hover. It opens the movement's detail in the URL (`?movement=`), keeping the list's account, period, search, filter and count, and the page's scroll. The open row sits on `--primary-soft-2` with a 1px `--primary` ring at 40%, like a marked row, and its link has `aria-current="true"`. A movement that isn't one of the account's that count opens nothing.
- **Beside the list, from `lg`:** the right third of the row, sticky 24px from the top, so it stays in sight while the list scrolls (it scrolls inside itself when taller than the screen). Before a movement is chosen it holds a card with "Elige un movimiento" (Section title) and what the detail shows (Caption `--text-muted`); on phones it holds nothing.
- **The panel:** a card (`--surface-card`, `--radius-lg`, padding 24, gap 20) with, at the top, the category's 44px chip in the kind's tones (neutral while it's a guess), the row's title (Section title; the bank's text with `0.02em` and `pre-wrap` when nothing names it; "Sin descripción del banco" for its `0`) over the day in words ("Miércoles 12 de agosto de 2026", Caption `--text-muted`), and the X icon button ("Cerrar el detalle") on the right. Then the amount in Amount XL with its sign, in the kind's text color or ink as in the list; "Así lo escribe el banco" (Meta 700) with the raw-text chip, on `--surface-muted` with `--radius-md`; and a list of lines, each with a `--divider` line above it, its label in Meta `--text-muted` and its value in Caption: "Canal", "Referencia" ("••• 1270", the only digits kept), "Fuente" ("Extracto trimestral jul–sep 2026", "Movimientos 1–7 oct 2026") and "Saldo después". A line it doesn't have isn't shown. Since 6.3g its kind and category are choices (below), between the lines and why.
- **Its files** (Phase 10.1c): when a movements file's movement repeats it, hidden behind its quarterly statement (10.1a), "Fuente" names both files, the movements file's mid-sentence: "Extracto trimestral jul–sep 2026 y movimientos 15–31 ago 2026" (v8 writes "Extracto jul–sep y movimientos 15–31 ago"). When that file wrote it otherwise, as a text the quarterly statement cut before an accented letter ("PAGO LLAVE COMIDAS R" and "PAGO LLAVE COMIDAS RÁ"), "También aparece como" (Meta 700, 6px further from the chip above it) follows in the same box, with its raw-text chip. A text that differs only in its spaces (a PDF prints one where the Excel prints two) or in how a letter is encoded isn't another. v8's "×2" stays out: a movement any later file brings is saved once, by its fingerprint, so only the first file is known.
- **Why:** the `info` icon in `--primary` and "**Por qué:**" then the rule's reason and "Regla del sistema, sin IA.", "lo decidiste tú." for the user's answer, "la IA lo clasificó por el texto del banco, sin montos ni datos tuyos." for the LLM's category (8.5b), or "ninguna regla conoce este movimiento todavía.", in Caption `--text-secondary`. A guess adds "Es nuestra mejor suposición: confírmala en la revisión." and the link action "Ir a la revisión", to the quick review of the movement's quarter.
- **On phones** (under `lg`): the same panel as a full-screen sheet on the page's background, padding 16, a modal `<dialog>` once the page runs, so the page behind it is inert and holds still. Its X, Escape or the browser's Back close it.
- **The focus** goes to the panel's title when it opens, and back to the movement's link when it closes. Escape closes it from inside on wide screens too. v8's "Es un pago fijo" (6.5) isn't there yet.

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
- **The view:** the page title "Dónde no cuadra" with the statement and its account as subtitle ("Extracto trimestral jul–sep 2026", or "Archivo con saldos de sep 2026" for another bank's, Phase 11.3c); a card on the attention surface with the white 44px chip, `circle-alert` and its orange dot, "El saldo final no cuadra por $810" (or "El saldo no cuadra"), "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre." and how many rows break the chain, then the link action "Ir a la primera fila que no cuadra" (to the oldest one) and a small Secondary "Subir de nuevo". Below, "Movimientos del extracto": every row it printed, by day, newest first; a row that breaks the chain sits on the attention surface with the dot and "Con el saldo anterior ($X) y este movimiento quedaría $Y; el banco dice $Z." in Caption `--text-secondary`.
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

The bank's text exactly as printed, for the quick review, the profile and the detail panel: `--surface`, 1px `--ring-track` border, radius 8, padding 4px 10px, monospace 12px (§4), `white-space: pre-wrap` (double spaces stay, and a text that doesn't fit wraps, as a long holder's name on a phone), in `--text-muted`. Repeats show as "×3" beside it (Meta, `--text-muted`), which screen readers hear as "3 veces" (`RawTextChip`, `components/raw-text-chip/`; the waitlist's sample draws its own).

### Review banner

On the summary while review groups are pending: the attention surface (`#FFF6EF`), `--radius-lg`, a white icon chip with the 9px orange dot, a title with the count ("Tienes 4 grupos por revisar (24 movimientos)"), one line ("Mientras tanto usamos nuestra mejor suposición. Confírmalos: pueden cambiar tu gasto real.") and a Primary "Revisar ahora".

As Phase 6.3c builds it (`ReviewBanner`, `components/review-banner/`): under the page title, as wide as the page, padding 20, the `circle-alert` chip, the title in Manrope 700 15px and the line in Caption `--text-secondary`; the button goes under them on phones. It counts the open groups and their movements of the account and quarter the review opens on, links to that review with both in the URL, and leaves once nothing waits.

### Missing months

`v8-13`'s "Resumen · falta un periodo", as Phase 10.2d builds it (`MissingMonths`): on the summary, under the review banner and as wide as the page, on the normal surface (`--surface-card` at 88%, `--radius-lg`, padding 20, `--shadow-card`), while the account the page shows misses months that ended, whatever the period (decided with the human). Never on the example.

- **Which months:** those of the account's coverage timeline (below; from its first month, the last twelve at most) that ended without movements, this month aside.
- **Which file:** a quarter that ended comes in its quarterly statement; the months of the quarter that goes on, in movements, which the bank still gives for this month and the three before.
- **The notice:** a 44px `--surface-muted` chip with `calendar` (ink, 1.7), then the title in Manrope 700 15px naming every run, decided with the human ("Te falta abril a junio y octubre": one or two months by name, "abril a junio" for more, with the year when it isn't this one); under it, in Caption `--text-secondary`, the files: "Para ver el año completo, sube el extracto trimestral abr–jun y los movimientos de octubre." Then the account's coverage timeline (§9), named by its sentence, and the Primary "Subir abr–jun" ("Subir octubre", "Subir oct–nov" for two months of movements, "Subir oct–dic 2025" of another year), or "Ir a Subir" when several files bring them, to the upload screen. Another bank's account (Phase 11.3c) asks for its own files, whatever its bank calls them: "Para ver el año completo, sube tus movimientos de Davivienda de abril a junio." ("de tu banco" when the person chose "Otro"), with "Ir a Subir".
- **Phones:** the chip and the texts, the timeline at full width, then the button.

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
- **Tiles** (`RecurringTiles`, 6.5c): a list named "Lo que pagas", `repeat(auto-fit, minmax(190px, 1fr))` with 16px gaps, so they stack on phones. Each is a `tile` card with a 44px neutral chip (`--surface-muted`, ink icon at 1.7), its label (Body 700), its figure (Amount XL, ink, compact as §4 writes it) and what it means (Caption `--text-muted`): "Pagas al mes" (`calendar`) with each fixed payment's latest month added up ("$2,5M", where v8 writes "$2,46M") and "Sale de tu cuenta aunque no hagas nada."; "Al año" (`repeat`) with twelve of those months and "Lo que suman estos 7 pagos en 12 meses." ("este pago" for one); and, when a payment rose, the one that rose the most, by its percent and then by its money, on the attention surface with a white chip of its home service's icon, else its category's, and the 9px orange dot: "Energía subió 12%" (its title, as its row reads), the rise with its sign, exact ("+$19.700"), and "De $162.300 en julio a $182.000 en septiembre.", from its first month to its last as its trend measures it, with what to look at by what it pays for (Phase 8.6d): "Revisa tu consumo o la tarifa." for a home service, "Revisa el precio de tu plan." for a phone, internet, television or a subscription, "Revisa la tasa o los cargos de tu crédito." for a loan, and "Revisa por qué subió." for anything else. No tiles without fixed payments.
- **The card** (`card`): "Tus pagos fijos" (Section title) with "Ordenados por monto. Las barras muestran julio, agosto y septiembre." (Caption `--text-muted`), its rows, then "Total en septiembre" (Body 700) with what the month's payments added up to in Amount L, in spending's text color. Then "También se repiten, pero no son gasto" with "Plata que pasa a tu tarjeta o a tu ahorro. Sigue siendo tuya.", whose rows have no bars.
- **"Activos · 7 / Ya no aparecen · 1"** (6.5c): when a fixed payment stopped, the filter chips (§9) on the right of the card's title, under it on phones, in a `<nav>` named "Mostrar". The list lives in the URL (`?filter=stopped`), and the period links keep it. "Ya no aparecen" lists the real spending that repeated in the past year and stopped before the page's month (or before the month before it, while the page's month goes on), with "Se repetían cada mes, pero no aparecen en septiembre. Las barras muestran …" and no total; what only moves keeps its own list. A list without payments says "No hay pagos fijos en septiembre." in Caption `--text-muted`.
- **A row:** a `--divider` line above, padding 14px 0. A 44px chip, neutral for real spending and in the moved tone for what only moves, with its home service's icon or its category's (§8); its title (Body 700) over the bank's text as printed (Meta `--text-muted`, `pre-wrap`). The title says what it pays for in plain words (Phase 8.6d): a home service by its words, as 8.6a's titles name them ("Energía", "Gas", "Agua", "Celular o internet", "Televisión"); the LLM's title of a payment no rule names (8.6b, "Pago de gimnasio"); or what its category pays for ("Cuotas de tu crédito", "Pago de tu tarjeta", "Ahorro o inversión", "A otra cuenta tuya", "Servicios del hogar"). Else it's who was paid as the bank wrote it ("GIMNASIO FIT"), or the number paid by its channel ("Nequi ••• 1270"). Under the bank's text, "También: “PAGO PSE Electrificadora de S”." for its other texts, "2 cuotas: $1.540.000 y $311.000." when its month held several, and, in Meta `--text-muted`, "Aún no aparece en octubre." for a payment still expected in the page's month or "Último pago el 10 de agosto." for one that stopped; "Mensual · día 5" or "Mensual · entre el 1 y el 4" (Caption `--text-secondary`) over its channel tags, how its amount moves ("Estable" `ok`, "Subió 12%" `spending`, "Varía poco" and "Monto variable" `neutral`) and "Varios canales" (`info`); from `lg`, its bars; and its amount (Amount S) in the kind's text color with its sign, its latest month's when the page's month hasn't one, or "$48.000 a $2.090.000" when it moves a lot. Under `lg` the amount stays beside the name, at most 128px wide, and the days and tags go under the name.
- **Bars:** three tracks of 12×28px (`--surface-muted`, radius 4), each filled to the month's share of the most of the three: `--spending` for the page's month, at 40% before it; the short month under each (10px, `--text-muted`). They are one `role="img"` named "Lo pagado cada mes: Julio $162.300, Agosto $170.000, Septiembre $182.000" ("sin pago" for a month without), hidden under `lg`. For a year (10.2c), a track per month from January through the page's month (decided with the human), 8px wide and 4px apart, each quarter's first month named ("ene", "abr", "jul", "oct", its name reaching over the next), hidden under `xl`, where the payment's words keep their room; the card's line then reads "Las barras muestran de enero a octubre." Up to March, a year's months keep the quarter's tracks and names ("Las barras muestran enero y febrero.").
- **This month's calendar** (`PaymentsCalendar`, 6.5c): a `card` named by its title, today's month in Bogotá ("Octubre", Section title) with "Cuándo sale cada pago. Hoy es 20 de octubre." (Caption `--text-muted`), while the page's month is this one or the one before; none for an older period. Under the weekdays ("L M M J V S D", Meta 600 `--text-muted`), seven columns of square days 6px apart, radius 10, Manrope 14px: a fixed payment's range of days on `--spending-soft` (600, ink), its single day with a 6px `--spending` dot under the number, the 31st on a shorter month's last day, and today on `--primary` (700, white, the dot white). The grid is one `role="img"` named "Cuándo sale cada pago en octubre: cuotas de tu crédito, del 2 al 4; …", the earliest first, each payment by its row's title in running text: a title in plain words starts in lower case, and who was paid stays as the bank wrote it. Below, the legend ("Rango de días", "Día fijo", "Hoy", Meta `--text-muted`, with swatches), and, once the page shows this month's movements, each fixed payment that hasn't appeared though its days began, the earliest first, on `--surface` (`--radius-md`, padding 14, `--shadow-chip`) with the 10px orange dot and its 4px halo: "Pendiente: gas, del 8 al 12." (Manrope 700 14px) over "Aún no aparece. Unos $31 mil, por transferencia o PSE." (Caption `--text-muted`, its latest month compact, its channels as running text writes them); with none, "Nada pendiente hasta hoy.". Without this month's movements it says nothing of what's pending, so it never claims a payment didn't come.
- **"Cómo los encontramos":** a card with the `info` chip on `--primary-soft`, its title (Body 700) and "Un pago es fijo si aparece al menos 3 meses seguidos, …" (Caption `--text-secondary`). v8's "¿Falta alguno? Márcalo como fijo" waits for a phase that marks payments by hand.
- **Empty:** before any movement counts, the page's empty state; a period without fixed payments, "No hay pagos fijos en este periodo" with "Ir a Subir".
- v8's legend names the payment due today ("Hoy · gimnasio"), which the calendar's name already says. v8's titles for what no rule names ("Gimnasio", "Internet y TV", "Plan de celular") come from the LLM's, which read "Pago de gimnasio"; without one, who was paid. v8's "Agua y aseo" reads "Agua", since the words name only the water, and "Pago de tu tarjeta Mastercard" reads "Pago de tu tarjeta", with the brand in the bank's text under it.

### Categories ("Categorías")

As Phase 6.8a builds `v8-05` at `/categories`, for the account and period in the URL:

- **The top:** "Categorías" with "En qué se fue tu gasto real y a dónde se movió lo demás.", the color legend and the period controls of the other pages. Before any movement counts, the page's empty state ("Aún no hay categorías", with "Ir a Subir").
- **The row:** "Tu gasto real por categoría" in the main column (§7), and in the side one, under it on phones, "Movido no es gasto", the gateways' insight tile and "Tus reglas".
- **"Tu gasto real por categoría"** (`card`): its title over "$24,4M en el trimestre, de mayor a menor. Toca una para ver sus movimientos." ("en agosto" for a month, "en 2026" for a year; "No hubo gasto real en este periodo." without any). One row per category of real spending, the largest first, each with a `--divider` line above it: the category's 44px chip, neutral (`--surface-muted`, ink icon); its name (Body 700) and what it took on the right (Outfit 500 16px; a million or more compact and less exact, as the account card's boxes write it); an 8px bar on `--ring-track`, filled from `--spending` at 60% to `--spending` as far as its share of the largest category, a sliver at least; in Meta `--text-muted`, "19% de tu gasto real · 3 movimientos · PSE": its share ("menos del 1%" for a sliver), its count and the channels its money went out through, the most used first; and a `chevron-right` (16px, `--text-muted`) on the right. Since 6.8b the name is a link stretched over the row, as Movimientos's rows are, with the focus ring around the row: it opens the category's detail (below) in the same account and period. "Movido no es gasto"'s rows open nothing, as v8 draws them.
- **"Movido no es gasto"** (`card`): "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo." (only what happened, or "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas."), then one row per place money only went, the most first: the 44px chip in the moved tone, "A tu inversión", "A tus cuentas" or "Pago de tarjetas", the amount with its sign in moved's text color ("−$22,0M"), and a `--moved` bar against the most; then "Volvió de tus cuentas" with "+$2,8M" and "Plata tuya que regresó: no es ingreso." in Meta, without a bar.
- **Payments through gateways:** when some went out, the insight tile (above) on the attention surface, in its insight's words: "6 pagos sin tienda identificada", "$600.000" and the way to name them in Movimientos.
- **"Tus reglas"** (`card`): "Lo que respondiste en la revisión o corregiste en Movimientos, aplicado a todos tus extractos.", then each of the user's rules, the bank's texts in alphabetical order and then the numbers: the 44px neutral chip with `tag`, the text as folded ("TRANSF A ANA LUCIA MAR") or the number ("ref ••• 1270") in Meta `--text-muted`, and, after a `chevron-right`, what it says in Caption 700: "Si sale: Entre tus cuentas · movido", "Si entra: Consignaciones · ingreso", a number's without a direction. Without rules, "Aún no tienes reglas. Las crean tus respuestas en la revisión y tus correcciones en Movimientos." v8's "Ver y editar tus reglas" waits for a page that edits them (decided with the human).

### A category's detail

As Phases 6.8b, 6.8c and 8.6d build `v8-06` at `/categories/<category>` (`CategoryTitle`, `CategoryTiles`, `WeeklyChart`, `TopPlaces`, `CategoryMovements`, `CategorySettings`), for the account and period in the URL. Only categories of real spending have one; any other is not found.

- **The top:** the link action "Categorías" with a 16px `chevron-left`, back to Categorías in the same account and period; then the category's 44px chip in spending's tones beside its name (the page's H1) over "Gasto real · julio a septiembre de 2026" ("agosto de 2026" for a month, "2026" for a year; `--text-muted`); then the period controls of the other pages, whose links keep the category. The dock lights Categorías.
- **The tiles** (a list named "Lo que se fue en esta categoría"): `tile` cards, each with its 44px chip, its label (Body 700), its figure (Amount XL) and what it means (Caption `--text-muted`). "Total del trimestre" ("Total de agosto", "Total del año") with the category's chip and its figure in spending's text color: "$2,4M" (a million or more compact and less exact, as the boxes write it), "31 movimientos · 10% de tu gasto real.", the same share as its row in Categorías. "Promedio por movimiento" with `tag` on a neutral chip and its figure in ink, to the peso ("$75.852"), with "El más alto: $186.000, el 12 de agosto." (the first of a tie), or "Un solo movimiento, el 12 de agosto."; v8's "en un restaurante" stays out, since a title says what a movement was, not where, and doesn't read in the middle of a sentence (8.6d). For a quarter, "Por mes" with `calendar`: a box per month the account has movements in (`--surface-muted`, `--radius-sm`, padding 10px 12px), the month in Meta `--text-muted` over what the category took in Body 700 ("$710 mil", "$1,0M", "$0", compact as §4 writes it), the month it took the most on the attention surface when there are several, which screen readers hear as "el mes con más". The tiles stack on phones, go two by two from `sm` with "Por mes" under them at full width, and three in a row from `xl`, where a third of the row holds its three boxes. For a year (10.2b), "Por mes" holds a box per month of the year the account has movements in, and with more than three it takes the row's whole width at every size (decided with the human). A month has no "Por mes", and a period without the category's movements has no tiles.
- **The rows** (§7): "Semana a semana" beside "Dónde más" (6.8c), then "Movimientos de esta categoría" beside "Ajustes de esta categoría"; on phones, one under the other in that order. Without the category's movements in the period, no chart and no places.
- **"Semana a semana"** (chart card, 6.8c): "Cada punto es lo que gastaste en esa semana. Si sube, algo cambió." and the legend "Gasto por semana" (solid `--spending` swatch). Weeks of seven days from the period's first, the last one shorter, through the account's last day with movements: a `--spending` line of 2.4px over its area (18% to nothing) and an 8px dot a week. Days under it: a quarter's months and last day ("1 jul" … "30 sep"), a year's quarters and last day ("1 ene", "1 abr", "1 jul", "1 oct", "31 dic", 10.2b), or a month's weeks. The week that took the most stands out when it took half again a normal week (the middle one), or when most weeks took nothing: "Semana del 5 de agosto: $410.000" over "9 pedidos. Una semana normal es de $210 mil." (decided with the human) or "1 retiro. La mayoría de las semanas no tuvo gasto en «Efectivo».". The week counts its category's payments in plain words (Phase 8.6d, `WEEK_NOUNS`): "pedidos" in restaurants and delivery, "compras" in groceries and shopping, "retiros" in cash, "cuotas" in loans, "cobros" in subscriptions and bank costs, and "pagos" in the rest.
- **"Dónde más"** (`card`, 6.8c): "Juntamos las formas en que el banco escribe el mismo lugar.", then up to five places, the most money first: who was paid as the bank last wrote it, after its channel's words ("APP DOMICILIOS"), a number by its channel ("Nequi ••• 1270"), or the whole text when it names no one; what it took; Categorías's bar against the most; and "22 movimientos · COMPRA EN APP DOMICILIOS · también PAGO QR APP DOMICIL" (Meta `--text-muted`, as printed). A cut name joins the longest one it starts, as in Pagos fijos (`placesOf`); names that start differently stay apart ("REST EL FOGON", "EL FOGON"). "Y 3 lugares más: $45 mil." when more are left. A home service's place reads by the name its words give it, as Pagos fijos names it ("Energía", "Gas", Phase 8.6d). Every other place stays as the bank writes it: v8's names ("El Fogón", "Panadería San José") need the business's whole name and its accents, which neither the rules nor the LLM give (decided with the human).
- **"Movimientos de esta categoría"** (`card`): "Los más recientes primero.", or "No hubo gasto en «Efectivo» en este periodo." Its four newest movements, each as Movimientos draws a row (§9): the chip in spending's tones; its title in plain words (Body 700, Phases 8.6a and 8.6b, "Restaurante o domicilio", "Compra en una panadería") over the bank's text as printed (Meta `--text-muted`), which screen readers hear after the title, the title a link stretched over the row that opens its detail in Movimientos among the category's movements (8.6d); under them the day ("27 de septiembre", Caption `--text-muted`) and its tags, the channel and "Por revisar" while it's a guess; and the amount with its sign, neutral and in ink while it's a guess. The bank's `0` reads "Sin descripción del banco" with its `0` under it. v8's titles ("Domicilio de comida", "Almuerzo en restaurante") read as the rules' or the LLM's. The footer: "Mostrando 4 de 31" (Meta `--text-muted`) and the link action "Ver los 31 movimientos" ("Ver en Movimientos" for one), to Movimientos with the category (below).
- **"Ajustes de esta categoría"** (`card`): a box (`--surface-muted`, `--radius-md`, padding 16) with "Cuenta como gasto real" (Body 700) over "Efectivo siempre suma a tu gasto real." (Caption `--text-muted`); then the 44px neutral chip with `tag` beside "2 reglas tuyas" ("1 regla tuya", or "Sin reglas tuyas"; Body 700) over the user's rules that give the category, as "Tus reglas" orders them, up to three then "y 2 más" (Meta `--text-muted`, as the bank prints them), or "Las crean tus respuestas en la revisión y tus correcciones en Movimientos." v8's "Mover movimientos a otra categoría" and "Ver reglas" wait for a phase that moves movements or edits rules (decided with the human).

### Coverage timeline

The months the user has, on the upload screen, the upload result and the profile: one rounded segment per month (8px tall, 6px apart) with the month below (Meta), and a legend:

| Segment                                     | Color                                        |
| ------------------------------------------- | -------------------------------------------- |
| Quarterly statement, verified               | `--status-ok`                                |
| Also in movements exports (a line below it) | `--moved`, 4px                               |
| Without balance to verify                   | stripes of `--text-faint` and `--chart-axis` |
| Missing                                     | `--ring-track`                               |

As Phase 10.2a builds it (`CoverageTimeline`, `CoverageLegend`, `components/coverage-timeline/`):

- **Its months:** an account's, from its first with a file through this one in Bogotá, the last twelve at most. Verified when a verified quarterly statement covers its days (those after its opening balance's day), with movements or not; "also in movements" when movements files saved movements in it too, hidden behind the quarterly statement; without balance when only movements files saved its movements; and missing otherwise. A month whose only file is a quarterly statement that doesn't reconcile reads as missing, since its movements count nowhere (decided with the human); a day missing inside a month doesn't make it a gap.
- **The row:** the segments share the width, 6px apart, each 8px tall with `--radius-pill`; under each, a 4px `--moved` line when movements files brought the month too (a transparent one otherwise, so the months line up), then the short month ("ago") in Meta `--text-muted`, 11px on phones so twelve fit at 360px. The row is one `role="img"` named by its sentence (below), or hidden when the sentence shows beside it.
- **The legend** (`CoverageLegend`), once under the rows, wrapping, each swatch 12 × 6px with its words in Meta `--text-muted`: "Extracto trimestral, verificado", "También en movimientos (rangos que se cruzan, sin duplicar)", "Sin saldo para verificar" and "No lo tienes", all four, as v8 draws them. Another bank's months are verified by a spreadsheet with balances (Phase 11.3c), so its first words follow the accounts shown: "Archivo con saldos, verificado" when every one is another bank's, "Extracto trimestral o archivo con saldos, verificado" with both.
- **Its sentence:** the months by runs of one status, each run a sentence that names one month ("Octubre"), two ("Julio y agosto") or a range ("Enero a septiembre"), with the year where it first shows or changes ("Noviembre de 2025 a enero de 2026"): "Enero a septiembre de 2026 completo y verificado. Octubre va en movimientos, sin saldo todavía." A run without balance reads "… está en movimientos, sin saldo para verificar." before this month; a missing one "Abril a junio no los tienes.", with "todavía" when it reaches this month.
- **With several accounts,** one timeline per account, each under its short label ("Cuenta de ahorros ••••8901", Manrope 700 14px); with one, no label (decided with the human). An account whose movements count nowhere has none.

**"Lo que tienes"** (`WhatYouHave`, upload screen, `v8-07`): a `card` under the upload card and "Lo que sigue", as v8's phone orders them, once an account has months. Its title reads "Lo que tienes ahora" once the screen shows a file's result (`v8-08`, decided with the human), since the page asks the server again when the last job ends. Then, per account, the sentence (Caption `--text-muted`, the card's description with one account), "Encadenado" · "Cada trimestre empieza donde terminó el anterior" (status pill, verified dot) when two or more verified quarterly statements fall in the months and each chains on to the one before, and the timeline; then the legend. Last, on `--primary-soft-2` (`--radius-md`, padding 16) with `layers` in `--primary`, the latest month whose movements came in two or more movements files with days that overlap, in Caption `--text-secondary`: "Agosto lo subiste también en 3 archivos de movimientos con fechas que se cruzan (1–7, 1–15 y 15–31). Los juntamos sin duplicar y les agregamos 12 referencias." ("también" when its quarterly statement saved it; the references are those its movements took, 10.1a, left out when none). A file whose movements another saved before saved none and isn't named, as Movimientos's "Juntamos…" (10.1c).

### Drop zone

On the upload screen, inside the card "Elige uno o varios archivos": `--radius-md`, a 2px dashed border in `--primary` at 30%, padding 40px 20px, centered. A 72px `--primary-soft` circle with the `upload` icon (28px, `--primary`), the title "Arrastra tus extractos aquí" (Outfit 500 24px), the Primary "Elegir archivos" button with `file-text`, and a caption with the limits and where files are read ("Hasta 10 MB y 30 páginas por archivo. Los leemos en tu navegador: el archivo no sale de tu equipo."). While files are dragged over it, the border turns solid `--primary` on `--primary-soft`. The button is the way in with a keyboard and on phones; a file dropped elsewhere on the page is ignored, so the browser never opens it. The welcome's last step (below) shows the same zone in a card "Súbelos aquí": the files chosen there go to the upload screen, which reads and sends them (`UploadShortcut`).

**What it reads** (Phase 11.3c, `v8-07`): the picker takes `.xlsx`, `.xls`, `.csv` and `.pdf`. Under the drop zone, "Bancolombia: lo que ya leemos" with its two formats on `--surface-muted` (`--radius-md`, padding 16), each with its Excel and PDF tags, and under them at the full width "¿Otro banco?" with `globe`, "Súbelo igual. Te mostramos qué entendimos de cada columna y lo confirmas una vez." and its Excel and CSV tags; v8's PDF tag stays out, since another bank's PDF isn't read. The screen's subtitle says both: "Trimestral o movimientos de tu cuenta de ahorros: de Bancolombia en Excel o PDF, de otro banco en Excel o CSV." Beside it, "Cómo cuidamos tus datos" adds "De otro banco, la IA solo ve sus columnas" (`columns-3`), with the shapes it sees. The empty summary's "Así funciona" downloads from either bank ("Descárgalo de tu banco").

### File row

One per chosen file, in a list with dividers: a 44px icon chip (`--surface-muted`, in ink: `file-spreadsheet` for an Excel file, `file-text` for a PDF, by its format once read and by its name before), the file name (Manrope 700 15px, cut with an ellipsis; it never leaves the browser) and "Quitar" on the right (link action, with an `aria-label` that names the file; the focus then goes back to "Elegir archivos"). Under the name, announced politely:

- Waiting or being read: the step, in Caption `--text-muted` ("Leyendo el archivo…").
- Read: the tags (bank, format, file type, "Excel" or "PDF", and period: "jul–sep 2026" for a statement's own period, "1–15 ago 2026" for a range of movements), then the count ("33 movimientos").
- With a problem: the row sits on the attention surface (`#FFF6EF`, `--radius-md`, reaching past the row so the chips stay aligned), the chip turns white with the 9px orange dot, and it says what happened (Manrope 700 14px) and what to do (Caption), as `v8-13` does: a file that isn't an Excel, a CSV or a PDF, a scanned PDF ("Este PDF no trae texto"), one over 30 pages, one that doesn't open ("Puede estar dañado"), one that isn't a statement.
- **A PDF that asks for its password** (Phase 9.4a, `v8-09` drawn in the row, as several files can wait): the attention surface with the `lock` chip and its dot, "Este PDF tiene contraseña" and "Escríbela para abrirlo; no sale de tu navegador.", the chip and "Quitar" by the title. Under the row (its whole width on phones, the text's from `sm`), outside what is announced, the form (`PdfPasswordForm`): "Contraseña del PDF" (Caption 700); the field as a white pill, as Movimientos's search draws it (§9), with `lock` inside on the left and, on the right, a 44px "Mostrar la contraseña" toggle (`eye-off` while hidden, `eye` once shown, `aria-pressed`); the hint "En Bancolombia suele ser tu número de documento, sin puntos ni espacios. No la guardamos." (Caption `--text-muted`); then the Primary "Abrir PDF" with `lock` and the Secondary "Elegir otro archivo", which takes the file out and opens the picker. Enter opens it. While the password typed is tried, the form stays and the button reads "Abriendo…" (`aria-disabled`, keeping its focus); a wrong one says "Esa contraseña no abre este PDF. Revísala y escríbela de nuevo." in Caption 600 `--danger` as an alert (`aria-invalid` on the field), and the field takes the focus back with its text selected. The field takes the focus when its form appears and the focus is nowhere else (the page, or "Elegir archivos"), never from another field; when a PDF opens and its form goes, the focus goes back to "Elegir archivos". The password that opened a PDF is tried quietly on the others still locked (their rows read "Leyendo el archivo…"); one it doesn't open asks for its own without calling it wrong.

Below the list, a Primary "Subir N archivos" for the files read whose account is settled: a movements export that has to ask waits for the choice. The files go up one at a time; each row keeps its tags and adds a line in Caption 600 `--text-secondary` ("Subiendo…", then "Subido · en cola para procesar"), without "Quitar" once it's on its way. Meanwhile the button reads "Subiendo…" and keeps its focus (`aria-disabled`, faded like a disabled button). A file that got no answer sits on the attention surface ("No se subió") with a "Reintentar" link action under its text. Once sent, the same line follows its job every 2 seconds: "Procesando…", then the row becomes the upload result below; a job that failed sits on the attention surface with what happened, one message per error code as `v8-13` writes them ("No pudimos leer este archivo", "No alcanzamos a procesarlo"), and one open for more than 2 minutes adds a Caption `--text-muted` line: "Está tardando más de lo normal; seguimos revisando." After a reload, the jobs the URL's fragment kept come back as rows named by format and period ("Extracto trimestral jul–sep 2026"), since a file's name never leaves the browser. When the screen stops asking (3 failures in a row, or 10 minutes without a change), a Caption `--text-secondary` line below the list says so, with a "Revisar de nuevo" link action, in a `role="status"` region. When the month's statements run out, the button stays disabled with a caption: "Llegaste al límite de este mes. Se renuevan el 1 de noviembre."

**A file no parser knows** (Phase 11.3a): a spreadsheet with a table reads with the format someone confirmed for it ("Buscando cómo leer este formato…"), and then goes on as any file, its tags naming its bank as its mapping says ("Davivienda · Movimientos · Excel · 1–30 sep 2026"; "Otro banco" when the person chose "Otro"). Without one, the row reads "Formato nuevo: estamos entendiendo sus columnas…" while the LLM proposes, and the screen asks the person (below), also when the LLM proposed nothing (Phase 11.3b): then the view says why and starts from the date alone. Only a session that ended leaves the file unread.

### Confirm how to read a new format ("Confirma cómo leer tu extracto")

As Phases 11.3a and 11.3b build `v8-14` (`ConfirmFormatView`, `features/format-mappings/components/`): while a file no parser knows waits for the person, it takes the upload screen's place, one file at a time, with the app's header and dock around it; its title takes the focus, and once the person confirms or leaves the file out, the focus goes back to "Elegir archivos". Each change of a role or a format reads the file again in its worker (Phase 11.3b), sending nothing, and redoes the test.

- **The top:** the page title "Confirma cómo leer tu extracto" with "No conocíamos este formato. Revisa lo que entendimos: es un minuto y solo esta vez.", and the status pill "Formato nuevo" · "Banco no reconocido" (`attention`) on the right, at full width under it on phones.
- **"Lo que entendimos de cada columna"** (`card`): its title over "Arriba, lo que creemos que es. Abajo, cómo viene en tu archivo. Cambia lo que no esté bien.", and the file's name in a `--surface-muted` pill with `file-spreadsheet` on the right (under them on phones; it never leaves the browser). Then a table that scrolls sideways inside the card on phones, chips included: a row of role chips, one per column, each a native `<select>` drawn as a 44px pill with its icon on the left and a chevron on the right (white with `--shadow-chip`, a 1px `--primary` ring at 40% and a `check` in `--primary`: "Fecha", "Descripción", "Monto", "Salida", "Entrada", "Saldo", "Referencia", "Entra o sale"; "Ignorar" on `--surface-muted` with `eye-off`, in `--text-muted`), named for screen readers by its column ("Qué es la columna Fecha Trans"). A chip offers the roles the other columns leave (Phase 11.3b): one date, one description, one balance and one reference, money read one way (an amount; money out and money in; or an amount and "Entra o sale"), and "Ignorar" always. Under the chips, the header's names as the file writes them on `--surface-muted` (Meta 700, uppercase), and the table's first 5 rows as the file writes them (Body small, `--divider` lines; amounts right-aligned with `tabular-nums`, an ignored column in `--text-muted`, and a row that isn't a movement, such as "SALDO ANTERIOR", struck through in `--text-muted`, which screen readers hear as "Saldo inicial, no es un movimiento"; while the choices don't read the file, no row is struck). Under it, in Caption `--text-muted`: "Y 74 filas más. La fila “SALDO ANTERIOR” se usa como saldo inicial, no como movimiento." Then "Formato del archivo" (Body 700) over 44px white pills (`--shadow-chip`), the term in 600 and its value in `--text-muted`: "Números 1.234,56" and "Fechas día/mes/año", whose values are native `<select>`s with a chevron (the focus ring goes around the whole pill), then "Moneda pesos (COP)", "Empieza en fila 9" and "Termina en fila 87" as a description list without a chevron, since a saved format finds its table by its header's names and ends it at its last date (decided with the human, Phase 11.3b). A format the person leaves unchosen is the one the cells write, so it follows the roles.
- **"Prueba con tu archivo"** (`card`, two thirds of a row; the side third holds "Solo lo confirmas una vez"): "Leímos 78 movimientos con este mapeo." (Caption `--text-muted`), then a list: "Saldo inicial", "+ Entradas (12)" in income's text color, "− Salidas (66)" in spending's, as v8 draws them, and, under a `--divider` line, "Saldo final calculado" in 700, the amounts exact in Outfit 500 with `tabular-nums`. Then the status pill at full width: "Cuadra con tu extracto" · "El archivo dice $2.874.150 al 30 de septiembre." (`ok`), "No cuadra por $12.400" (`attention`; "No cuadra" when a row breaks the chain but the closing balance adds up), or, for a file without balances, only the two ways and "Este archivo no trae saldos" · "Revisa que las entradas y las salidas se vean bien." (`none`). The app works these out; the AI does no sums. While the choices don't read the whole file (Phase 11.3b), the line reads "Así no podemos leer todo el archivo.", the list goes, and the pill (`attention`) says what to change: "Faltan columnas por elegir" · "Elige qué columna tiene la descripción." (or the date, or "Elige cómo viene el dinero: un monto con signo, una salida y una entrada, o un monto y si entra o sale."), "No se lee la fila 8" · "“Fecha Trans” no es una fecha año/mes/día." (or "no es un monto escrito como 1.234,56", "está vacía", "no dice si el dinero entra o sale", "Tiene salida y entrada a la vez."), or "No reconocemos las palabras de “Tipo”" when a direction column's words aren't the banks' (decided with the human: the person doesn't teach new ones). While a change is read again, the line reads "Leyendo tu archivo de nuevo…". The pill is a polite live region, so each change's verdict is heard.
- **"¿De qué banco es?"** (Body 700, its label) over a native `<select>` drawn as a white pill (48px, `--shadow-chip`) with `landmark` on the left and a chevron on the right: "Elige el banco", then core's banks and "Otro". Then the Primary "Confirmar y leer", which waits, focusable, for a reading of the whole file and the bank, saying what it waits for under it in Caption `--text-muted`, as its description: "Corrige lo que no se lee para seguir.", then "Elige el banco para seguir."; and the Secondary "Algo está mal", which leaves the file out, unread, saving nothing. Confirmed, the file reads in its worker with the mapping and goes up with "Subir N archivos", as any file.
- **"Solo lo confirmas una vez"** (`card`): a 44px `--primary-soft` chip with `info` in `--primary`, its title in Body 700 and, in Caption `--text-secondary`, "La IA propone qué es cada columna; las cuentas las hace la app. La IA solo vio los nombres de las columnas y la forma de cada dato, nunca tus movimientos. Guardamos este formato y la próxima vez que subas un extracto de este banco se lee solo." (the middle sentence is ADR 0038's, which v8 doesn't write). Under the test on phones.
- **Without a proposal** (Phase 11.3b; v8 doesn't draw it): when the AI is off, a month's limit is reached, or it failed or never answered, the view opens with only the date the code found, every other column on "Ignorar". The subtitle reads "No conocíamos este formato. Dinos cómo leerlo: es un minuto y solo esta vez."; the columns' card, "Dinos qué es cada columna" over why and what to do ("Ahora no podemos proponer qué es cada columna.", "Este mes ya usaste la IA de tu plan.", "Este mes la IA ya no propone columnas." or "La IA no pudo proponer qué es cada columna.", then "Encontramos la fecha: elige qué es cada una de las otras. Abajo, cómo viene en tu archivo."); and "Solo lo confirmas una vez", "Tú dices qué es cada columna y la app hace las cuentas. Guardamos este formato y la próxima vez que subas un extracto de este banco se lee solo."

### Upload result

A processed file's row in the list, as `v8-08` shows it within Stage 5 (`UploadResult`):

- Header: a 44px chip (`--income-soft` with `circle-check` in `--income-on-soft`), the outcome as Card title ("Listo: leímos tu archivo", "Ya tenías todo este archivo", "Listo: reemplazamos el extracto que no cuadraba"), the file's name in Caption `--text-muted` (its format and period after a reload) and its tags.
- Count tiles: `--surface-muted`, `--radius-md`, padding 12px 16px; the number in Amount L with `tabular-nums` and its meaning in Caption `--text-muted`: "movimientos en el archivo", "ya los tenías: no se duplican", "nuevos". Since Phase 10.1b a fourth, "12 referencias agregadas", when the file's movements gave references to its quarterly statement's or took them from movements files saved before (a phone's or a code's), on `--primary-soft` with its meaning in `--text-secondary`, as information. Three columns, four with the references, two on phones.
- The status pill: "Saldo verificado" · "33 movimientos cuadran", "Sin saldo para verificar" · "Archivo de movimientos" (`--text-faint` dot) or "No cuadra por $810" · "Revisa el archivo". A verified quarterly statement that opens with the closing balance of the account's previous one reads "Encadenado" · "Empieza donde terminó abr–jun 2026", whichever was uploaded first.
- The steps, in order: "Leído en tu navegador", "Reconocido", "Revisando duplicados" and the balance check. Each has a 24px mark (`--income-soft` with a check), its title (Manrope 700 14px) and one Caption `--text-muted` line, joined to the next by a 1px `--divider` line. The first one's line counts the movements ("33 movimientos"); for a PDF, while the page holds what it read, its pages and rows and the descriptions it joined (Phase 9.4b, `v8-08`): "2 páginas · 48 filas. Unimos 3 descripciones partidas en dos líneas.", or "2 páginas · 33 filas" when nothing was joined. After a reload it counts the movements again.
- **What a movements export matched** (Phase 10.1b, `v8-08` and `v8-13`), counted when read, so it reads the same whichever file came first:
  - "Revisando duplicados" says where they were: "48 movimientos ya estaban en tu extracto trimestral.", or, when another file had some, "48 movimientos ya estaban en tu cuenta: no se duplican. De ellos, 28 venían en tu extracto trimestral."; and, when interest matched a day apart, "Los intereses vienen con un día de diferencia entre archivos; igual los reconocimos." (a quarterly statement that took over movements files' movements says it too).
  - The balance check of a movements export: "Verificado con tu extracto trimestral" · "Este archivo no trae saldos, pero todo coincide con jul–sep 2026."; matched in part, "Este archivo no trae saldos" · "15 movimientos coinciden con tu extracto trimestral; los demás, cuando subas el de su periodo."; with nothing to compare, "Este archivo no trae saldos" · "Los movimientos de la Sucursal Virtual no los incluyen. Los verificamos cuando subas el extracto trimestral de ese periodo.". v8-13's "Subir el trimestral" stays out: the drop zone sits right above the result, and this quarter's movements have no quarterly statement yet.
  - "Clasificado", last, when references were added: "12 referencias nuevas, como números de Nequi o de PSE.".
  - **Another bank's account** (Phase 11.3c): what verifies its files is a spreadsheet with balances, so each "tu extracto trimestral" reads "tu archivo con saldos" ("Verificado por tu archivo con saldos", "48 movimientos ya estaban en tu archivo con saldos."), and with nothing to compare, "Los verificamos cuando subas un archivo de ese periodo que traiga saldos.".
- **Today's balance** (Phase 10.3; v8 doesn't draw it, so it's built from its pieces): under the steps of a movements file that reaches today (its last movement is of today or yesterday; decided with the human) and whose last day no verified quarterly statement covers, when one closed before it. On `--primary-soft-2` (`--radius-md`, padding 16): "¿Cuánto ves hoy en tu banco?" (Manrope 700 14px) over "Escribe el saldo total, no el disponible. Lo comparamos con lo que sumamos desde tu último extracto." (Caption `--text-secondary`); the label "Saldo total de hoy" (Caption 700); the field, a white pill as the PDF password's with `$` inside on the left (typed the way someone in Colombia writes it, `inputMode="decimal"`), and the Primary "Comprobar" ("Comprobando…", keeping its focus), which wrap on phones. What can't be read says "Escríbelo como lo ves en tu banco, por ejemplo $7.818.518." in Caption 600 `--danger` as an alert. Answered, the box holds a status pill, "Cuadra con tu banco" · "$7.818.518,82 el 9 de noviembre" or "No cuadra por $12.400" · "Puede faltar un archivo de movimientos." (`attention`), and the link action "Cambiar", which brings the field back; the focus moves between them. A balance typed on another day asks again.
- **A file the account had all of** ("Ya tenías todo este archivo", 10.2d, `v8-13`): its link action is "Ver lo que tienes" instead of "Ver movimientos". It moves the focus to "Lo que tienes ahora" on the same screen, which scrolls there; the URL keeps its fragment, which holds the jobs.
- A statement that doesn't reconcile sits on the attention surface: the file's chip (`file-spreadsheet`, or `file-text` for a PDF) in white with the orange dot, the title "El saldo final no cuadra por $810", "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre.", only the file's count (nothing of it counts), white tiles, and its balance step marked with the orange dot on `--spending-soft`.

### What follows ("Lo que sigue")

As Phase 10.1b builds `v8-08`'s card (`NextStep`): under the upload card, since the results sit in its list (as v8's phone orders them), once the last file done has movements waiting for the quick review in its quarter. A `card` with "Lo que sigue" (Section title); a box on the attention surface (`--radius-md`, padding 16) with the white 44px chip, `circle-alert` and its 9px orange dot, "24 movimientos por revisar en jul–sep 2026" (Manrope 700 14px) over "Confírmalos en la revisión: pueden cambiar tu gasto real." (Caption `--text-secondary`); the Primary "Revisar ahora", to the quick review of that account and quarter, and the Secondary "Ver movimientos", to the file's; then "¿Tienes más archivos? Súbelos todos juntos; si se cruzan, no pasa nada." (Caption `--text-muted`). v8's "1 grupo nuevo por revisar" and "Ahora tenemos los números de Nequi: dinos si alguno es tuyo." count what waits instead, since what's new isn't known once read.

### Uploaded files

"Archivos subidos", beside the upload card on the upload screen (below it on phones), once the user has sent a file (`UploadedFiles`, `v8-07`): a card with its title, "Los más recientes primero." and one row per file sent, newest first, each with a `--divider` line above it.

- Each row: the 44px file chip (`file-text` for a PDF's format), the file named by format and period in Card title with `text-wrap: balance` ("Extracto trimestral jul–sep 2026"; its name never leaves the browser), one Caption `--text-muted` line with what came of it, which starts with its file type ("Excel" or "PDF"), and a badge on the right, under the text on phones:

| What came of it                              | Line                                                        | Badge                         |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| A quarterly statement that reconciles        | "Excel · 379 movimientos · cuadra al centavo"               | "Verificado" (`ok`)           |
| One that starts where the previous ended     | "Excel · 355 movimientos · encadenado"                      | "Verificado" (`ok`)           |
| A movements export with new movements        | "Excel · 21 nuevos · sin saldo para verificar"              | "Sin verificar"               |
| One its quarterly statement verified (10.1b) | "Excel · 14 nuevos · verificado por tu extracto trimestral" | "Verificado" (`ok`)           |
| A file the account already had               | "Excel · 63 ya los tenías · nada nuevo"                     | "Sin cambios"                 |
| One that only added references (10.1b)       | "PDF · 48 ya los tenías · 12 referencias agregadas"         | "Completado" (`info`)         |
| A statement that doesn't reconcile           | "Excel · 33 movimientos · no cuadra por $810"               | "No cuadra" (`attention`)     |
| Another bank's file (11.3c)                  | "Davivienda · 10 movimientos · cuadra al centavo"           | As the rows above             |
| A failed job                                 | What happened, as its error code says it                    | "No se procesó" (`attention`) |
| A job still open                             | "Excel"                                                     | "En proceso"                  |

- Any other line adds the references its movements gave or took before its last fact: "Excel · 33 movimientos · cuadra al centavo · 1 referencia agregada", "Excel · 6 nuevos · 3 referencias agregadas · sin saldo para verificar" (10.1b).
- Another bank's file (Phase 11.3c) starts with its account's bank instead of its type, since the server can't know whether it was an Excel or a CSV (decided with the human); while open, its line says nothing. One its file with balances verified reads "verificado por tu archivo con saldos".
- The first 5 rows show; a link action "Ver N más" shows the rest (the latest 30) and then reads "Ver menos", with `aria-expanded` and the focus kept on it.

### Welcome (onboarding)

As Phase 5.8 builds `v8-15` to `v8-17`, at `/onboarding`, where Clerk sends a new account: signed in, without the app's header and dock, in the waitlist's 1120px column.

- **Header:** the logo, which links nowhere; "Paso 1 de 3" in Caption `--text-muted` and the link action "Saltar" (read "Saltar la bienvenida"), which goes to the upload screen from every step. Below, three 6px segments 8px apart, at most 420px wide (the full width on phones): `--primary` up to the current step, then `--chart-axis`, since `--ring-track` vanishes on the page's background. They only repeat the step's text (`aria-hidden`).
- **Step 1:** the Landing headline, the subtitle in Body `--text-secondary` (18px from `sm`), what works today as a list with neutral 44px chips (`--surface` at 80% with `--shadow-chip`, ink icons), and the Primary "Empezar" with "Gratis. Sin conectar tu banco: tú subes el archivo." beside it. Beside them from `lg`, below on phones, an example panel: the neutral badge "Ejemplo", "Julio a septiembre", the three kinds of an invented quarter (each on `--surface` with `--radius-md` and `--shadow-card`: its ring, its label in Manrope 700 14px and its total in its kind's text color, 18px on phones and Amount L from `sm`), then the statement object and the verified status pill. The rings came back with the summary (6.7a), and "Traduce cada movimiento" ("“PAGO PSE Financiera Andes S” pasa a ser “Cuota de un crédito”.", with `file-text`) joined the list second with the translated statement (8.6c).
- **Step 2:** a card at most 820px wide whose page title is the question. Each file is a radio card (`--surface`, `--radius-md`, `--shadow-card`, padding 20): a 44px chip, `--primary-soft` with a `--primary` icon once chosen and `--surface-muted` with ink before; the title in Body 700, with the `ok` badge "Recomendado" on the quarterly statement; its line in Caption `--text-muted`; and, once chosen, a 2px `--primary` border and a 24px `--primary` circle with a white check. The radios are native, so the arrow keys move the choice, and the focus ring goes around the card. Since Phase 11.3c, "Banco" (Body 700, its label) over a native `<select>` drawn as a white pill (48px, `--shadow-chip`) with `landmark` on the left and a chevron on the right, "Bancolombia" or "Otro", and under it, as its description, "¿No está tu banco? Elige “Otro”: lo leemos y te pedimos confirmar las columnas." in Caption `--text-muted` (`v8-16`). Then "No te pedimos tu nombre…" in Caption `--text-secondary` on `--primary-soft-2` (radius 16, padding 16, `user-round` in `--primary-strong`), and a Secondary "Atrás" and a Primary "Continuar" at each end. The file and the bank go to step 3 in its URL.
- **Step 3:** two cards side by side from `lg` (5:4), stacked on phones: the guides (the page title; a subtitle that follows the step 2 choice; one `--surface-muted` panel per file, the chosen one first, with its icon, its name in Body 700 and its numbered steps, 28px `--primary-soft` circles with `--primary-strong` numbers) and "Súbelos aquí" with the drop zone. With "Otro" (Phase 11.3c), "Trae tus archivos de tu banco", "Descárgalos de tu banco en Excel o CSV. La primera vez te mostramos qué entendimos de cada columna y lo confirmas." and one panel with `globe`, "Movimientos de tu cuenta": where to look, Excel or CSV with each movement's balance if it can, and to confirm the columns the first time.

### The example ("Datos de ejemplo")

v8 draws only its ways in; as Phase 7.8 builds it (`features/example/`, ADR 0030):

- **Ways in** (`ExploreExampleButton`): on the empty summary, a Secondary "Ver con datos de ejemplo" beside "Ir a Subir", stacked on phones (`v8-12`); on the welcome's last step, under the drop zone and a `--divider` line, "¿No los tienes a mano?" in Body 700, "Mira cómo se ve con un extracto de ejemplo." in Caption `--text-muted` and the link action "Explorar con datos de ejemplo" (`v8-17`). The first time it saves the example's data: meanwhile it reads "Abriendo el ejemplo…" and keeps its focus; a failure shows below it in Caption 600 `--danger` with `role="alert"`.
- **The banner** (`ExampleBanner`), first on each page that shows the example (Resumen, Movimientos, Pagos fijos, Categorías and a category, the quick review): `--primary-soft-2`, `--radius-lg`, padding 20, a 44px white chip with `eye` in `--primary-strong`, "Estás viendo un ejemplo" in Body 700 with its line in Caption `--text-secondary`, and the Secondary "Volver a mis datos", on the right from `sm` and at full width below.
- **Read-only:** what would save stays in sight but disabled (a movement's "Es mío", "Deshacer" and corrections, the quick review's answers), under "Es un ejemplo: aquí no se guardan cambios." in Caption 600 `--text-secondary`; "Descargar CSV" isn't offered.

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

`/profile`, as Phases 7.7a to 7.7c build `v8-11`: the page title ("Tu perfil") with its subtitle, then a main column and a side one (§7), which phones stack. Their cards' titles are Section titles (Manrope 700 18px).

- **"Tu cuenta en Xtrakto"** (`XtraktoAccount`, main column, first): a `card` with a 64px `--text` circle holding the initial in white Outfit 500 24px (`aria-hidden`), the name in Outfit 500 22px (the email when Clerk has none), the email in Manrope 14px `--text-secondary` (an email that doesn't fit breaks before its "@"), and "Entras con Google" (`globe`) or "Entras con tu correo" (`mail`) in Caption `--text-muted` with its 16px icon. The Secondary "Administrar inicio de sesión", which opens Clerk's profile, sits on the right from `sm` and below on phones.
- **"Cómo te escribe el banco"** (`BankName`, main column, second): a `card` whose line says where the name comes from and what it's for, then a `--surface-muted` panel (`--radius-sm`, padding 16) with "Titular" and "En tus transferencias aparece así", each a Caption 700 label over its raw-text chips, which wrap: the holder's name as the statements print it, and the texts the rules of the name recognized, whole or cut, the most frequent first (10 at most). Before a file that prints the name (a quarterly statement, or a movements export in PDF), one Caption `--text-muted` line says where it comes from.
- **"Tus cuentas y lo que es tuyo"** (`YourAccounts`, main column, third): a `card` with one row per account and then per rule of the user's that makes something theirs, each with a `--divider` line above it: the moved kind's 44px chip (`landmark` for an account, `smartphone` for a Nequi number, the category's icon for a text), the title in Body 700 ("Cuenta de ahorros · Bancolombia ••••8821"; "Nequi · ref ••• 1270"; who a text pays, "NU COMPANIA DE FINA") with the `ok` badge "Es mío" or "Es mía" for a rule, and one Caption `--text-muted` line ("Detectada en tu extracto.", "Creada con tu archivo de movimientos.", or the text with what it counts as). A rule's row ends in a 44px "×" icon button, named by what it undoes ("Ya no es mío: Nequi terminado en 1270"): it undoes the rule, as a movement's detail does, the row goes and the card's title takes the focus; a failure shows below the row in Caption 600 `--danger`. Without accounts or rules, a Caption `--text-muted` line says where they come from.
- **"Tus datos"** (`YourData`, main column, after "Tus cuentas y lo que es tuyo", Phase 10.2a): a `card` whose line counts the files saved, of every account: "9 archivos: 3 trimestrales y 6 de movimientos." ("2 archivos trimestrales." with one kind, "Aún no tienes archivos." with none; another bank's files apart since Phase 11.3c: "11 archivos: 3 trimestrales, 6 de movimientos y 2 de otros bancos."), then each account's coverage timeline, named by its sentence, and the legend.
- **"Privacidad y datos"** (`PrivacyAndData`, main column): a `card` with three facts, side by side from `md` and stacked below, each on `--surface-muted` (`--radius-sm`, padding 16) with its 18px icon and title in Manrope 700 14px and one Caption `--text-muted` line: "No guardamos tus archivos" (`eye-off`, which names the IP some PDFs print), "Teléfonos de terceros protegidos" (`lock`) and "Sin datos para publicidad" (`shield-check`), saying only what is true today. Below them "Descargar mis datos (CSV)", the line "Borra movimientos, reglas y tu cuenta. No se puede deshacer." in Caption `--text-muted`, and the destructive "Borrar todos mis datos", which the line describes (`aria-describedby`) and which asks in a dialog before deleting; one row from `lg`, stacked and aligned to the left below.
- **"Tu plan"** (`ProfilePlan`, side column, first): a `panel` with the `info` badge "Gratis" beside its title; "Archivos este mes" in Manrope 700 14px with the count on the right ("3 de 10", `tabular-nums`), an 8px meter (`--ring-track`, filled in `--primary`, `role="meter"` named by that label) and "Se reinicia el 1 de noviembre." in Caption `--text-muted`; then, on `--surface-muted` (`--radius-sm`, padding 16), "Archivos de hasta 10 MB" in Manrope 700 14px over "Y hasta 30 páginas por PDF." in Caption `--text-muted`. Only when the month's LLM calls reached the user's limit (8.3), the same box under it in Manrope 14px: "Este mes ya usaste la IA de tu plan: los movimientos que ninguna regla conoce esperan hasta el 1 de noviembre."
- **"Avisos"** (`NoticesSetting`, side column, after "Tu plan", Phases 10.4a to 10.5): a `card` with "Solo por correo. Nunca incluyen montos.", then the row of each notice that exists, with a `--divider` line above it: its name in Manrope 700 14px over one Caption `--text-muted` line ("Cuando tu archivo esté listo", "Si hay algo por revisar", "Si un pago fijo sube", "Resumen del mes", off until the person turns it on, with `v8-11`'s lines), the switch on the right, all inside its `<label>`. It moves at once and goes back if saving fails, with the failure below in Caption 600 `--danger` and `role="alert"`; it stays enabled while saving, so it keeps the focus.
- **"Medición de uso"** (side column, after "Avisos").
- **"Sesión"** (`ProfileSession`, side column, last): "Último inicio de sesión: hoy, 8:42 a. m." in Caption `--text-muted` ("ayer", or the day, in Bogotá), without the browser and system `v8-11` adds, and the Secondary "Cerrar sesión" (`log-out`), which reads "Cerrando sesión…" while Clerk ends the session.

v8 draws more than today brings: "Preguntas hoy" comes with 13.

### Email

v8 doesn't draw it; as Phases 10.4a and 10.4b build it, in tables with inline styles (no web fonts or stylesheets reach an email client), on `--bg`'s first color: the horizontal logo as a PNG, 160px wide, on the background; a white card (radius 16, padding 32) with the title in 24px over the lines in 16px `--text-secondary`, and one primary pill; below the pill, inside the card and each under a `--divider` line, what else the email says, with its title in 18px over its lines and its action as a link in 16px `--primary` 700 (10.4b); under the card, in 13px `--text-muted`, why it arrived and the link to stop it. Each email has its text version. It holds counts and links only: never an amount, a bank's text, a name, an account's digits or a file's name. The first of each month's (10.5) is one part, with its month's name: "Tu resumen de octubre está listo" with "Ver mi resumen", or "Te falta octubre" ("Te falta parte de octubre" when no file reaches its last day), with which file brings it and "Ir a Subir". When an account is another bank's (Phase 11.3c), whose name an email never carries, the file is "tus movimientos de octubre", which any bank gives.

### Unsubscribe page

v8 doesn't draw it; as Phase 10.4a builds it (`/unsubscribe`, public, without a session): the waitlist's frame at 560px, one `card` with the title, one line in Body `--text-secondary` and the primary "Dejar de recibirlos"; then `/unsubscribe/done`, the same with the Secondary "Ir a mi perfil". Both read the same whatever the link holds.

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
- The coverage timeline has a text alternative that states it ("Enero a septiembre de 2026 completo y verificado. Octubre va en movimientos, sin saldo todavía.").
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
