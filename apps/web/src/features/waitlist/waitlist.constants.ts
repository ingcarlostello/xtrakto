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
  title: "Separa lo que gastaste de lo que solo moviste.",
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
