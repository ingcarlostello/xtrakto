// The privacy page's copy (7.5): how Xtrakto treats personal data, as
// docs/data-flow.md describes it, in plain Spanish. `{email}` marks where the
// contact address goes, as a link. Only what's true today: a change in what
// the app collects or who receives it changes this page and its date.

/** One section: its title, its paragraphs and, at its end, a list. */
export type PrivacySection = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
};

/** Where the contact address goes in a paragraph. */
export const EMAIL_SLOT = "{email}";

export const PRIVACY_COPY = {
  metaTitle: "Privacidad",
  metaDescription:
    "Qué datos usa Xtrakto, para qué, con quién los comparte y cómo decides sobre ellos.",
  title: "Cómo cuidamos tus datos",
  intro:
    "Qué datos usa Xtrakto, para qué, con quién los comparte y cómo decides sobre ellos.",
  effective: "Vigente desde el 27 de octubre de 2026.",
  sections: [
    {
      id: "responsable",
      title: "Quién es el responsable",
      paragraphs: [
        "Carlos Tello, persona natural con domicilio en Bogotá, Colombia, es el responsable del tratamiento de tus datos en Xtrakto (xtrakto.site).",
        "Para cualquier consulta o solicitud sobre tus datos, escríbenos a {email}.",
      ],
    },
    {
      id: "datos",
      title: "Qué datos usamos y para qué",
      paragraphs: [
        "Usamos tus datos solo para mostrarte en qué se fue tu dinero. No los vendemos, no los usamos para publicidad y no los compartimos para nada más.",
      ],
      items: [
        "Tu cuenta: tu nombre y tu correo, para que inicies sesión. Si entras con Google, Google nos da tu nombre y tu correo.",
        "Tus extractos: tu navegador lee el archivo y nos envía solo lo que necesitamos para entenderlo: los movimientos (fecha, texto del banco, valor y saldo), el periodo, los saldos, el nombre del titular y los últimos 4 dígitos de la cuenta. Nunca nos llega el archivo, ni la contraseña de un PDF, ni tu dirección, ni el número completo de tu cuenta.",
        "El nombre del titular, para reconocer las transferencias entre tus propias cuentas.",
        "Los números de Nequi o de cuenta de otras personas que traen tus movimientos: los guardamos cifrados con una clave secreta, y solo vemos sus últimos 4 dígitos. Los textos del banco pueden nombrar a quién le transferiste; solo tú los ves.",
        "Tus respuestas en la revisión rápida y tus correcciones de categoría, para clasificar tus movimientos.",
        "La lista de espera: tu nombre y tu correo, solo para avisarte cuando Xtrakto esté disponible.",
      ],
    },
    {
      id: "medicion",
      title: "Medición de uso",
      paragraphs: [
        "Si la aceptas, contamos qué partes de la app usas, por ejemplo que abriste tu resumen o que un archivo no se pudo leer. Lo hacemos con un identificador al azar de tu navegador, sin montos, nombres, textos del banco, direcciones web ni tu ubicación.",
        "La aceptas o la rechazas en el aviso que ves al entrar, y cambias tu respuesta cuando quieras en Configuración. Si la retiras, borramos ese identificador de tu navegador.",
      ],
    },
    {
      id: "terceros",
      title: "Con quién los compartimos",
      paragraphs: [
        "Para funcionar, Xtrakto usa estos proveedores, que tratan los datos por encargo nuestro y solo para lo que les pedimos. Sus servidores están en Estados Unidos, así que tus datos se transfieren a ese país.",
      ],
      items: [
        "Vercel aloja la app.",
        "Neon guarda la base de datos.",
        "Clerk maneja tu inicio de sesión, y Google si entras con él.",
        "Inngest procesa tus archivos en segundo plano: solo recibe identificadores, nunca tus movimientos.",
        "Sentry recibe los errores técnicos, sin montos ni textos del banco.",
        "PostHog recibe la medición de uso, solo si la aceptas.",
        "Hostinger administra el dominio, y Forward Email reenvía los correos que nos escribes.",
      ],
    },
    {
      id: "tiempo",
      title: "Cuánto tiempo los guardamos",
      paragraphs: [],
      items: [
        "Lo que tu navegador envía de un archivo: hasta que termina de procesarse, y como máximo 24 horas.",
        "Tus movimientos, cuentas, reglas y respuestas: mientras tengas tu cuenta, o hasta que los borres.",
        "Tu lugar en la lista de espera: hasta que te avisemos del lanzamiento, o hasta que nos pidas borrarlo.",
        "Los errores técnicos y la medición de uso: el tiempo que los conservan Sentry y PostHog.",
      ],
    },
    {
      id: "seguridad",
      title: "Cómo los protegemos",
      paragraphs: [
        "Todo viaja cifrado. La base de datos solo deja ver a cada persona sus propios datos, aunque una consulta se equivoque. Y lo que más te identifica, como el archivo, la contraseña del PDF o el número de tu cuenta, nunca sale de tu navegador.",
      ],
    },
    {
      id: "derechos",
      title: "Tus derechos",
      paragraphs: [
        "Según la Ley 1581 de 2012, puedes conocer, actualizar y corregir tus datos; pedir prueba de tu autorización; saber cómo los usamos; retirar tu autorización o pedir que los borremos; y presentar quejas ante la Superintendencia de Industria y Comercio después de escribirnos.",
        "Para ejercerlos, escríbenos a {email} desde el correo de tu cuenta y dinos qué necesitas. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.",
      ],
    },
    {
      id: "borrar",
      title: "Cómo descargar o borrar tus datos",
      paragraphs: [
        "En Configuración, «Descargar mis datos (CSV)» te da todos tus movimientos guardados en un archivo que abres con Excel.",
        "Ahí mismo, «Eliminar mi cuenta y mis datos» borra tus extractos, tus movimientos, tus cuentas, tus reglas y tu usuario, de una vez. No se puede deshacer.",
      ],
    },
    {
      id: "navegador",
      title: "Lo que guardamos en tu navegador",
      paragraphs: [
        "Clerk guarda cookies para mantener tu sesión abierta. Xtrakto guarda tu respuesta sobre la medición de uso y, si la aceptas, el identificador al azar de PostHog. No usamos cookies de publicidad.",
      ],
    },
    {
      id: "cambios",
      title: "Si esta política cambia",
      paragraphs: [
        "Actualizamos esta página y su fecha. Si el cambio toca algo que aceptaste, te lo preguntamos de nuevo.",
      ],
    },
  ],
} as const satisfies {
  readonly sections: readonly PrivacySection[];
} & Record<string, unknown>;
