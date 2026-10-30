import { err, MONEY_DIRECTION, ok, type Result } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AiError,
  AiLedger,
  StructuredAnswer,
  StructuredCall,
} from "@/lib/ai";
import { categorizeTexts } from "./llm-categories.service";
import type { CategorizeAnswer } from "./prompts/categorize.v1";

type Generate = (
  call: StructuredCall<CategorizeAnswer>,
) => Promise<Result<StructuredAnswer<CategorizeAnswer>, AiError>>;

// DeepSeek is replaced by a model that answers every line it gets: shopping
// for money out, a refund for money in.
const mocks = vi.hoisted(() => ({ generateStructured: vi.fn<Generate>() }));

vi.mock("@/lib/ai", () => ({ generateStructured: mocks.generateStructured }));

const { IN, OUT } = MONEY_DIRECTION;
const LEDGER: AiLedger = { check: async () => undefined, record: vi.fn() };
const FAILED: AiError = {
  code: "AI_FAILED",
  failures: [{ model: "deepseek-flash", reason: "TIMEOUT" }],
};

const answerEveryLine: Generate = async ({ input }) => {
  const answers = input.split("\n").map((line) => {
    const [, number = "0", direction] = /^(\d+)\. (in|out) \|/.exec(line) ?? [];
    const category = direction === IN ? "refund" : "shopping";
    return { line: Number(number), category, confidence: 0.9 } as const;
  });
  return ok({ value: { answers }, model: "deepseek-flash" });
};

// Texts out, but every third one in.
const textsOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    text: `COMPRA EN TIENDA ${index}`,
    direction: index % 3 === 2 ? IN : OUT,
  }));

const calls = () => mocks.generateStructured.mock.calls.map(([call]) => call);

beforeEach(() => {
  mocks.generateStructured.mockReset();
  mocks.generateStructured.mockImplementation(answerEveryLine);
});

describe("categorizeTexts", () => {
  it("asks in batches of 25 and gives each answer to its text", async () => {
    const { answers, stoppedBy } = await categorizeTexts({
      texts: textsOf(30),
      ledger: LEDGER,
    });

    const [first, second] = calls();
    expect(first?.input.split("\n")).toHaveLength(25);
    expect(second?.input).toBe(
      [
        "1. out | COMPRA EN TIENDA 25",
        "2. in | COMPRA EN TIENDA 26",
        "3. out | COMPRA EN TIENDA 27",
        "4. out | COMPRA EN TIENDA 28",
        "5. in | COMPRA EN TIENDA 29",
      ].join("\n"),
    );
    expect(answers.size).toBe(30);
    expect(answers.get(26)).toEqual({ categoryId: "refund", confidence: 0.9 });
    expect(answers.get(27)).toEqual({
      categoryId: "shopping",
      confidence: 0.9,
    });
    expect(stoppedBy).toBeUndefined();
  });

  it("asks with the categorization prompt, the caller's ledger and models", async () => {
    await categorizeTexts({
      texts: textsOf(1),
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });

    expect(calls()[0]).toMatchObject({
      prompt: { name: "categorize", version: 1 },
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });
  });

  it("stops at the first failure, keeping the answers before it", async () => {
    mocks.generateStructured
      .mockImplementationOnce(answerEveryLine)
      .mockResolvedValueOnce(err(FAILED));

    const { answers, stoppedBy } = await categorizeTexts({
      texts: textsOf(60),
      ledger: LEDGER,
    });

    expect(calls()).toHaveLength(2);
    expect([...answers.keys()]).toEqual(
      Array.from({ length: 25 }, (_, i) => i),
    );
    expect(stoppedBy).toEqual(FAILED);
  });

  it("asks nothing without texts", async () => {
    const { answers } = await categorizeTexts({ texts: [], ledger: LEDGER });

    expect(calls()).toHaveLength(0);
    expect(answers.size).toBe(0);
  });
});
