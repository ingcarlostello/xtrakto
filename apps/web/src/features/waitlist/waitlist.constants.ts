// The waitlist's copy, from the human's design ("Xtrakto — Landing lista de
// espera"), in one place (project rules §5).

/** Where people ask for their data to be deleted; the consent names it. */
export const CONTACT_EMAIL = "hola@xtrakto.site";

/**
 * The consent people give, and its version, stored with each entry as the
 * proof of what they accepted (ADR 0021). A new text needs a new version.
 */
export const CONSENT_VERSION = "2026-10-15";
export const CONSENT_TEXT = {
  label:
    "Autorizo a Xtrakto a guardar mi nombre y mi correo solo para avisarme cuando la app esté disponible.",
  detail: `No los vendemos ni los usamos para nada más. Para borrarlos, escríbenos a ${CONTACT_EMAIL}.`,
} as const;

/** The longest name and email accepted, as the database checks them. */
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

export const WAITLIST_COPY = {
  metaTitle: "Lista de espera",
  metaDescription:
    "Xtrakto separa lo que gastaste de lo que solo moviste en tu extracto de Bancolombia. Entra a la lista de espera y te avisamos cuando esté lista.",
  badge: "Para extractos de Bancolombia · Muy pronto",
  // Its two kinds go in their colors (design-system.md §3.4).
  title: {
    before: "Separa lo que ",
    spent: "gastaste",
    middle: " de lo que solo ",
    moved: "moviste",
    after: ".",
  },
  subtitle:
    "Subes tu extracto de Bancolombia y Xtrakto te muestra, en palabras normales, cuánto fue gasto real y cuánta plata solo pasó entre tus cuentas, tu tarjeta o tu ahorro.",
  form: {
    title: "Entra a la lista de espera",
    detail:
      "Te avisamos por correo cuando la app esté lista. Sin registro ni contraseña.",
    name: "Nombre",
    namePlaceholder: "Cómo te llamas",
    email: "Correo",
    emailPlaceholder: "tu@correo.com",
    submit: "Unirme a la lista",
    sending: "Guardando…",
    consentFirst: "Marca la casilla para poder enviar.",
  },
  errors: {
    name: "Escribe tu nombre.",
    nameTooLong: "Escribe un nombre de hasta 100 letras.",
    email: "Revisa tu correo: parece que le falta algo.",
    failed: {
      title: "No pudimos guardarte",
      detail: "Recarga la página y vuelve a intentarlo.",
    },
  },
  joined: {
    metaTitle: "Ya estás en la lista",
    title: "Ya estás en la lista",
    detail: "Te avisaremos a tu correo cuando Xtrakto esté disponible.",
    deletion: `¿Quieres que borremos tus datos? Escríbenos a ${CONTACT_EMAIL}.`,
  },
  footer: {
    copyright: "© 2026 Xtrakto · xtrakto.site",
    contact: `Contacto: ${CONTACT_EMAIL}`,
  },
} as const;

/** The promo video (ADR 0020), rendered by apps/video. */
export const PROMO_VIDEO = {
  src: "/video/xtrakto-promo.mp4",
  poster: "/video/xtrakto-promo-poster.jpg",
} as const;

// The rest of the landing (16.0c). The figures are the design's example, as
// the promo video shows them: invented, and said to be.
export const LANDING_COPY = {
  join: { full: "Unirme a la lista", short: "Unirme" },
  glance: {
    title: "Tu trimestre, de un vistazo",
    example: "Ejemplo con datos ficticios",
    bar: "De lo que salió, el 45% fue gasto real y el 55% solo se movió.",
    figures: [
      { kind: "income", label: "Entró", amount: "$46,8M" },
      { kind: "spending", label: "Gasto real", amount: "$24,4M" },
      { kind: "moved", label: "Solo movido", amount: "$29,8M" },
    ],
  },
  video: {
    title: "Míralo en un minuto",
    play: "Reproducir el video",
    description:
      "Video de 52 segundos, con música y sin voz, sobre datos ficticios: el extracto del banco, el Excel que se sube, lo que entró, lo que se gastó y lo que solo se movió, las categorías, los pagos fijos y los movimientos.",
  },
  benefits: {
    title: "Lo que vas a poder hacer",
    colors: {
      title: "Tu plata en tres colores",
      detail:
        "Verde lo que entró, naranja lo que gastaste de verdad y azul lo que solo pasó entre tus cuentas, tu tarjeta o tu ahorro.",
    },
    movements: {
      title: "Cada movimiento, entendible",
      detail:
        "Ves el texto tal como lo escribe el banco, junto a qué fue y por dónde salió: PSE, Nequi o llave Bre-B.",
      sample: "PAGO PSE Electrificadora de",
    },
    privacy: {
      title: "Tu archivo no sale de tu equipo",
      detail:
        "Lo leemos en tu navegador. Al servidor solo llega lo que leemos de él, nunca el archivo.",
    },
  },
} as const;
