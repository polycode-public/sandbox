// SPDX-License-Identifier: MIT
// src/web/lib.js — Browser entry point. Re-exports the whole library and a pure
// `renderDemo` that EXERCISES src/lib/main.js, so the homepage (and its screenshot)
// reflect this repo's actual delivery, not a generic skeleton.
export * from "../lib/main.js";
import * as lib from "../lib/main.js";

// Library "identity" exports (metadata, not the delivered feature API).
const META = new Set(["name", "version", "description", "getIdentity", "default"]);

function fmt(v) {
  if (typeof v === "string") return v;
  if (v === undefined) return "undefined";
  try {
    const s = JSON.stringify(v);
    return s && s.length > 400 ? s.slice(0, 400) + "…" : s;
  } catch {
    return String(v);
  }
}

// First heading + first non-heading line of INTENT.md — the mission, repo-specific.
function missionOf(md) {
  if (!md) return "";
  const lines = String(md).split(/\r?\n/);
  const h = (lines.find((l) => /^#\s/.test(l)) || "").replace(/^#\s*/, "").trim();
  const intro = (lines.find((l) => l.trim() && !l.startsWith("#")) || "").trim();
  return [h, intro].filter(Boolean).join(" — ");
}

// renderDemo(libModule, { pkg, intentText }) -> pure demo model.
// EXERCISES the library: prefers an exported demo(), else main(), else invokes any
// zero-arg function exports, else summarises the feature API. All guarded.
export function renderDemo(libModule = lib, { pkg = {}, intentText = "" } = {}) {
  const api = Object.keys(libModule)
    .filter((k) => k !== "default")
    .map((k) => {
      const v = libModule[k];
      const kind = typeof v;
      return { name: k, kind, arity: kind === "function" ? v.length : undefined };
    });

  const lines = [];
  const ran = (label, fn, ...args) => {
    try {
      lines.push(`${label} => ${fmt(fn(...args))}`);
    } catch (e) {
      lines.push(`${label} threw: ${e.message}`);
    }
    return true;
  };

  if (typeof libModule.demo === "function") {
    ran("demo()", libModule.demo);
  } else {
    let invoked = false;
    if (typeof libModule.main === "function") invoked = ran("main()", libModule.main);
    for (const a of api) {
      if (META.has(a.name) || a.name === "main") continue;
      if (a.kind === "function" && a.arity === 0) invoked = ran(`${a.name}()`, libModule[a.name]);
    }
    if (!invoked) {
      const feature = api.filter((a) => !META.has(a.name));
      lines.push(
        feature.length
          ? "API: " + feature.map((a) => `${a.name}(${"·".repeat(a.arity || 0)})`).join(", ")
          : "(no named exports yet)",
      );
    }
  }

  return {
    name: pkg.name || libModule.name || "repository",
    version: pkg.version || libModule.version || "",
    description: pkg.description || libModule.description || "",
    mission: missionOf(intentText),
    api,
    output: lines.join("\n"),
  };
}
