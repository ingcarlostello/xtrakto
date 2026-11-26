// The welcome a new account sees right after sign-up (docs/ui/v8-15 to
// v8-17), with only what works today: a Bancolombia savings account's files,
// in Excel or PDF, and another bank's, in Excel or CSV (11.3c); a
// Bancolombia card's statement, in Excel or PDF, and a Nu card's, in PDF
// (12.3b). Later stages add their lines (roadmap 5.8).

export const ONBOARDING_STEP_COUNT = 3;

/** What the second step offers to upload first. */
export const FIRST_FILE = {
  QUARTERLY: "quarterly",
  MOVEMENTS: "movements",
  CARD: "card",
} as const;

/** The search param that takes the choice to the last step. */
export const FIRST_FILE_PARAM = "first";

/**
 * Whose files the second step's choice is: Bancolombia's, Nu's, whose card
 * the parsers read (12.3b), or another bank's.
 */
export const FIRST_BANK = {
  BANCOLOMBIA: "bancolombia",
  NU: "nu",
  OTHER: "other",
} as const;

/** The search param that takes the bank to the last step. */
export const BANK_PARAM = "bank";

export const ONBOARDING_COPY = {
  step: "Paso",
  of: "de",
  skip: "Saltar",
  // Read by screen readers after "Saltar".
  skipWhat: " la bienvenida",
} as const;

// docs/ui/v8-15 without what a later stage brings: the chat (13.3).
export const WELCOME_COPY = {
  metaTitle: "Bienvenida",
  title: "Entiende tu extracto en minutos",
  subtitle:
    "Sube el archivo de tu cuenta de ahorros, de Bancolombia o de otro banco, y te lo mostramos en limpio.",
  features: {
    moved: {
      title: "Separa lo que gastaste de lo que solo moviste",
      detail:
        "La plata que pasa a tu inversión o tus tarjetas, o vuelve de tu Nequi, no es gasto ni ingreso.",
    },
    translated: {
      title: "Traduce cada movimiento",
      detail: "“PAGO PSE Financiera Andes S” pasa a ser “Cuota de un crédito”.",
    },
    days: {
      title: "Tus movimientos, día por día",
      detail:
        "Con el texto tal como lo escribe el banco y el saldo de cada día. Busca cualquiera por palabra o por monto.",
    },
    verified: {
      title: "Cada saldo, revisado al centavo",
      detail: "Si algo no cuadra, no lo contamos y te mostramos en qué fila.",
    },
    once: {
      title: "Nada se cuenta dos veces",
      detail:
        "Sube el trimestral y los movimientos del mes aunque se crucen: cada movimiento queda una sola vez.",
    },
  },
  start: "Empezar",
  startNote: "Gratis. Sin conectar tu banco: tú subes el archivo.",
  example: {
    badge: "Ejemplo",
    period: "Julio a septiembre",
    verified: "Saldo verificado",
    verifiedDetail: "312 movimientos cuadran",
    note: "Nunca te mostramos un número que no cuadre con tu banco.",
    // An invented quarter, as the summary's tiles show one (v8-15).
    kinds: [
      { tone: "income", label: "Ingresos", percent: 85, amount: "$46,8M" },
      { tone: "spending", label: "Gasto real", percent: 45, amount: "$24,4M" },
      { tone: "moved", label: "Movido", percent: 55, amount: "$29,8M" },
    ],
  },
} as const;

// docs/ui/v8-16, with the credit card that was "Pronto" (12.3b).
export const FIRST_FILE_COPY = {
  metaTitle: "Qué subir primero",
  title: "¿Qué vas a subir primero?",
  subtitle: "Puedes subir varios tipos; se complementan.",
  quarterly: {
    title: "Extracto trimestral",
    badge: "Recomendado",
    detail: "Trae saldos: lo verificamos al centavo.",
  },
  movements: {
    title: "Movimientos del mes",
    detail: "Sin saldos. Puedes bajar varios rangos: no se duplican.",
  },
  card: {
    title: "Tarjeta de crédito",
    detail: "Compras, cuotas e intereses.",
  },
  // Another bank's spreadsheet is read once the person confirms it (11.3c);
  // of Nu, only its card (12.3b).
  bank: {
    label: "Banco",
    hint: "¿No está tu banco? Elige “Otro”: leemos los movimientos de tu cuenta de ahorros y te pedimos confirmar las columnas.",
    bancolombia: "Bancolombia",
    nu: "Nu",
    other: "Otro",
  },
  // The files that print the holder's name (6.2a, 9.3b, 12.2).
  name: "No te pedimos tu nombre: lo tomamos de tu extracto trimestral, del PDF de tus movimientos o del extracto de tu tarjeta.",
  back: "Atrás",
  next: "Continuar",
} as const;

