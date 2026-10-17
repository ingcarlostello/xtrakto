import {
  EDUCATION_WORDS,
  ENTERTAINMENT_WORDS,
  GROCERY_WORDS,
  HEALTH_WORDS,
  HOUSING_WORDS,
  PAYMENT_PREFIXES,
  RESTAURANT_WORDS,
  SHOPPING_WORDS,
  SUBSCRIPTION_WORDS,
  TRANSPORT_WORDS,
} from "./categorization-words.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type { CategorizationRule } from "./categorization.types";

const { OUT } = MONEY_DIRECTION;

/**
 * Purchases and payments by what the merchant sells, the last rules of the
 * table, then any other one as "Otros". Pairs such as AMAZON PRIME and
 * AMAZON, UBER EATS and UBER, or MERCADO LIBRE and MERCADO depend on this
 * order.
 */
export const MERCHANT_RULES = [
  {
    id: "merchant_subscriptions",
    startsWith: PAYMENT_PREFIXES,
    words: SUBSCRIPTION_WORDS,
    direction: OUT,
    categoryId: "subscriptions",
    reasonEs:
      "los pagos a plataformas de video, música o software son suscripciones",
  },
  {
    id: "merchant_restaurants",
    startsWith: PAYMENT_PREFIXES,
    words: RESTAURANT_WORDS,
    direction: OUT,
    categoryId: "restaurants",
    reasonEs:
      "los pagos en restaurantes, cafés y apps de domicilios son restaurantes y domicilios",
  },
  {
    id: "merchant_transport",
    startsWith: PAYMENT_PREFIXES,
    words: TRANSPORT_WORDS,
    direction: OUT,
    categoryId: "transport",
    reasonEs:
      "los pagos de apps de transporte, taxis, gasolina, peajes y parqueaderos son transporte",
  },
  {
    id: "merchant_shopping",
    startsWith: PAYMENT_PREFIXES,
    words: SHOPPING_WORDS,
    direction: OUT,
    categoryId: "shopping",
    reasonEs: "las compras en almacenes y tiendas en línea son compras",
  },
  {
    id: "merchant_groceries",
    startsWith: PAYMENT_PREFIXES,
    words: GROCERY_WORDS,
    direction: OUT,
    categoryId: "groceries",
    reasonEs: "las compras en supermercados son mercado",
  },
  {
    id: "merchant_health",
    startsWith: PAYMENT_PREFIXES,
    words: HEALTH_WORDS,
    direction: OUT,
    categoryId: "health",
    reasonEs:
      "los pagos en droguerías, clínicas y servicios de salud son salud",
  },
  {
    id: "merchant_housing",
    startsWith: PAYMENT_PREFIXES,
    words: HOUSING_WORDS,
    direction: OUT,
    categoryId: "housing",
    reasonEs: "los pagos de arriendo y de conjuntos residenciales son vivienda",
  },
  {
    id: "merchant_entertainment",
    startsWith: PAYMENT_PREFIXES,
    words: ENTERTAINMENT_WORDS,
    direction: OUT,
    categoryId: "entertainment",
    reasonEs: "los pagos de cine, boletas y videojuegos son entretenimiento",
  },
  {
    id: "merchant_education",
    startsWith: PAYMENT_PREFIXES,
    words: EDUCATION_WORDS,
    direction: OUT,
    categoryId: "education",
    reasonEs: "los pagos a universidades, colegios y cursos son educación",
  },
  // A purchase or a payment at a merchant no rule knows is still spending.
  {
    id: "unknown_merchant",
    startsWith: PAYMENT_PREFIXES,
    direction: OUT,
    categoryId: "other_spending",
    reasonEs:
      "es un pago a un comercio que aún no conocemos: cuenta como gasto",
  },
] as const satisfies readonly CategorizationRule[];
