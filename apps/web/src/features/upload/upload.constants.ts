import { APP_ERROR_CODE, PERIOD_SOURCE } from "@xtrakto/core";
import type { AccountType, AppError, PeriodSource } from "@xtrakto/core";
import type {
  IngestionJobError,
  IngestionJobStatus,
  StatementBalance,
} from "@xtrakto/db";
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

/**
 * Content over that cap. Content over the extraction's bounds fails the same
 * way: for the person uploading, both mean the file is too large.
 */
export const CONTENT_TOO_LARGE = {
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "too_large" },
} as const satisfies AppError;

/** Statements a user may send per calendar month in Bogotá (roadmap §2). */
export const MONTHLY_STATEMENT_LIMIT = 10;

/**
 * How the account selector's keys start: one of the user's accounts, or the
 * last 4 digits of an account a quarterly statement of the same upload names.
 */
export const ACCOUNT_KEY_PREFIX = {
  ACCOUNT: "account:",
  LAST4: "last4:",
} as const;

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
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
} as const;

/** A send that got no answer: the connection dropped, or the server failed. */
export const NO_ANSWER = "no_answer";

/** The search param that keeps the jobs sent, so a reload shows them again. */
export const JOBS_PARAM = "jobs";

/** Jobs the screen follows at most: the month's statements. */
export const MAX_TRACKED_JOBS = 10;

/** How often the screen asks how its jobs go. */
export const POLL_INTERVAL_MS = 2_000;

/** Asking stops after this long without any job changing, or 3 failures in a row. */
export const POLL_FOR_MS = 10 * 60_000;
export const MAX_POLL_FAILURES = 3;

// The ingestion job's statuses, for the browser, which imports no values
// from @xtrakto/db.
export const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
} as const satisfies Record<Uppercase<IngestionJobStatus>, IngestionJobStatus>;

export const STATEMENT_BALANCE = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
  NONE: "none",
} as const satisfies Record<Uppercase<StatementBalance>, StatementBalance>;

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

// A statement's own period reads as months, a range of movements as days.
export const FORMAT_PERIOD_SOURCE = {
  "bancolombia-savings-quarterly": PERIOD_SOURCE.STATEMENT,
  "bancolombia-movements-export": PERIOD_SOURCE.ROWS,
} as const satisfies Record<FormatId, PeriodSource>;

export const BANK_LABELS = { bancolombia: "Bancolombia" } as const;

export const FORMAT_BANKS = {
  "bancolombia-savings-quarterly": "bancolombia",
  "bancolombia-movements-export": "bancolombia",
} as const satisfies Record<FormatId, keyof typeof BANK_LABELS>;

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
  sending: "Subiendo…",
  sent: "Subido · en cola para procesar",
  retry: "Reintentar",
  // Once sent: how its job goes.
  statement: "Extracto",
  checking: "Consultando cómo va…",
  processing: "Procesando…",
  processed: "Procesado",
  slow: "Está tardando más de lo normal; seguimos revisando.",
  checkAgain: "Revisar de nuevo",
  checkFailed:
    "No pudimos consultar cómo van tus archivos. Revisa tu conexión.",
  checkTimedOut: "Tus archivos siguen en proceso después de 10 minutos.",
  // The month's count, beside the title (docs/ui/v8-07).
  available: "disponibles",
  filesThisMonth: "Archivos este mes",
  renewsOn: "Se renuevan el",
  limitReached: "Llegaste al límite de este mes.",
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
  // Sending it.
  noAnswer: {
    title: "No se subió",
    detail: "No tuvimos respuesta. Revisa tu conexión y vuelve a intentarlo.",
  },
  chooseAccount: {
    title: "Elige en qué cuenta lo guardamos",
    detail: "Tienes varias cuentas: elige una y vuelve a subirlo.",
  },
  accountGone: {
    title: "Esa cuenta ya no está",
    detail: "Elige otra cuenta y vuelve a subirlo.",
  },
  signedOut: {
    title: "Tu sesión terminó",
    detail: "Vuelve a iniciar sesión y súbelo de nuevo.",
  },
  // Processing it.
  notProcessed: {
    title: "No pudimos procesarlo",
    detail: "Vuelve a subirlo. Lo que ya tenías sigue igual.",
  },
  expired: {
    title: "No alcanzamos a procesarlo",
    detail: "Pasaron 24 horas y borramos lo que enviaste. Súbelo de nuevo.",
  },
} as const;

// Why a job failed, in plain words (docs/ui/v8-13).
export const JOB_PROBLEMS = {
  UNKNOWN_FORMAT: PROBLEM_COPY.notAStatement,
  PARSE_FAILED: PROBLEM_COPY.incomplete,
  ACCOUNT_REQUIRED: PROBLEM_COPY.chooseAccount,
  INTERNAL_ERROR: PROBLEM_COPY.notProcessed,
  CONTENT_EXPIRED: PROBLEM_COPY.expired,
} as const satisfies Record<
  IngestionJobError,
  { readonly title: string; readonly detail: string }
>;

// A file's result once processed (docs/ui/v8-08, within Stage 5).
export const RESULT_COPY = {
  read: "Listo: leímos tu archivo",
  alreadyHad: "Ya tenías todo este archivo",
  replaced: "Listo: reemplazamos el extracto que no cuadraba",
  notReconciled: "El saldo final no cuadra",
  notReconciledBy: "El saldo final no cuadra por",
  notReconciledNote:
    "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre.",
  inFile: {
    one: "movimiento en el archivo",
    other: "movimientos en el archivo",
  },
  had: {
    one: "ya lo tenías: no se duplica",
    other: "ya los tenías: no se duplican",
  },
  new: { one: "nuevo", other: "nuevos" },
  verified: "Saldo verificado",
  reconcile: { one: "cuadra", other: "cuadran" },
  chained: "Encadenado",
  chainedTo: "Empieza donde terminó",
  notReconciledShort: "No cuadra",
  notReconciledShortBy: "No cuadra por",
  checkTheFile: "Revisa el archivo",
  noBalance: "Sin saldo para verificar",
  movementsFile: "Archivo de movimientos",
  stepRead: "Leído en tu navegador",
  stepRecognized: "Reconocido",
  stepDuplicates: "Revisando duplicados",
  noneHad: "Ninguno estaba en tu cuenta.",
  hadIn: "ya estaban en tu cuenta: no se duplican.",
  coveredNote: "Tu extracto trimestral ya los traía.",
  hiddenNote: "Ahora cuentan los de este extracto, que trae saldos.",
  keptApart: "Quedan guardados, pero no cuentan hasta que el saldo cuadre.",
  verifiedDetail: "Cada movimiento cuadra con su saldo, al centavo.",
  notReconciledDetail:
    "Revisa que el archivo esté completo, o sube una versión que cuadre.",
  noBalanceDetail: "Los movimientos de la Sucursal Virtual no traen saldos.",
} as const;
