// Words the rules look for in a description, folded and split the way
// `wordsOf` splits the bank's text (so "AIR-E" is written "AIR E"). Public
// names only: companies, brands and generic words, never taken from a
// user's statement.

/** Payments whose next words name who was paid. */
export const PAYMENT_PREFIXES = ["PAGO PSE", "COMPRA EN", "PAGO QR"] as const;

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

// Merchants, by what they sell: generic words and big national chains. A
// stem (`*`) survives the bank cutting a name short in "COMPRA EN".

/** Video, music and software platforms. */
export const SUBSCRIPTION_WORDS = [
  "NETFLIX",
  "SPOTIFY",
  "DISNEY",
  "HBO",
  "AMAZON PRIME",
  "PRIME VIDEO",
  "YOUTUBE",
  "APPLE",
  "ICLOUD",
  "GOOGLE",
  "MICROSOFT",
  "ADOBE",
  "OPENAI",
  "CHATGPT",
  "DEEZER",
  "PARAMOUNT",
  "CRUNCHYROLL",
  "CANVA",
  "DROPBOX",
] as const;

/** Restaurants, cafés and delivery apps. */
export const RESTAURANT_WORDS = [
  "RESTAURA*",
  "CAFE*",
  "PANADER*",
  "PIZZ*",
  "ASADER*",
  "HAMBURGUES*",
  "COMIDA*",
  "DOMICILI*",
  "HELADER*",
  "PARRILLA",
  "SUSHI",
  "RAPPI",
  "IFOOD",
  "UBER EATS",
  "DIDI FOOD",
  "MCDONALD*",
  "MC DONALD*",
  "KFC",
  "FRISBY",
  "CORRAL",
  "JUAN VALD*",
  "STARBUCKS",
  "TOSTAO",
  "OMA",
  "DUNKIN",
  "SUBWAY",
  "DOMINO*",
  "PAPA JOHN*",
  "CREPES",
  "QBANO",
] as const;

/** Ride apps, taxis, fuel, tolls, parking and airlines. */
export const TRANSPORT_WORDS = [
  "UBER",
  "DIDI",
  "CABIFY",
  "INDRIVE",
  "PICAP",
  "TAXI*",
  "TRANSMILENIO",
  "TULLAVE",
  "CIVICA",
  "TERPEL",
  "PRIMAX",
  "TEXACO",
  "BIOMAX",
  "MOBIL",
  "ESSO",
  "GASOLINER*",
  "COMBUSTIBL*",
  "ESTACION DE SERV*",
  "PEAJE*",
  "PARQUEAD*",
  "PARKING",
  "AVIANCA",
  "WINGO",
] as const;

/** Department stores and online shops. */
export const SHOPPING_WORDS = [
  "MERCADO LIBRE",
  "MERCADOLIBRE",
  "AMAZON",
  "ALIEXPRESS",
  "TEMU",
  "SHEIN",
  "FALABELLA",
  "ALKOSTO",
  "KTRONIX",
  "HOMECENTER",
  "DOLLARCITY",
  "MINISO",
  "PANAMERICANA",
  "ZARA",
  "ARTURO CALLE",
  "KOAJ",
  "ADIDAS",
  "NIKE",
  "DECATHLON",
  "PEPE GANGA",
] as const;

/** Supermarkets. */
export const GROCERY_WORDS = [
  "SUPERMERC*",
  "MINIMERC*",
  "MERCADO",
  "FRUVER",
  "CARNICER*",
  "AUTOSERV*",
  "EXITO",
  "CARULLA",
  "OLIMPICA",
  "JUMBO",
  "D1",
  "ARA",
  "ISIMO",
  "MAKRO",
  "PRICESMART",
  "SURTIMAX",
  "SUPERINTER",
] as const;

/** Drugstores, clinics and health services. */
export const HEALTH_WORDS = [
  "DROGUER*",
  "DROGAS",
  "FARMACI*",
  "FARMATODO",
  "CRUZ VERDE",
  "LA REBAJA",
  "LOCATEL",
  "PASTEUR",
  "CLINICA*",
  "HOSPITAL*",
  "ODONTOLOG*",
  "OPTICA*",
  "LABORATORI*",
  "EPS",
  "IPS",
  "COLSANITAS",
  "SANITAS",
] as const;

/** Rent and residential buildings. */
export const HOUSING_WORDS = [
  "ARRIENDO*",
  "ARRENDAM*",
  "INMOBILIAR*",
  "CONJUNTO RESID*",
] as const;

/** Cinemas, tickets and video games. */
export const ENTERTAINMENT_WORDS = [
  "CINE*",
  "PROCINAL",
  "TUBOLETA",
  "STEAM",
  "PLAYSTATION",
  "XBOX",
  "NINTENDO",
] as const;

/** Universities, schools and courses. */
export const EDUCATION_WORDS = [
  "UNIVERSID*",
  "COLEGIO*",
  "PLATZI",
  "COURSERA",
  "UDEMY",
] as const;
