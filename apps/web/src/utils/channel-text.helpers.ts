import { CHANNELS, type ChannelId, channelOf } from "@xtrakto/core";

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

/**
 * The channels some movements took, from their bank's texts: the most used
 * first, a tie in the table's order.
 */
export const usedChannels = (descriptions: readonly string[]): ChannelId[] => {
  const used = new Map<ChannelId, number>();
  for (const description of descriptions) {
    const channel = channelOf(description);
    if (channel) used.set(channel.id, (used.get(channel.id) ?? 0) + 1);
  }
  return CHANNELS.filter(({ id }) => used.has(id))
    .sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0))
    .map(({ id }) => id);
};
