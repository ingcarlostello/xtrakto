// The welcome a new account sees right after sign-up (docs/ui/v8-15 to
// v8-17), with only what works today: the files of a Bancolombia savings
// account, in Excel or PDF. Later stages add their lines (roadmap 5.8).

export const ONBOARDING_STEP_COUNT = 3;

/** What the second step offers to upload first. */
export const FIRST_FILE = {
  QUARTERLY: "quarterly",
  MOVEMENTS: "movements",
} as const;

/** The search param that takes the choice to the last step. */
export const FIRST_FILE_PARAM = "first";

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
    "Sube el Excel o el PDF de tu cuenta de ahorros Bancolombia y te lo mostramos en limpio.",
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

// docs/ui/v8-16 without the credit card (12.1) and other banks (11.3).
export const FIRST_FILE_COPY = {
  metaTitle: "Qué subir primero",
  title: "¿Qué vas a subir primero?",
  subtitle:
    "De tu cuenta de ahorros Bancolombia, en Excel o PDF. Puedes subir los dos; se complementan.",
  quarterly: {
    title: "Extracto trimestral",
    badge: "Recomendado",
    detail: "Trae saldos: lo verificamos al centavo.",
  },
  movements: {
    title: "Movimientos del mes",
    detail: "Sin saldos. Puedes bajar varios rangos: no se duplican.",
  },
  // The files that print the holder's name (6.2a, 9.3b).
  name: "No te pedimos tu nombre: lo tomamos de tu extracto trimestral o del PDF de tus movimientos.",
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
  },
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
  uploadHere: "Súbelos aquí",
} as const;
