/**
 * Colombia's banks and wallets a statement can come from, as the person picks
 * one for a file whose format Xtrakto doesn't know (Stage 11), and "Otro" for
 * any other. An id is stored with each account and statement, so it is never
 * renamed or reused; Bancolombia's is its parsers' own.
 */
export const BANKS = [
  { id: "bancolombia", labelEs: "Bancolombia" },
  { id: "davivienda", labelEs: "Davivienda" },
  { id: "bbva", labelEs: "BBVA" },
  { id: "banco-de-bogota", labelEs: "Banco de Bogotá" },
  { id: "banco-de-occidente", labelEs: "Banco de Occidente" },
  { id: "banco-popular", labelEs: "Banco Popular" },
  { id: "banco-av-villas", labelEs: "Banco AV Villas" },
  { id: "banco-caja-social", labelEs: "Banco Caja Social" },
  { id: "scotiabank-colpatria", labelEs: "Scotiabank Colpatria" },
  { id: "itau", labelEs: "Itaú" },
  { id: "banco-agrario", labelEs: "Banco Agrario" },
  { id: "banco-falabella", labelEs: "Banco Falabella" },
  { id: "banco-gnb-sudameris", labelEs: "Banco GNB Sudameris" },
  { id: "banco-pichincha", labelEs: "Banco Pichincha" },
  { id: "bancoomeva", labelEs: "Bancoomeva" },
  { id: "banco-w", labelEs: "Banco W" },
  { id: "banco-finandina", labelEs: "Banco Finandina" },
  { id: "banco-serfinanza", labelEs: "Banco Serfinanza" },
  { id: "banco-mundo-mujer", labelEs: "Banco Mundo Mujer" },
  { id: "bancamia", labelEs: "Bancamía" },
  { id: "lulo-bank", labelEs: "Lulo Bank" },
  { id: "nu", labelEs: "Nu" },
  { id: "nequi", labelEs: "Nequi" },
  { id: "daviplata", labelEs: "Daviplata" },
  { id: "rappipay", labelEs: "RappiPay" },
  { id: "movii", labelEs: "Movii" },
  { id: "uala", labelEs: "Ualá" },
  { id: "other", labelEs: "Otro" },
] as const;
