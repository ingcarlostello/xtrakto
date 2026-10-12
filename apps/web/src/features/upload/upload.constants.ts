// Reading statement files in the browser before sending them. The Spanish copy
// lives here, in one place (project rules §5).

/** Files read at the same time, each in its own worker. */
export const MAX_PARALLEL_EXTRACTIONS = 3;

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

export const UPLOAD_COPY = {
  title: "Subir extracto",
  subtitle: "Bancolombia, cuenta de ahorros.",
  chooseTitle: "Elige uno o varios archivos",
  chooseDescription:
    "Del banco tal como los descargaste. Los leemos aquí, en tu navegador: el archivo no sale de tu equipo.",
  choose: "Elegir archivos",
  notSentYet:
    "Por ahora solo los leemos, sin enviarlos: la subida llega muy pronto.",
  waiting: "En espera",
  stage: {
    reading: "Leyendo el archivo…",
    recognizing: "Reconociendo el formato…",
    preparing: "Preparando la vista previa…",
  },
  ready: "Leído en tu navegador",
  failed: "No pudimos leer este archivo",
  remove: "Quitar",
} as const;
