import { describe, expect, it } from "vitest";
import { parsedStatementSchema } from "../statements/statement.schemas";
import { BANKS } from "./bank.constants";

describe("BANKS", () => {
  it("names each bank once", () => {
    const ids = BANKS.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BANKS.map(({ id }) => id))(
    "gives %s an id a parsed statement accepts",
    (id) => {
      const bankId = parsedStatementSchema.shape.bankId.safeParse(id);

      expect(bankId.success).toBe(true);
    },
  );
});
