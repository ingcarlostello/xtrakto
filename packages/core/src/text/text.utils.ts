/**
 * Text as rules compare it, whatever case, accents or spacing it was written
 * with: `"Pago  PSE Compañía"` becomes `"PAGO PSE COMPANIA"`.
 */
export const foldText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
