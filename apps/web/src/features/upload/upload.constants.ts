import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError } from "@xtrakto/core";
import type {
  IngestionJobError,
  IngestionJobStatus,
  StatementBalance,
} from "@xtrakto/db";
import type { FormatId } from "@xtrakto/parsers";
import type { BANK_LABELS } from "@/utils/account-label.constants";

// Reading statement files in the browser before sending them. The Spanish copy
// lives here, in one place (project rules §5).

/** Files read at the same time, each in its own worker. */
export const MAX_PARALLEL_EXTRACTIONS = 3;

/** The largest file accepted, as the free tier allows (roadmap §2). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** The file types read: the bank's Excel export and its PDF. */
export const ACCEPTED_EXTENSIONS = [".xlsx", ".pdf"] as const;

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
  LOCKED: "locked",
  // A file no parser knows (11.3a): looked up, proposed, confirmed.
  FINDING_FORMAT: "finding_format",
  PROPOSING: "proposing",
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
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

/**
 * Reasons of the problems found in the browser, as the page's checks and a
 * PDF's extraction give them: analytics counts each one by its reason.
 */
export const FILE_PROBLEM = {
  TYPE: "file_type",
  SIZE: "file_size",
  DUPLICATE: "duplicate",
  UNREADABLE: "unreadable",
  SCANNED: "no_text",
  TOO_MANY_PAGES: "too_many_pages",
} as const;

/** Why a PDF didn't open, as its extraction says: it asks for its password. */
export const PDF_PASSWORD_REASONS: ReadonlySet<unknown> = new Set([
  "password_required",
  "password_incorrect",
]);

// Keyed by the parsers' format ids, as the formats' labels are
// (`utils/statement-label.constants.ts`).
export const FORMAT_BANKS = {
  "bancolombia-savings-quarterly": "bancolombia",
  "bancolombia-savings-quarterly-pdf": "bancolombia",
  "bancolombia-movements-export": "bancolombia",
  "bancolombia-movements-export-pdf": "bancolombia",
} as const satisfies Record<FormatId, keyof typeof BANK_LABELS>;

export const UPLOAD_COPY = {
  title: "Subir extracto",
  subtitle:
    "Trimestral o movimientos del mes de tu cuenta de ahorros Bancolombia, en Excel o PDF.",
  chooseTitle: "Elige uno o varios archivos",
  chooseDescription:
    "Del banco tal como los descargaste. No tienes que editarlos ni renombrarlos.",
  dropTitle: "Arrastra tus extractos aquí",
  choose: "Elegir archivos",
  // MAX_FILE_SIZE_BYTES and core's MAX_PDF_PAGES.
  dropHint:
    "Hasta 10 MB y 30 páginas por archivo. Los leemos en tu navegador: el archivo no sale de tu equipo.",
  fileList: "Archivos elegidos",
  waiting: "En espera",
  stage: {
    reading: "Leyendo el archivo…",
    recognizing: "Reconociendo el formato…",
    preparing: "Preparando la vista previa…",
  },
  // A PDF that opens only with its password (docs/ui/v8-09).
  locked: {
    title: "Este PDF tiene contraseña",
    detail: "Escríbela para abrirlo; no sale de tu navegador.",
    label: "Contraseña del PDF",
    hint: "En Bancolombia suele ser tu número de documento, sin puntos ni espacios. No la guardamos.",
    wrong: "Esa contraseña no abre este PDF. Revísala y escríbela de nuevo.",
    show: "Mostrar la contraseña",
    open: "Abrir PDF",
    opening: "Abriendo…",
    chooseAnother: "Elegir otro archivo",
  },
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
  password: {
    title: "La contraseña del PDF no sale de tu equipo",
    detail: "La usamos para abrirlo aquí mismo y la olvidamos.",
  },
  header: {
    title: "Del encabezado solo usamos tu nombre y tu cuenta",
    detail:
      "Descartamos tu dirección, tu ciudad, la sucursal y la IP que traen algunos PDF. Del número de cuenta enviamos solo los últimos 4 dígitos.",
  },
  references: {
    title: "De un celular guardamos solo un código",
    detail:
      "Una referencia, como el celular de un Nequi, queda como un código que no se puede revertir y sus últimos 4 dígitos. El número se borra al terminar de procesar el archivo.",
  },
  deletion: {
    title: "Borras todo cuando quieras",
    detail: "Desde tu perfil, en un paso.",
  },
} as const;

// The bank's own download paths (docs/ui/v8-12).
export const HOW_IT_WORKS_COPY = {
  title: "Así funciona",
  download: {
    title: "Descárgalo en Excel o PDF de la Sucursal Virtual",
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
  wrongType: {
    title: "Este archivo no es un Excel ni un PDF",
    detail:
      "Descárgalo del banco en Excel (.xlsx) o en PDF, los formatos que leemos.",
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
      "No parece un extracto de Bancolombia. Revisa que sea el Excel o PDF que descargaste del banco, sin editar.",
  },
  incomplete: {
    title: "No pudimos leer este extracto completo",
    detail:
      "Lo reconocimos, pero una parte no viene como la escribe el banco. Descárgalo de nuevo, sin editar.",
  },
  damaged: {
    title: "No pudimos abrir este archivo",
    detail: "Puede estar dañado. Descárgalo de nuevo del banco.",
  },
  scanned: {
    title: "Este PDF no trae texto",
    detail:
      "Parece escaneado o una foto. Descárgalo de nuevo del banco, que lo entrega con el texto que leemos.",
  },
  tooManyPages: {
    title: "Este PDF tiene más de 30 páginas",
    detail:
      "Un extracto del banco tiene muchas menos. Revisa que sea el archivo que descargaste.",
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
