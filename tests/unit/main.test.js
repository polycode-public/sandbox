// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
import { describe, test, expect } from "vitest";
import { main, getIdentity, name, version, description, parse, matches, next, nextN, toString } from "../../src/lib/main.js";

describe("Main Output", () => {
  test("should terminate without error", () => {
    process.argv = ["node", "src/lib/main.js"];
    main();
  });
});

describe("Library Identity", () => {
  test("exports name, version, and description", () => {
    expect(typeof name).toBe("string");
    expect(typeof version).toBe("string");
    expect(typeof description).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("getIdentity returns correct structure", () => {
    const identity = getIdentity();
    expect(identity).toEqual({ name, version, description });
  });
});

describe("Cron Parser", () => {
  test("parses basic 5-field expression", () => {
    const result = parse("*/15 * * * *");
    expect(result).toHaveProperty("minute");
    expect(result).toHaveProperty("hour");
    expect(result).toHaveProperty("day");
    expect(result).toHaveProperty("month");
    expect(result).toHaveProperty("dow");
  });

  test("parses 6-field expression with seconds", () => {
    const result = parse("0 */15 * * * *");
    expect(result).toHaveProperty("second");
    expect(result.second.size).toBeGreaterThan(0);
  });

  test("parses ranges correctly", () => {
    const result = parse("1-5 * * * *");
    expect(Array.from(result.minute)).toEqual([1, 2, 3, 4, 5]);
  });

  test("parses lists correctly", () => {
    const result = parse("1,3,5 * * * *");
    expect(Array.from(result.minute).sort((a, b) => a - b)).toEqual([1, 3, 5]);
  });

  test("parses wildcards correctly", () => {
    const result = parse("* * * * *");
    expect(result.minute.size).toBe(60);
    expect(result.hour.size).toBe(24);
  });

  test("parses step values correctly", () => {
    const result = parse("*/15 * * * *");
    expect(Array.from(result.minute).sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });

  test("parses shortcuts correctly", () => {
    const yearly = parse("@yearly");
    expect(Array.from(yearly.minute)).toContain(0);
    expect(Array.from(yearly.hour)).toContain(0);
    expect(Array.from(yearly.day)).toContain(1);
    expect(Array.from(yearly.month)).toContain(1);

    const daily = parse("@daily");
    expect(Array.from(daily.minute)).toContain(0);
    expect(Array.from(daily.hour)).toContain(0);

    const hourly = parse("@hourly");
    expect(Array.from(hourly.minute)).toContain(0);
  });

  test("throws on invalid syntax", () => {
    expect(() => parse("")).toThrow();
    expect(() => parse("* * * *")).toThrow();
    expect(() => parse("* * * * * * *")).toThrow();
    expect(() => parse("invalid")).toThrow();
  });

  test("throws on out-of-range values", () => {
    expect(() => parse("60 * * * *")).toThrow();
    expect(() => parse("* 24 * * *")).toThrow();
    expect(() => parse("* * 32 * *")).toThrow();
    expect(() => parse("* * * 13 *")).toThrow();
    expect(() => parse("* * * * 7")).toThrow();
  });

  test("throws on invalid step values", () => {
    expect(() => parse("*/0 * * * *")).toThrow();
    expect(() => parse("*/-5 * * * *")).toThrow();
  });

  test("throws on invalid ranges", () => {
    expect(() => parse("5-1 * * * *")).toThrow();
  });

  test("parses month names", () => {
    const result = parse("* * * JAN *");
    expect(Array.from(result.month)).toContain(1);

    const result2 = parse("* * * DEC *");
    expect(Array.from(result2.month)).toContain(12);
  });

  test("parses day-of-week names", () => {
    const result = parse("* * * * MON");
    expect(Array.from(result.dow)).toContain(1);

    const result2 = parse("* * * * SUN");
    expect(Array.from(result2.dow)).toContain(0);
  });
});

describe("Cron Matching", () => {
  test("matches exact time", () => {
    const date = new Date("2025-12-25T00:00:00Z");
    expect(matches("0 0 25 12 *", date)).toBe(true);
  });

  test("doesn't match when minute differs", () => {
    const date = new Date("2025-12-25T00:01:00Z");
    expect(matches("0 0 25 12 *", date)).toBe(false);
  });

  test("doesn't match when hour differs", () => {
    const date = new Date("2025-12-25T01:00:00Z");
    expect(matches("0 0 25 12 *", date)).toBe(false);
  });

  test("doesn't match when day differs", () => {
    const date = new Date("2025-12-24T00:00:00Z");
    expect(matches("0 0 25 12 *", date)).toBe(false);
  });

  test("doesn't match when month differs", () => {
    const date = new Date("2025-11-25T00:00:00Z");
    expect(matches("0 0 25 12 *", date)).toBe(false);
  });

  test("matches wildcard day-of-week", () => {
    const date = new Date("2025-01-06T09:00:00Z");
    expect(matches("0 9 * * 1", date)).toBe(true);
  });

  test("matches when day or dow matches", () => {
    const date = new Date("2025-01-06T09:00:00Z");
    expect(matches("0 9 6 * 1", date)).toBe(true);
  });

  test("handles default date parameter", () => {
    const before = new Date();
    const result = matches("* * * * *");
    const after = new Date();
    expect(typeof result).toBe("boolean");
  });
});

describe("Next Run Time", () => {
  test("computes next run time", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const result = next("0 9 * * 1", from);
    expect(result).toBeInstanceOf(Date);
    expect(result > from).toBe(true);
  });

  test("returns Monday 09:00 for weekly expression", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const result = next("0 9 * * 1", from);
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  test("uses current time by default", () => {
    const result = next("0 0 * * *");
    expect(result).toBeInstanceOf(Date);
    expect(result > new Date()).toBe(true);
  });

  test("returns single result, not array", () => {
    const result = next("0 0 * * *", new Date("2025-01-01T00:00:00Z"));
    expect(Array.isArray(result)).toBe(false);
    expect(result).toBeInstanceOf(Date);
  });

  test("throws on count < 1", () => {
    expect(() => next("* * * * *", new Date(), 0)).toThrow();
  });
});

describe("Next N Run Times", () => {
  test("computes next N run times", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const results = nextN("@daily", from, 7);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(7);
  });

  test("returns 7 consecutive daily times", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const results = nextN("@daily", from, 7);
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).toBeInstanceOf(Date);
      expect(results[i].getUTCHours()).toBe(0);
      expect(results[i].getUTCMinutes()).toBe(0);
      if (i > 0) {
        const dayDiff = (results[i] - results[i - 1]) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBeCloseTo(1, 1);
      }
    }
  });

  test("returns multiple results for 3 times", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const results = nextN("0 0 31 * *", from, 3);
    expect(results.length).toBe(3);
  });

  test("skips months without 31 days", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const results = nextN("0 0 31 * *", from, 3);
    const months = results.map(d => d.getUTCMonth() + 1);
    expect(months).toContain(1);
    expect(months).not.toContain(2);
    expect(months).not.toContain(4);
  });

  test("uses current time by default", () => {
    const results = nextN("0 0 * * *", undefined, 1);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
  });

  test("throws on count < 1", () => {
    expect(() => nextN("* * * * *", new Date(), 0)).toThrow();
  });
});

