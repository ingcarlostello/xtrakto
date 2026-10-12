import type { FormatId } from "@xtrakto/parsers";

// Reading statement files in the browser before sending them. The Spanish copy
// lives here, in one place (project rules §5).

/** Files read at the same time, each in its own worker. */
export const MAX_PARALLEL_EXTRACTIONS = 3;

/** The largest file accepted, as the free tier allows (roadmap §2). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** The only file type read today: the bank's Excel export. */
export const ACCEPTED_EXTENSION = ".xlsx";

/**
 * Most bytes of minimized content one file may send, as JSON: under the
 * 4.5 MB request bodies Vercel Functions accept, with room for the server
 * action's own encoding. A quarter of minimized movements is about 40 KB.
 */
export const MAX_UPLOAD_CONTENT_BYTES = 3_500_000;

/** The steps of reading a file, in order. */
export const EXTRACTION_STAGE = {
  READING: "reading",
  RECOGNIZING: "recognizing",
  PREPARING: "preparing",
} as const;

export const UPLOAD_STATUS = {
  WAITING: "waiting",
  EXTRACTING: "extracting",
  READY: "ready",
  FAILED: "failed",
} as const;

/** Reasons of the problems found in the browser, next to the extraction's. */
export const FILE_PROBLEM = {
  TYPE: "file_type",
  SIZE: "file_size",
  DUPLICATE: "duplicate",
  UNREADABLE: "unreadable",
} as const;

// Keyed by the parsers' format ids: the build fails if a format has no label.
export const FORMAT_LABELS = {
  "bancolombia-savings-quarterly": "Extracto trimestral",
  "bancolombia-movements-export": "Movimientos",
} as const satisfies Record<FormatId, string>;

export const BANK_LABELS = { bancolombia: "Bancolombia" } as const;

export const UPLOAD_COPY = {
  title: "Subir extracto",
  subtitle:
    "Trimestral o movimientos del mes de tu cuenta de ahorros Bancolombia, en Excel.",
  chooseTitle: "Elige uno o varios archivos",
  chooseDescription:
    "Del banco tal como los descargaste. No tienes que editarlos ni renombrarlos.",
  dropTitle: "Arrastra tus extractos aquí",
  choose: "Elegir archivos",
  dropHint:
    "Hasta 10 MB por archivo. Los leemos en tu navegador: el archivo no sale de tu equipo.",
  fileList: "Archivos elegidos",
  waiting: "En espera",
  stage: {
    reading: "Leyendo el archivo…",
    recognizing: "Reconociendo el formato…",
    preparing: "Preparando la vista previa…",
  },
  excel: "Excel",
  movements: { one: "movimiento", other: "movimientos" },
  remove: "Quitar",
  submit: "Subir",
  files: { one: "archivo", other: "archivos" },
  notSentYet:
    "La subida llega muy pronto: por ahora solo los leemos en tu navegador.",
} as const;

// What happened and what to do, without apologizing (design-system.md §11).
export const PROBLEM_COPY = {
  notExcel: {
    title: "Este archivo no es un Excel",
    detail: "Descárgalo del banco en Excel (.xlsx), el formato que leemos.",
  },
  tooHeavy: {
    title: "Pesa más de 10 MB",
    detail:
      "Un extracto del banco pesa mucho menos. Revisa que sea el archivo que descargaste.",
  },
  duplicate: {
    title: "Ya está en la lista",
    detail: "Elegiste este archivo dos veces; basta con uno.",
  },
  notAStatement: {
    title: "No pudimos leer este archivo",
    detail:
      "No parece un extracto de Bancolombia. Revisa que sea el Excel que descargaste del banco, sin editar.",
  },
  incomplete: {
    title: "No pudimos leer este extracto completo",
    detail:
      "Lo reconocimos, pero una parte no viene como la escribe el banco. Descárgalo de nuevo, sin editar.",
  },
  damaged: {
    title: "No pudimos abrir este archivo",
    detail:
      "Puede estar dañado o protegido con contraseña. Descárgalo de nuevo del banco.",
  },
  tooLarge: {
    title: "Este archivo es demasiado grande",
    detail:
      "Trae muchos más datos que un extracto del banco. Revisa que sea el archivo correcto.",
  },
  unreadable: {
    title: "No pudimos abrir este archivo",
    detail: "Vuelve a elegirlo; si sigue igual, descárgalo de nuevo del banco.",
  },
} as const;
