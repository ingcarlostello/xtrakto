import { CHANNELS } from "./channel.constants";
import type { Channel, ChannelDefinition, ChannelId } from "./channel.types";
import {
  compilePattern,
  foldDescription,
  type FoldedDescription,
} from "./rule-matching.helpers";

type TableChannel = ChannelDefinition & { readonly id: ChannelId };

const COMPILED_CHANNELS = CHANNELS.map((channel: TableChannel) => ({
  channel,
  matches: compilePattern(channel),
}));

/**
 * The channel a movement's text names (`"PAGO PSE …"` is PSE), or `null`
 * when it names none, as for interest or the 4x1000.
 */
export const channelOf = (description: string): Channel | null => {
  const folded: FoldedDescription = foldDescription(description);
  const found = COMPILED_CHANNELS.find(
    ({ matches }) => matches(folded) !== undefined,
  );
  return found === undefined
    ? null
    : { id: found.channel.id, labelEs: found.channel.labelEs };
};

/** Who a movement's text names, after the words of its channel. */
export type TextPayee = {
  /** Folded: "PAGO PSE Empresa de Energía" names EMPRESA DE ENERGIA. */
  readonly words: readonly string[];
  /** How many words of the text the channel took before them. */
  readonly channelWords: number;
};

/**
 * The words after the channel's in a movement's text, which name who was
 * paid; every word when the text names no channel, and none when the
 * channel says it all ("TRANSFERENCIAS A NEQUI").
 */
export const payeeOf = (description: string): TextPayee => {
  const folded = foldDescription(description);
  const words =
    COMPILED_CHANNELS.map(({ matches }) => matches(folded)).find(
      (rest) => rest !== undefined,
    ) ?? folded.words;
  return { words, channelWords: folded.words.length - words.length };
};
