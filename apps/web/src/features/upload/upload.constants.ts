import type { AccountType } from "@xtrakto/core";
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

export const ACCOUNT_TYPE_LABELS = {
  savings: "Cuenta de ahorros",
  credit_card: "Tarjeta de crédito",
} as const satisfies Record<AccountType, string>;

/** How an account number shows: only its last 4 digits. */
export const MASKED_DIGITS = "••••";

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
  statementAccount: "cuenta",
  savedIn: "Se guardará en",
  chooseAccount: "¿En qué cuenta lo guardamos?",
  chooseAccountPlaceholder: "Elige una cuenta",
} as const;

// design-system.md §11: only what works today, in plain words.
export const FORMATS_COPY = {
  title: "Bancolombia: lo que ya leemos",
  quarterly: {
    title: "Extracto trimestral",
    detail:
      "Trae saldos: lo verificamos al centavo y lo encadenamos con el anterior.",
  },
  movements: {
    title: "Movimientos de la Sucursal Virtual",
    detail:
      "Sin saldos, pero con referencias (Nequi, PSE). Puedes bajar varios rangos del mismo mes: no se duplican.",
  },
} as const;

// Exactly what leaves the browser (ADR 0017) and what is kept of it.
export const PRIVACY_COPY = {
  title: "Cómo cuidamos tus datos",
  reading: {
    title: "Lo leemos en tu navegador",
    detail:
      "El archivo no sale de tu equipo: enviamos solo lo que leemos de él.",
  },
  header: {
    title: "Del encabezado solo usamos tu nombre y tu cuenta",
    detail:
      "Descartamos tu dirección, tu ciudad y la sucursal. Del número de cuenta enviamos solo los últimos 4 dígitos.",
  },
  references: {
    title: "De un celular guardamos solo un código",
    detail:
      "Una referencia, como el celular de un Nequi, queda como un código que no se puede revertir y sus últimos 4 dígitos. El número se borra al terminar de procesar el archivo.",
  },
  deletion: {
    title: "Borras todo cuando quieras",
    detail: "Desde Configuración, en un paso.",
  },
} as const;

// The bank's own download paths (docs/ui/v8-12).
export const HOW_IT_WORKS_COPY = {
  title: "Así funciona",
  download: {
    title: "Descárgalo en Excel de la Sucursal Virtual",
    detail:
      "Documentos → Extractos (trimestral) o Movimientos: Cuentas (del mes).",
  },
  upload: {
    title: "Súbelos todos juntos en Subir",
    detail: "Si los rangos se cruzan, no se duplica nada.",
  },
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
