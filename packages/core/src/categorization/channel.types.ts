import type { TextPattern } from "./categorization.types";
import type { CHANNELS } from "./channel.constants";

/** A channel and the bank's texts that name it. */
export type ChannelDefinition = TextPattern & {
  readonly id: string;
  readonly labelEs: string;
};

export type ChannelId = (typeof CHANNELS)[number]["id"];

/** How a movement's money moved, as its tag reads. */
export type Channel = {
  readonly id: ChannelId;
  readonly labelEs: string;
};
