# Fonts

Outfit and Manrope (design-system.md §4), as Google Fonts serves them: one variable WOFF2 file each, Latin subset (Spanish letters, `¿ ¡`, `€`, the minus sign `−`). `app/layout.tsx` loads them with `next/font/local`, which self-hosts them as `next/font/google` did, without downloading them on every build. Google's answer varies by where the build runs: in CI, Turbopack couldn't resolve the font addresses of one answer ("next/font/google queries have exactly one entry"), while the same code built locally and in earlier runs.

| File                  | Source                                                        | Weights |
| --------------------- | ------------------------------------------------------------- | ------- |
| `outfit-latin.woff2`  | `fonts.googleapis.com/css2?family=Outfit:wght@100..900`, v15  | 100–900 |
| `manrope-latin.woff2` | `fonts.googleapis.com/css2?family=Manrope:wght@200..800`, v20 | 200–800 |

Both are under the SIL Open Font License 1.1: `outfit-OFL.txt` and `manrope-OFL.txt`, from the google/fonts repository. To update one, download the `/* latin */` file of that request and replace it.
