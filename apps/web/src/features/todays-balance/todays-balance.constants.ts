// Today's balance as a check (10.3): the field in a movements file's result,
// which v8 doesn't draw, and what the pages say of it.
export const TODAYS_BALANCE_COPY = {
  title: "¿Cuánto ves hoy en tu banco?",
  hint: "Escribe el saldo total, no el disponible. Lo comparamos con lo que sumamos desde tu último extracto.",
  label: "Saldo total de hoy",
  placeholder: "7.818.518",
  check: "Comprobar",
  checking: "Comprobando…",
  change: "Cambiar",
  invalid: "Escríbelo como lo ves en tu banco, por ejemplo $7.818.518.",
  failed: "No pudimos comprobarlo. Inténtalo de nuevo.",
  addsUp: "Cuadra con tu banco",
  // "$7.818.518,82 el 9 de noviembre".
  on: "el",
  offBy: "No cuadra por",
  fileMissing: "Puede faltar un archivo de movimientos.",
  // In "Tu cuenta": "No cuadra con tu banco por $12.400".
  offWithBank: "No cuadra con tu banco por",
  // "Con el saldo que escribiste el 9 de noviembre".
  typedOn: "Con el saldo que escribiste el",
  // The chart's and Movimientos's: "Desde el 1 de octubre, el saldo es
  // calculado y cuadra con el de tu banco."
  checkedFrom: "Desde el",
  checkedNote: "el saldo es calculado y cuadra con el de tu banco.",
} as const;
