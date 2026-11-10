import { describe, expect, it } from "vitest";

import { ehUuid } from "./uuid";

describe("ehUuid", () => {
  it("aceita uuid e recusa o resto (inclusive 36 hífens)", () => {
    expect(ehUuid("01a1c26d-9eb9-7573-af7d-beda3ea89f99")).toBe(true);
    expect(ehUuid("-".repeat(36))).toBe(false);
    expect(ehUuid("nova")).toBe(false);
    expect(ehUuid(undefined)).toBe(false);
  });
});
