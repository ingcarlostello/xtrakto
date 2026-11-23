// A file no parser knows on the upload screen (11.3a): its row's words while
// its format is settled. Without a proposal, the person chooses the columns
// (11.3b), so settling it fails only when the session ends or the file can't
// be read.

export const UNKNOWN_FORMAT_COPY = {
  finding: "Buscando cómo leer este formato…",
  proposing: "Formato nuevo: estamos entendiendo sus columnas…",
  // The first proposal didn't read the file or add up (11.4).
  proposingAgain:
    "Formato nuevo: la primera lectura no cuadró; lo intentamos otra vez…",
  confirming: "Formato nuevo: confirma cómo leerlo.",
  confirmed: "Leyendo con el formato que confirmaste…",
} as const;
