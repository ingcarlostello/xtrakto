import { randomUUID } from "node:crypto";
import { COLUMN_ROLE, err, ok, type Result } from "@xtrakto/core";
import {
  createDb,
  type DbClient,
  findUserId,
  resolveIdentifiedAccount,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  AiError,
  AiLedger,
  StructuredAnswer,
  StructuredCall,
} from "@/lib/ai";
import {
  proposeColumnRoles,
  proposeRolesFor,
} from "./mapping-proposal.service";
import type { ProposeMappingAnswer } from "./prompts/propose-mapping.v1";

type Generate = (
  call: StructuredCall<ProposeMappingAnswer>,
) => Promise<Result<StructuredAnswer<ProposeMappingAnswer>, AiError>>;

// DeepSeek is replaced by a model that reads every table the same way. A
// user's ledger lets every call through and says whose it is; the database
// is the test one, as the application role.
const mocks = vi.hoisted(() => ({
  generateStructured: vi.fn<Generate>(),
  ledgerUsers: [] as string[],
  db: undefined as unknown,
}));

vi.mock("@/lib/ai", () => ({ generateStructured: mocks.generateStructured }));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/features/llm-usage/llm-usage.service", () => ({
  userLedger: (userId: string) => {
    mocks.ledgerUsers.push(userId);
    return LEDGER;
  },
}));

const { DATE, DESCRIPTION, MONEY_OUT, MONEY_IN } = COLUMN_ROLE;
const ROLES = [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN];
const LEDGER: AiLedger = { check: async () => undefined, record: vi.fn() };
const FAILED: AiError = {
  code: "AI_FAILED",
  failures: [{ model: "deepseek-flash", reason: "INVALID_OUTPUT" }],
};

const SAMPLE = {
  header: [
    "FECHA",
    "MOVIMIENTOS DE ANA MARIA PRUEBA GOMEZ",
    "DEBITOS",
    "CREDITOS",
  ],
  rows: [["99/99/9999", "AAAAAA AAA", "99.999,99", ""]],
};

const calls = () => mocks.generateStructured.mock.calls.map(([call]) => call);

beforeEach(() => {
  mocks.generateStructured.mockReset();
  mocks.generateStructured.mockResolvedValue(
    ok({ value: { roles: ROLES }, model: "deepseek-flash" }),
  );
  mocks.ledgerUsers.length = 0;
});

describe("proposeColumnRoles", () => {
  it("asks with the proposal prompt, the sample's lines, and the caller's ledger and models", async () => {
    const proposal = await proposeColumnRoles({
      sample: SAMPLE,
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });

    expect(proposal).toEqual(ok({ roles: ROLES, model: "deepseek-flash" }));
    expect(calls()[0]).toMatchObject({
      prompt: { name: "propose-mapping", version: 1 },
      ledger: LEDGER,
      models: ["deepseek-v4-pro"],
    });
    expect(calls()[0]?.input.split("\n")[0]).toBe('1. FECHA: ["99/99/9999"]');
  });

  it("asks for a role for each of the sample's columns", async () => {
    await proposeColumnRoles({ sample: SAMPLE, ledger: LEDGER });
    const schema = calls()[0]?.prompt.schema;

    expect(schema?.safeParse({ roles: ROLES }).success).toBe(true);
    expect(schema?.safeParse({ roles: ROLES.slice(1) }).success).toBe(false);
  });

  it("gives back the AI's failure", async () => {
    mocks.generateStructured.mockResolvedValue(err(FAILED));

    expect(
      await proposeColumnRoles({ sample: SAMPLE, ledger: LEDGER }),
    ).toEqual(err(FAILED));
  });
});

describe.skipIf(!testDatabase)("proposeRolesFor", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.db = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const newClerkId = () => `user_proposal_${randomUUID()}`;

  it("creates the user's row on their first proposal, and their ledger pays for it", async () => {
    const clerkUserId = newClerkId();

    expect(await proposeRolesFor(clerkUserId, SAMPLE)).toEqual(
      ok({ roles: ROLES, model: "deepseek-flash" }),
    );
    const userId = await findUserId(app.db, clerkUserId);
    expect(userId).toBeDefined();
    expect(mocks.ledgerUsers).toEqual([userId]);
  });

  it("redacts the user's holder names before the names leave", async () => {
    const clerkUserId = newClerkId();
    await proposeRolesFor(clerkUserId, SAMPLE);
    const userId = await findUserId(app.db, clerkUserId);
    if (!userId) throw new Error("The user wasn't created.");
    await withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        currency: "COP",
        last4: "1234",
        holderNameNormalized: "ANA MARIA PRUEBA GOMEZ",
      }),
    );

    await proposeRolesFor(clerkUserId, SAMPLE);

    expect(calls()[0]?.input).toContain("2. MOVIMIENTOS DE ANA MARIA");
    expect(calls()[1]?.input).toContain("2. MOVIMIENTOS DE [NAME]:");
    expect(calls()[1]?.input).not.toContain("PRUEBA");
  });

  it("gives back the AI's failure", async () => {
    mocks.generateStructured.mockResolvedValue(err(FAILED));

    expect(await proposeRolesFor(newClerkId(), SAMPLE)).toEqual(err(FAILED));
  });
});
