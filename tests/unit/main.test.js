// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
import { describe, test, expect } from "vitest";
import { main, getIdentity, name, version, description, parseCron, cronToString, matches, nextRun, nextRuns } from "../../src/lib/main.js";

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

describe("parseCron", () => {
  test("parses 5-field cron expression with wildcards", () => {
    const result = parseCron("* * * * *");
    expect(result.hasSeconds).toBe(false);
    expect(result.fields.minute.type).toBe("wildcard");
    expect(result.fields.hour.type).toBe("wildcard");
    expect(result.fields.day.type).toBe("wildcard");
    expect(result.fields.month.type).toBe("wildcard");
    expect(result.fields.dayOfWeek.type).toBe("wildcard");
  });

  test("parses 6-field cron expression with seconds", () => {
    const result = parseCron("0 * * * * *");
    expect(result.hasSeconds).toBe(true);
    expect(result.fields.second.type).toBe("value");
    expect(result.fields.second.value).toBe(0);
  });

  test("parses step values (*/15)", () => {
    const result = parseCron("*/15 * * * *");
    expect(result.fields.minute.type).toBe("step");
    expect(result.fields.minute.step).toBe(15);
    expect(result.fields.minute.base).toEqual([0, 59]);
  });

  test("parses range step values (1-30/5)", () => {
    const result = parseCron("1-30/5 * * * *");
    expect(result.fields.minute.type).toBe("step");
    expect(result.fields.minute.step).toBe(5);
    expect(result.fields.minute.base).toEqual([1, 30]);
  });

  test("parses ranges (1-5)", () => {
    const result = parseCron("0 0 1-5 * *");
    expect(result.fields.day.type).toBe("range");
    expect(result.fields.day.start).toBe(1);
    expect(result.fields.day.end).toBe(5);
  });

  test("parses lists (1,3,5)", () => {
    const result = parseCron("0 0 1,15,30 * *");
    expect(result.fields.day.type).toBe("list");
    expect(result.fields.day.values).toEqual([1, 15, 30]);
  });

  test("parses single values", () => {
    const result = parseCron("30 9 15 6 *");
    expect(result.fields.minute.type).toBe("value");
    expect(result.fields.minute.value).toBe(30);
    expect(result.fields.hour.type).toBe("value");
    expect(result.fields.hour.value).toBe(9);
  });

  test("handles whitespace in expressions", () => {
    const result1 = parseCron("  0  9  *  *  *  ");
    expect(result1.fields.minute.value).toBe(0);
    expect(result1.fields.hour.value).toBe(9);
  });

  test("expands @yearly shortcut", () => {
    const result = parseCron("@yearly");
    expect(cronToString(result)).toBe("0 0 1 1 *");
  });

  test("expands @annually shortcut", () => {
    const result = parseCron("@annually");
    expect(cronToString(result)).toBe("0 0 1 1 *");
  });

  test("expands @monthly shortcut", () => {
    const result = parseCron("@monthly");
    expect(cronToString(result)).toBe("0 0 1 * *");
  });

  test("expands @weekly shortcut", () => {
    const result = parseCron("@weekly");
    expect(cronToString(result)).toBe("0 0 * * 0");
  });

  test("expands @daily shortcut", () => {
    const result = parseCron("@daily");
    expect(cronToString(result)).toBe("0 0 * * *");
  });

  test("expands @midnight shortcut", () => {
    const result = parseCron("@midnight");
    expect(cronToString(result)).toBe("0 0 * * *");
  });

  test("expands @hourly shortcut", () => {
    const result = parseCron("@hourly");
    expect(cronToString(result)).toBe("0 * * * *");
  });

  test("sorts list values in ascending order", () => {
    const result = parseCron("0 0 5,2,8,1 * *");
    expect(result.fields.day.values).toEqual([1, 2, 5, 8]);
  });

  test("throws on invalid field count (4 fields)", () => {
    expect(() => parseCron("0 0 * *")).toThrow("must have 5 fields");
  });

  test("throws on invalid field count (7 fields)", () => {
    expect(() => parseCron("0 0 0 * * * * *")).toThrow("must have 5 fields");
  });

  test("throws on out-of-range minute", () => {
    expect(() => parseCron("60 * * * *")).toThrow("Invalid value");
  });

  test("throws on out-of-range hour", () => {
    expect(() => parseCron("0 24 * * *")).toThrow("Invalid value");
  });

  test("throws on out-of-range day", () => {
    expect(() => parseCron("0 0 32 * *")).toThrow("Invalid value");
  });

  test("throws on out-of-range month", () => {
    expect(() => parseCron("0 0 * 13 *")).toThrow("Invalid value");
  });

  test("throws on out-of-range dayOfWeek", () => {
    expect(() => parseCron("0 0 * * 7")).toThrow("Invalid value");
  });

  test("throws on out-of-range second in 6-field", () => {
    expect(() => parseCron("60 0 * * * *")).toThrow("Invalid value");
  });

  test("throws on invalid range (start > end)", () => {
    expect(() => parseCron("30-10 * * * *")).toThrow("Invalid range");
  });

  test("throws on invalid range (out of bounds)", () => {
    expect(() => parseCron("0 0-25 * * *")).toThrow("Invalid range");
  });

  test("throws on invalid list values", () => {
    expect(() => parseCron("0 0 1,32 * *")).toThrow("Invalid value");
  });

  test("throws on invalid step value (0)", () => {
    expect(() => parseCron("*/0 * * * *")).toThrow("Invalid step value");
  });

  test("throws on invalid step value (negative)", () => {
    expect(() => parseCron("*/-5 * * * *")).toThrow("Invalid step value");
  });

  test("throws on non-string input", () => {
    expect(() => parseCron(123)).toThrow("must be a string");
  });

  test("throws on null input", () => {
    expect(() => parseCron(null)).toThrow("must be a string");
  });

  test("parses day-of-week field (0-6)", () => {
    const result = parseCron("0 0 * * 0");
    expect(result.fields.dayOfWeek.value).toBe(0);
  });
});

