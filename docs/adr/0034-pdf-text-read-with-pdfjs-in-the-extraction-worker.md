# 0034. PDF text read with pdf.js in the extraction worker

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

Stage 9 reads Bancolombia's PDF statements: the quarterly statement and the movements export. As with spreadsheets, the file and its password never leave the browser ([ADR 0008](0008-files-read-in-the-browser.md)): a Web Worker reads the file and sends only the content its parser reads ([ADR 0017](0017-content-minimized-before-sending.md)), and the tests read the same files in Node. A statement's plain text is no use: from its second page, the quarterly statement writes its columns one after the other, so rows must be rebuilt from where each piece of text sits on the page (ROADMAP, Appendix A.3). Some PDFs come encrypted, usually with the holder's ID number. Next.js's bundler, Turbopack, builds the extraction worker as a classic worker that loads its chunks with `importScripts`.

## Decision

`extractPdf` in `@xtrakto/parsers` reads PDFs with pdf.js (`pdfjs-dist`, Apache 2.0, by Mozilla), pinned to 6.5.438. It uses pdf.js's legacy build, which runs in the browsers the app supports and in Node, and imports it dynamically with the first PDF, so neither an Excel upload nor the server, which receives content already extracted, loads it. pdf.js's worker module goes on `globalThis.pdfjsWorker`, where pdf.js finds it and then parses in the calling thread: the extraction worker in a browser, the test's process in Node.

Only text is read: nothing is drawn, no font, image decoder or canvas is loaded, and nothing is fetched (`useSystemFonts`, `disableFontFace`, `useWasm: false`); a font the file doesn't embed needs only its widths, which pdf.js knows. Each page gives its upright text items: their text with composed letters (NFC), where they start and their baseline from the page's top left, and their width and height, in hundredths of a point. Blank items, marked content and rotated text are dropped. pdf.js takes ownership of the bytes it gets, so it gets a copy. A password needed or wrong, more than 30 pages (checked before the pages are read), a file without text (a scanned statement) and a damaged file come back as error codes, as `extractSpreadsheet`'s do.

## Alternatives considered

- **pdf.js's own worker** (`GlobalWorkerOptions.workerSrc`): a second worker inside the extraction worker, created from a URL Turbopack doesn't follow; the extraction already runs off the page's thread.
- **pdf.js's modern build:** it targets only the newest browsers, and Node needs the legacy build anyway; one build for both keeps the tests on the code the browser runs.
- **Libraries that wrap pdf.js** (`unpdf`, `pdf-parse`): another layer over the same engine, with its own pinned copy of pdf.js; `pdf-parse` gives text without positions.
- **Reading PDFs on the server:** sends the file and its password to the server, which ADR 0008 rules out.

## Consequences

- pdf.js is the largest code the worker loads: about 1.7 MB minified (520 kB compressed) for its library and its worker module, downloaded only once a PDF is chosen. SheetJS's chunk, which every extraction worker loads, is about 360 kB (120 kB compressed).
- pdf.js parses a file the person picked, in the app's origin, so it stays updated. Version 6.5.438 compiles nothing into JavaScript (no `eval` or `new Function` in its code), the path of CVE-2024-4367, and here it draws nothing.
- Its optional native dependency, `@napi-rs/canvas`, comes along for Node, where pdf.js renders with it. It has a build for every platform the project runs on, and the app never loads it.
- pdf.js needs Node 22.13 or later; the root `engines` says so.
- Dependabot and Renovate can follow `pdfjs-dist` on the npm registry, unlike SheetJS's tarball.
- For a PDF, text items with their positions travel (the `pdf` variant of the extracted content, Phase 1.5a). Each PDF parser rebuilds its rows from them (Phase 9.2), in the browser for the preview and on the server.
