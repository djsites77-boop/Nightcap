import { describe, it, expect } from "vitest";
import { allocateProportional } from "./allocate";

describe("allocateProportional", () => {
  it("always sums exactly to the total, including awkward fractions", () => {
    const cases: Array<[number, number[]]> = [
      [138000, [3, 3]],
      [100000, [2, 5]],
      [9999, [1, 1, 1]],
      [1, [1, 1, 1, 1, 1, 1, 1]],
      [500, [1, 2, 3, 4]],
    ];
    for (const [total, weights] of cases) {
      const shares = allocateProportional(total, weights);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
      expect(shares.every((s) => s >= 0)).toBe(true);
    }
  });

  it("returns all zeros when every weight is zero", () => {
    expect(allocateProportional(500, [0, 0, 0])).toEqual([0, 0, 0]);
  });
});