describe("cronToString", () => {
  test("round-trips wildcards", () => {
    const expr = "* * * * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips single values", () => {
    const expr = "30 9 15 6 1";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips ranges", () => {
    const expr = "0 0 1-5 * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips lists", () => {
    const expr = "0 0 1,15,30 * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips step values", () => {
    const expr = "*/15 * * * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips range steps", () => {
    const expr = "1-30/5 * * * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips 6-field expressions", () => {
    const expr = "0 */15 * * * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("round-trips shortcuts", () => {
    expect(cronToString(parseCron("@yearly"))).toBe("0 0 1 1 *");
    expect(cronToString(parseCron("@hourly"))).toBe("0 * * * *");
  });

  test("throws on invalid parsed object (null)", () => {
    expect(() => cronToString(null)).toThrow("Invalid parsed cron object");
  });

  test("throws on invalid parsed object (no fields)", () => {
    expect(() => cronToString({ hasSeconds: false })).toThrow("Invalid parsed cron object");
  });

  test("throws on missing field in parsed object", () => {
    const incomplete = { hasSeconds: false, fields: { minute: { type: "wildcard" } } };
    expect(() => cronToString(incomplete)).toThrow("Missing field");
  });

  test("throws on unknown field type", () => {
    const invalid = { hasSeconds: false, fields: {
      minute: { type: "unknown" },
      hour: { type: "wildcard" },
      day: { type: "wildcard" },
      month: { type: "wildcard" },
      dayOfWeek: { type: "wildcard" }
    } };
    expect(() => cronToString(invalid)).toThrow("Unknown field type");
  });
});

describe("Integration Tests", () => {
  test("parses and round-trips complex expression", () => {
    const expr = "0,30 9-17 * 1-6 1-5";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("parses and round-trips Monday at 9 AM", () => {
    const expr = "0 9 * * 1";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("parses and round-trips every 15 minutes", () => {
    const expr = "*/15 * * * *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });

  test("parses and round-trips Christmas", () => {
    const expr = "0 0 25 12 *";
    expect(cronToString(parseCron(expr))).toBe(expr);
  });
});

describe("matches", () => {
  test("matches wildcard expression at any time", () => {
    const date = new Date("2025-06-15T14:30:45Z");
    expect(matches("* * * * *", date)).toBe(true);
  });

  test("matches specific minute", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("30 * * * *", date)).toBe(true);
    expect(matches("31 * * * *", date)).toBe(false);
  });

  test("matches specific hour", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("* 14 * * *", date)).toBe(true);
    expect(matches("* 15 * * *", date)).toBe(false);
  });

  test("matches specific day", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("* * 15 * *", date)).toBe(true);
    expect(matches("* * 16 * *", date)).toBe(false);
  });

  test("matches specific month", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("* * * 6 *", date)).toBe(true);
    expect(matches("* * * 7 *", date)).toBe(false);
  });

  test("matches specific day of week", () => {
    const date = new Date("2025-06-16T00:00:00Z"); // Monday
    expect(matches("* * * * 1", date)).toBe(true);
    expect(matches("* * * * 0", date)).toBe(false);
  });

  test("matches Christmas", () => {
    const christmas = new Date("2025-12-25T00:00:00Z");
    expect(matches("0 0 25 12 *", christmas)).toBe(true);
  });

  test("matches range", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("* * 10-20 * *", date)).toBe(true);
    expect(matches("* * 1-10 * *", date)).toBe(false);
  });

  test("matches list", () => {
    const date = new Date("2025-06-15T14:30:00Z");
    expect(matches("* * 1,15,30 * *", date)).toBe(true);
    expect(matches("* * 1,16,30 * *", date)).toBe(false);
  });

  test("matches step values", () => {
    const date = new Date("2025-06-15T00:15:00Z");
    expect(matches("*/15 * * * *", date)).toBe(true);
    expect(matches("*/15 * * * *", new Date("2025-06-15T00:14:00Z"))).toBe(false);
  });

  test("matches with seconds in expression", () => {
    const date = new Date("2025-06-15T14:30:45Z");
    expect(matches("45 30 14 * * *", date)).toBe(true);
    expect(matches("44 30 14 * * *", date)).toBe(false);
  });

  test("throws on non-Date argument", () => {
    expect(() => matches("* * * * *", "2025-06-15")).toThrow("Date instance");
  });
});

describe("nextRun", () => {
  test("nextRun for Monday at 09:00", () => {
    const monday9am = nextRun("0 9 * * 1", new Date("2025-06-15T00:00:00Z")); // Sunday
    expect(monday9am.getUTCDay()).toBe(1); // Monday
    expect(monday9am.getUTCHours()).toBe(9);
    expect(monday9am.getUTCMinutes()).toBe(0);
  });

  test("nextRun for daily at midnight", () => {
    const start = new Date("2025-06-15T12:00:00Z");
    const next = nextRun("0 0 * * *", start);
    expect(next.getUTCHours()).toBe(0);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCDate()).toBe(16);
  });

  test("nextRun for hourly", () => {
    const start = new Date("2025-06-15T12:30:00Z");
    const next = nextRun("0 * * * *", start);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCHours()).toBe(13);
  });

  test("nextRun respects after parameter", () => {
    const start = new Date("2025-06-15T09:00:00Z");
    const next = nextRun("0 9 * * *", start);
    expect(next.getTime()).toBeGreaterThan(start.getTime());
  });

  test("nextRun returns UTC date", () => {
    const start = new Date("2025-06-15T12:00:00Z");
    const next = nextRun("0 12 * * *", start);
    expect(next instanceof Date).toBe(true);
  });

  test("nextRun for @daily", () => {
    const start = new Date("2025-06-15T12:00:00Z");
    const next = nextRun("@daily", start);
    expect(next.getUTCHours()).toBe(0);
    expect(next.getUTCMinutes()).toBe(0);
  });

  test("nextRun with step values", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const next = nextRun("*/15 * * * *", start);
    expect(next.getUTCMinutes() % 15).toBe(0);
  });

  test("nextRun with list values", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const next = nextRun("0 9,12,15 * * *", start);
    expect([9, 12, 15]).toContain(next.getUTCHours());
  });

  test("nextRun throws on non-Date argument", () => {
    expect(() => nextRun("* * * * *", "2025-06-15")).toThrow("Date instance");
  });

  test("nextRun uses current date by default", () => {
    const before = new Date();
    const next = nextRun("* * * * *");
    const after = new Date();
    expect(next.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(next.getTime()).toBeLessThanOrEqual(after.getTime() + 61000);
  });
});