// docs/ui/v8-17: where each file is downloaded, in Excel or PDF. A PDF may
// ask for its password, never promised: not every one does (Stage 9).
export const DOWNLOAD_COPY = {
  metaTitle: "Trae tus archivos",
  title: "Trae tus archivos de Bancolombia",
  subtitle: {
    quarterly:
      "Con el trimestral basta para empezar. Los movimientos suman referencias y meses recientes.",
    movements:
      "Con los movimientos del mes basta para empezar. El trimestral suma los saldos, que verificamos al centavo.",
    card: "Con el extracto de tu tarjeta ves tus compras, tus cuotas y lo que te cobra. El trimestral y los movimientos suman tu cuenta de ahorros.",
  },
  // A Bancolombia card's statement (12.3b), in Excel or PDF.
  card: {
    title: "Extracto de tu tarjeta de crédito",
    steps: [
      {
        title: "Entra a la Sucursal Virtual Personas",
        detail: "Desde el computador es más fácil.",
      },
      { title: "Ve a Documentos → Extractos" },
      { title: "Elige tu tarjeta de crédito y el mes" },
      {
        title: "Descarga el Excel o el PDF",
        detail: "Si el PDF pide contraseña, suele ser tu número de documento.",
      },
    ],
  },
  // A Nu card's statement (12.3b): a PDF with its password.
  nu: {
    title: "Trae tu extracto de Nu",
    subtitle:
      "Con el extracto de tu tarjeta ves tus compras, tus cuotas y lo que te cobra.",
    guide: {
      title: "Extracto de tu tarjeta Nu",
      steps: [
        { title: "Abre la app de Nu" },
        { title: "Busca los extractos de tu tarjeta" },
        {
          title: "Descarga el PDF del mes",
          detail:
            "Pide contraseña: suele ser tu número de documento. No sale de tu navegador.",
        },
      ],
    },
  },
  // Another bank's card isn't read yet (12.3b): its savings account is.
  otherCardSubtitle:
    "Por ahora leemos las tarjetas de Bancolombia y Nu. De otro banco, descarga los movimientos de tu cuenta de ahorros en Excel o CSV; la primera vez te mostramos qué entendimos de cada columna y lo confirmas.",
  quarterly: {
    title: "Extracto trimestral",
    steps: [
      {
        title: "Entra a la Sucursal Virtual Personas",
        detail: "Desde el computador es más fácil.",
      },
      { title: "Ve a Documentos → Extractos" },
      { title: "Elige tu cuenta de ahorros y el trimestre" },
      {
        title: "Descarga el Excel o el PDF",
        detail: "Si el PDF pide contraseña, suele ser tu número de documento.",
      },
    ],
  },
  movements: {
    title: "Movimientos del mes",
    steps: [
      { title: "Entra a la Sucursal Virtual Personas" },
      { title: "Ve a Movimientos: Cuentas" },
      {
        title: "Elige las fechas y descarga el Excel o el PDF",
        detail: "Del mes actual o de los tres anteriores.",
      },
      {
        title: "¿Varios rangos del mismo mes?",
        detail: "Súbelos todos: si se cruzan, no se duplica nada.",
      },
    ],
  },
  // Another bank's files: its own path isn't known, only what to bring.
  otherBank: {
    title: "Trae tus archivos de tu banco",
    subtitle:
      "Descárgalos de tu banco en Excel o CSV. La primera vez te mostramos qué entendimos de cada columna y lo confirmas.",
    guide: {
      title: "Movimientos de tu cuenta",
      steps: [
        {
          title: "Entra a la banca en línea de tu banco",
          detail: "Desde el computador es más fácil.",
        },
        {
          title: "Busca los movimientos o el extracto de tu cuenta de ahorros",
        },
        {
          title: "Descárgalos en Excel o CSV",
          detail:
            "Si puede traer el saldo de cada movimiento, mejor: así lo verificamos al centavo.",
        },
        {
          title: "Súbelos aquí, sin editarlos",
          detail:
            "La primera vez confirmas qué es cada columna; luego se leen solos.",
        },
      ],
    },
  },
  uploadHere: "Súbelos aquí",
} as const;
