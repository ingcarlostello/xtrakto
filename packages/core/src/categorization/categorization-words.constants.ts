// Words the rules look for in a description, folded and split the way
// `wordsOf` splits the bank's text (so "AIR-E" is written "AIR E"). Public
// names only: companies, brands and generic words, never taken from a
// user's statement.

/** Companies of home services: power, water, gas, phone and internet. */
export const UTILITY_WORDS = [
  "ENERGIA",
  "ELECTRIFIC*",
  "EPM",
  "EMPRESAS PUBLICAS",
  "SERVICIOS PUBLICOS",
  "ENEL",
  "CODENSA",
  "CELSIA",
  "AFINIA",
  "AIR E",
  "ESSA",
  "VANTI",
  "GAS",
  "GASES",
  "ACUEDUCTO",
  "ALCANTARIL*",
  "EMCALI",
  "CLARO",
  "COMCEL",
  "MOVISTAR",
  "TELEFONICA",
  "TIGO",
  "ETB",
  "UNE",
  "WOM",
  "DIRECTV",
] as const;

/** Where the user's own savings or investments go. */
export const SAVINGS_WORDS = [
  "INVERSION*",
  "AHORRO*",
  "FIDUCIA*",
  "CDT",
  "TRII",
  "TYBA",
] as const;

/** Banks and fintechs that issue cards. */
export const BANK_WORDS = [
  "BANCO",
  "BANCOLOMBIA",
  "DAVIVIENDA",
  "BBVA",
  "SCOTIABANK",
  "COLPATRIA",
  "ITAU",
  "NU",
  "LULO",
  "RAPPIPAY",
  "TUYA",
  "SERFINANZA",
  "TARJETA*",
] as const;

/** Lenders. NU is a financing company too, so cards are tried first. */
export const LOAN_WORDS = [
  "FINANCIERA",
  "CREDITO*",
  "PRESTAMO*",
  "ICETEX",
  "ADDI",
  "SISTECREDITO",
] as const;

/** Payment gateways, which charge for a store the bank doesn't name. */
export const GATEWAY_WORDS = [
  "BOLD",
  "EBANX",
  "DLOCAL",
  "PAYU",
  "WOMPI",
  "EPAYCO",
  "PLACETOPAY",
  "MERCADOPAGO",
  "MERCADO PAGO",
] as const;