describe("nextRuns", () => {
  test("nextRuns returns requested count", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("@daily", 7, start);
    expect(runs.length).toBe(7);
  });

  test("nextRuns returns consecutive daily dates", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("@daily", 7, start);
    for (let i = 1; i < runs.length; i++) {
      const diff = runs[i].getTime() - runs[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  test("nextRuns for hourly", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("0 * * * *", 3, start);
    expect(runs.length).toBe(3);
    for (let i = 0; i < runs.length; i++) {
      expect(runs[i].getUTCMinutes()).toBe(0);
    }
  });

  test("nextRuns for every 15 minutes", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("*/15 * * * *", 4, start);
    expect(runs.length).toBe(4);
    for (let i = 0; i < runs.length; i++) {
      expect(runs[i].getUTCMinutes() % 15).toBe(0);
    }
  });

  test("nextRuns returns monotonically increasing dates", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("0 * * * *", 5, start);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime());
    }
  });

  test("nextRuns throws on invalid count", () => {
    expect(() => nextRuns("* * * * *", 0)).toThrow("positive number");
    expect(() => nextRuns("* * * * *", -1)).toThrow("positive number");
    expect(() => nextRuns("* * * * *", "5")).toThrow("positive number");
  });

  test("nextRuns throws on non-Date after argument", () => {
    expect(() => nextRuns("* * * * *", 5, "2025-06-15")).toThrow("Date instance");
  });

  test("nextRuns for Monday (day of week)", () => {
    const start = new Date("2025-06-15T00:00:00Z"); // Sunday
    const runs = nextRuns("0 9 * * 1", 3, start);
    expect(runs.length).toBe(3);
    for (const run of runs) {
      expect(run.getUTCDay()).toBe(1); // Monday
      expect(run.getUTCHours()).toBe(9);
    }
  });
});

describe("Acceptance Criteria", () => {
  test("nextRun for Monday at 09:00 UTC", () => {
    const result = nextRun("0 9 * * 1", new Date("2025-06-15T00:00:00Z"));
    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  test("matches Christmas 2025", () => {
    const christmas = new Date("2025-12-25T00:00:00Z");
    expect(matches("0 0 25 12 *", christmas)).toBe(true);
  });

  test("nextRuns returns 7 consecutive daily UTC dates", () => {
    const start = new Date("2025-06-15T00:00:00Z");
    const runs = nextRuns("@daily", 7, start);
    expect(runs.length).toBe(7);

    for (let i = 0; i < runs.length; i++) {
      expect(runs[i].getUTCHours()).toBe(0);
      expect(runs[i].getUTCMinutes()).toBe(0);
      expect(runs[i].getUTCDate()).toBe(16 + i);
    }
  });
});
