import { describe, expect, it } from "vitest";
import type { HolderNameMatch } from "./categorization.types";
import { matchHolderName } from "./holder-name-match.helpers";

const ANA = "ANA MARIA PRUEBA GOMEZ";
const CARLOS = "CARLOS TELLO RUIZ";
const JUAN = "JUAN PEREZ";

const CASES: readonly (readonly [
  holder: string,
  name: string,
  match: HolderNameMatch | null,
])[] = [
  [ANA, "ANA PRUEBA", "whole"],
  [ANA, "ANA PRUEBA GOMEZ", "whole"],
  [ANA, "ANA MARIA PRUEBA GOMEZ", "whole"],
  [ANA, "ANA MARIA PRUEB", "cut"],
  [ANA, "ANA MARIA PRU", "cut"],
  // A surname already whole, then the next one cut to an initial.
  [ANA, "ANA MARIA PRUEBA G", "cut"],
  // Cut before any surname, as the bank often writes it: probably the holder.
  [ANA, "ANA MARIA", "cut"],
  [ANA, "ANA MARI", "cut"],
  [ANA, "ANA MAR", "cut"],
  // Two letters at the end neither count nor contradict the rest.
  [ANA, "ANA MARIA PR", "cut"],
  [ANA, "ANA", null],
  // Two letters could start anyone's name.
  [ANA, "ANA MA", null],
  [ANA, "ANA LOPEZ", null],
  // A sibling: the same surnames, another first name.
  [ANA, "JUAN PRUEBA GOMEZ", null],
  [ANA, "MARIA PRUEBA", null],
  [ANA, "PRUEBA GOMEZ", null],
  // The holder's words, out of order, or with one they don't have.
  [ANA, "ANA GOMEZ PRUEBA", null],
  [ANA, "ANA MARIA PRUEBA GOMEZ RUIZ", null],
  [CARLOS, "CARLOS TELLO", "whole"],
  [CARLOS, "CARLOS RUIZ", "whole"],
  [CARLOS, "CARLOS TELLO R", "cut"],
  [CARLOS, "CARLOS TEL", "cut"],
  [JUAN, "JUAN PEREZ", "whole"],
  [JUAN, "JUAN PER", "cut"],
  [JUAN, "JUAN", null],
  [JUAN, "JUAN PE", null],
];

describe("matchHolderName", () => {
  it.for(CASES)("reads %s's name in %j as %s", ([holder, name, match]) => {
    expect(matchHolderName(name.split(" "), holder.split(" "))).toBe(match);
  });
});