describe("Convert to String", () => {
  test("converts parsed cron back to string", () => {
    const parsed = parse("*/15 * * * *");
    const str = toString(parsed);
    expect(typeof str).toBe("string");
    expect(str).toMatch(/^[\d,*\/ ]+$/);
  });

  test("handles simple expressions", () => {
    const parsed = parse("0 9 * * 1");
    const str = toString(parsed);
    expect(str).toContain("0");
    expect(str).toContain("9");
  });

  test("converts back to parseable expression", () => {
    const original = "0 0 1 1 *";
    const parsed = parse(original);
    const str = toString(parsed);
    const reparsed = parse(str);
    expect(reparsed.minute).toEqual(parsed.minute);
    expect(reparsed.hour).toEqual(parsed.hour);
    expect(reparsed.day).toEqual(parsed.day);
    expect(reparsed.month).toEqual(parsed.month);
    expect(reparsed.dow).toEqual(parsed.dow);
  });
});

describe("Edge Cases", () => {
  test("handles leap year February 29", () => {
    const leapYear = new Date("2024-02-29T00:00:00Z");
    expect(matches("0 0 29 2 *", leapYear)).toBe(true);
  });

  test("skips non-leap year February 29", () => {
    const nonLeapYear = new Date("2025-03-01T00:00:00Z");
    expect(matches("0 0 29 2 *", nonLeapYear)).toBe(false);
  });

  test("handles month boundaries correctly", () => {
    const from = new Date("2025-01-31T00:00:00Z");
    const result = next("0 0 31 * *", from);
    expect(result.getUTCDate()).toBe(31);
  });

  test("handles 31-day month expression from January", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const results = nextN("0 0 31 * *", from, 3);
    expect(results[0].getUTCMonth() + 1).toBe(1);
    expect(results[1].getUTCMonth() + 1).toBe(3);
    expect(results[2].getUTCMonth() + 1).toBe(5);
  });
});
