import type { ChannelId } from "@xtrakto/core";

// Each channel as running text writes it: "por transferencia o PSE".
const CHANNEL_WORDS = {
  pse: "PSE",
  bre_b_key: "llave Bre-B",
  qr: "QR",
  nequi: "Nequi",
  atm: "cajero",
  debit_card: "débito",
  virtual_branch: "sucursal virtual",
  transfer: "transferencia",
  banking_agent: "corresponsal",
} as const satisfies Record<ChannelId, string>;

/** Some channels as running text writes them: `["transferencia", "PSE"]`. */
export const channelWords = (channels: readonly ChannelId[]): string[] =>
  channels.map((id) => CHANNEL_WORDS[id]);
