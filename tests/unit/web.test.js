// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
//
// Website unit tests. The behavioural ones EXERCISE the library through the same
// renderDemo() the homepage uses — so a delivery that doesn't wire its API into the
// demo fails HERE, in the agent's tool loop (`npx vitest run`), not silently in the
// out-of-loop Playwright screenshot job.
import { describe, test, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import * as lib from "../../src/lib/main.js";
import { renderDemo } from "../../src/web/lib.js";

describe("Website structure", () => {
  test("src/web/index.html exists and is well-formed", () => {
    expect(existsSync("src/web/index.html")).toBe(true);
    const html = readFileSync("src/web/index.html", "utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
    expect(html).toContain("lib.js");
    expect(html).toContain("lib-name");
  });

  test("src/web/lib.js re-exports the library and a renderDemo", () => {
    expect(existsSync("src/web/lib.js")).toBe(true);
    const src = readFileSync("src/web/lib.js", "utf8");
    expect(src).toContain("../lib/main.js");
    expect(src).toContain("renderDemo");
  });
});

describe("renderDemo exercises src/lib/main.js", () => {
  const intent = "# Mission\n\nDeliver the thing this repository navigates toward.";
  const demo = renderDemo(lib, { pkg: { name: "demo-pkg", version: "1.2.3" }, intentText: intent });

  test("introspects the library's real named exports", () => {
    const exported = Object.keys(lib).filter((k) => k !== "default");
    expect(demo.api.map((a) => a.name)).toEqual(expect.arrayContaining(exported));
  });

  test("produces non-empty demo output (it actually ran the library)", () => {
    expect(typeof demo.output).toBe("string");
    expect(demo.output.trim().length).toBeGreaterThan(0);
  });

  test("surfaces the mission from INTENT.md text", () => {
    expect(demo.mission).toContain("Mission");
  });

  test("renderDemo is defensive against an empty library (no throw)", () => {
    const empty = renderDemo({}, { pkg: {}, intentText: "" });
    expect(empty.output.trim().length).toBeGreaterThan(0); // "(no named exports yet)"
  });
});
