import { describe, it, expect, vi, beforeEach } from "vitest";

// db.ts reads SUPABASE_* at module load and throws in sb() if missing, so set
// them before the (dynamic) import. We stub the Supabase client itself, so the
// REAL voterStats reducer runs against a fixture — exercising the 555 + match-104
// exclusion that produces the owner's headline "distinct voters" number.
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

const queryResult: { data: unknown; error: unknown; count: number | null } = {
  data: null,
  error: null,
  count: null,
};

vi.mock("@supabase/supabase-js", () => {
  // A chainable, awaitable query builder that resolves to `queryResult`.
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "range", "limit"]) {
    builder[m] = () => builder;
  }
  builder.maybeSingle = () => Promise.resolve(queryResult);
  builder.upsert = () => Promise.resolve(queryResult);
  builder.insert = () => Promise.resolve(queryResult);
  builder.then = (resolve: (v: unknown) => unknown) => resolve(queryResult);
  return { createClient: () => ({ from: () => builder }) };
});

describe("db.voterStats — distinct-voter accounting", () => {
  beforeEach(() => {
    queryResult.data = null;
    queryResult.error = null;
    queryResult.count = null;
  });

  it("excludes reserved 555 numbers and match 104, counts distinct real voters", async () => {
    queryResult.data = [
      { phone: "4693165859", match_id: 19 }, // real, game A
      { phone: "4693165859", match_id: 20 }, // same voter, game B
      { phone: "2148889999", match_id: 19 }, // real, game A
      { phone: "4695550001", match_id: 19 }, // 555 test → excluded
      { phone: "4693165859", match_id: 104 }, // match 104 (load test) → excluded
    ];
    const { voterStats } = await import("@/lib/db");
    const s = await voterStats();
    expect(s.totalVoteRows).toBe(5); // raw rows incl. test data
    expect(s.distinctPhonesAll).toBe(3); // 4693165859, 2148889999, 4695550001
    expect(s.distinctVoters).toBe(2); // real only: 4693165859, 2148889999
    expect(s.realVoteRows).toBe(3); // rows 1,2,3 (555 + match104 excluded)
    expect(s.gamesWithRealVotes).toBe(2); // games 19 and 20
  });

  it("returns zeros for an empty table", async () => {
    queryResult.data = [];
    const { voterStats } = await import("@/lib/db");
    const s = await voterStats();
    expect(s).toEqual({
      totalVoteRows: 0,
      distinctPhonesAll: 0,
      distinctVoters: 0,
      realVoteRows: 0,
      gamesWithRealVotes: 0,
    });
  });
});
