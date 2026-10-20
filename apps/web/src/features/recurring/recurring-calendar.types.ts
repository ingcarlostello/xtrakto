/** A day of this month's calendar. */
export type CalendarDay = {
  readonly day: number;
  /** Within a payment's range of days: "del 8 al 12". */
  readonly isInRange: boolean;
  /** A payment's only day: "día 5". */
  readonly isFixedDay: boolean;
  readonly isToday: boolean;
};

/** A fixed payment of this month that hasn't appeared by today. */
export type PendingPayment = {
  readonly key: string;
  /** "Pendiente: GAS NATURAL CIUDAD, del 8 al 12." */
  readonly title: string;
  /** "Aún no aparece. Unos $31 mil, por transferencia o PSE." */
  readonly detail: string;
};

/** When each fixed payment goes out this month (docs/ui/v8-04). */
export type PaymentsCalendarView = {
  /** "Octubre". */
  readonly title: string;
  /** "Cuándo sale cada pago. Hoy es 20 de octubre." */
  readonly subtitle: string;
  /** What a screen reader hears instead of the grid. */
  readonly label: string;
  /** Monday first, `null` outside the month. */
  readonly weeks: readonly (readonly (CalendarDay | null)[])[];
  readonly pending: readonly PendingPayment[];
  /** "Nada pendiente hasta hoy.", once this month's movements are in. */
  readonly note?: string;
};
