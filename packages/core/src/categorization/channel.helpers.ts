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
