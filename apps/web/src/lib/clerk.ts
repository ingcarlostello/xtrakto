import { esES } from "@clerk/localizations";
import type { NextClerkProviderProps } from "@clerk/nextjs/types";

// Clerk's components drawn with the design tokens of globals.css. Their styles
// go in the "clerk" layer, declared there before Tailwind's utilities, so a
// class passed in `elements` still wins.
export const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "var(--color-primary)",
    colorPrimaryForeground: "var(--color-surface)",
    colorDanger: "var(--color-danger)",
    colorForeground: "var(--color-ink)",
    colorMutedForeground: "var(--color-ink-muted)",
    colorNeutral: "var(--color-ink)",
    colorBackground: "var(--color-surface)",
    colorInput: "var(--color-surface)",
    colorInputForeground: "var(--color-ink)",
    colorRing: "var(--color-primary)",
    borderRadius: "var(--radius-sm)",
  },
  elements: {
    // The auth layout shows the stacked logo above the card.
    logoBox: "hidden",
    cardBox: "rounded-lg shadow-panel",
    formButtonPrimary: "rounded-full shadow-primary",
  },
} satisfies NextClerkProviderProps["appearance"];

const FOR_THE_APP = "para continuar en {{applicationName}}";

// There is no Colombian Spanish in @clerk/localizations; es-ES leaves the
// fewest strings in English but mixes "tú" and "usted". The screens Xtrakto
// shows speak "tú", as the rest of the app (design-system.md §11).
export const clerkLocalization = {
  ...esES,
  formFieldAction__forgotPassword: "¿Olvidaste tu contraseña?",
  formFieldInputPlaceholder__emailAddress: "Escribe tu correo",
  // es-ES leaves it in English, and screen readers read it.
  formFieldInput__emailAddress_format: "Por ejemplo: nombre@correo.com",
  formFieldInputPlaceholder__password: "Escribe tu contraseña",
  formFieldInputPlaceholder__signUpPassword: "Crea una contraseña",
  formFieldInputPlaceholder__firstName: "Escribe tu nombre",
  formFieldInputPlaceholder__lastName: "Escribe tu apellido",
  formFieldLabel__confirmPassword: "Confirma la contraseña",
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Inicia sesión",
      subtitle: FOR_THE_APP,
      actionLink: "Regístrate",
    },
    password: {
      ...esES.signIn?.password,
      title: "Escribe tu contraseña",
      subtitle: FOR_THE_APP,
    },
    emailCode: {
      ...esES.signIn?.emailCode,
      title: "Revisa tu correo",
      subtitle: FOR_THE_APP,
    },
  },
  signUp: {
    ...esES.signUp,
    start: {
      ...esES.signUp?.start,
      subtitle: FOR_THE_APP,
      actionLink: "Inicia sesión",
    },
    continue: {
      ...esES.signUp?.continue,
      title: "Completa los datos que faltan",
      subtitle: FOR_THE_APP,
      actionText: "¿Ya tienes una cuenta?",
    },
    emailCode: {
      ...esES.signUp?.emailCode,
      title: "Verifica tu correo",
      subtitle: FOR_THE_APP,
      formSubtitle: "Escribe el código que enviamos a tu correo",
      resendButton: "Reenviar código",
    },
  },
} satisfies NextClerkProviderProps["localization"];
