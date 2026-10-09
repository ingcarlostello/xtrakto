# Xtrakto — UI reference screenshots

Screenshots of the **approved design (v7, "Resumen")**. Use them together with [`.claude/rules/design-system.md`](../../.claude/rules/design-system.md) (tokens, components, layout) and [`docs/brand.md`](../brand.md) (logo). The images and their annotations call the design system `design.md`; its section numbers are the same.

**If a screenshot and the design system disagree on an exact value, the design system wins.** The images show layout, hierarchy and feel; the document holds the numbers.

## Files

| File                                  | What it shows                                                                                                       | Use it for                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `00-resumen-anotado.png`              | The full summary page with numbered boxes and a legend that maps each part to its component in design system §9     | Start here: names of every component and where its spec lives |
| `01-resumen-desktop.png`              | Full page at 1440px, 1x                                                                                             | Overall layout, spacing between rows, the two-column grid     |
| `02-header-y-titulo@2x.png`           | Header (logo, greeting, privacy, notifications, avatar) and the title row (legend, period selector, primary button) | Detail at 2x                                                  |
| `03-vistazo-y-cuenta@2x.png`          | Three stat cards with progress rings, and the account card with the status pill                                     | Detail at 2x                                                  |
| `04-saldo-y-donde-se-fue@2x.png`      | Balance vs cumulative spending chart with its annotation, and the 2×2 insight tiles (one in the attention variant)  | Detail at 2x                                                  |
| `05-extracto-traducido-y-chat@2x.png` | Transaction rows (plain words + raw bank text + explanation + amount), filter chips, and the chat panel             | Detail at 2x                                                  |
| `06-dock@2x.png`                      | Navigation dock                                                                                                     | Detail at 2x                                                  |
| `07-resumen-movil-completo.png`       | Full page at 390px wide (2x)                                                                                        | Phone layout, top to bottom                                   |
| `08-resumen-movil-pantalla.png`       | First screen on a phone (390×844, 2x) with the bottom tab bar                                                       | What the user sees on load                                    |

## Notes

- **All figures, names and dates are fictional sample data**, but they are internally consistent:
  - income $46,8M;
  - outflows $54,2M = real spending $24,4M (45%) + moved $29,8M (55%);
  - balance from $13,9M to $6.482.310;
  - 312 transactions.

  Never replace them with real statement data.

- **Header logo:** these screenshots already use the final logo ("Cinta plegada"): mark 40px and wordmark 18px on desktop, 32px and 14.4px on phones. This replaces the text-only wordmark of the original v7 mockup (see `docs/brand.md`).
- **Contrast corrections from design system §3 are applied:** raw bank text uses `#5F6B7A`, and active chip and segment text uses `#1D4ED8`.
- **Phone layout** follows the rules in design system §7, not a separate mockup:
  - one column, 16px side padding;
  - the logo and the notification/avatar buttons share the first row, and the greeting goes below;
  - the period selector and "Subir extracto" are full width;
  - the chart annotation moves below the chart;
  - transaction rows put the amount at the top right;
  - the dock becomes a bottom tab bar with 5 items: Resumen, Movimientos, Subir, Pregúntale, Más.
- **Only the summary screen is designed.** Upload, ingestion status, the transactions page, recurring payments, categories and profile don't have mockups yet. Build them from the same components and tokens (cards, rows, chips, buttons, empty states) and keep the layout rules of design system §7.
- Icons are drawn by hand in the mockup. In the app use Lucide, following the mapping in design system §8.
