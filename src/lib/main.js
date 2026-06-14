#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
// src/lib/main.js

const isNode = typeof process !== "undefined" && !!process.versions?.node;

let pkg;
if (isNode) {
  const { createRequire } = await import("module");
  const requireFn = createRequire(import.meta.url);
  pkg = requireFn("../../package.json");
} else {
  try {
    const resp = await fetch(new URL("../../package.json", import.meta.url));
    pkg = await resp.json();
  } catch {
    pkg = { name: document.title, version: "0.0.0", description: "" };
  }
}

export const name = pkg.name;
export const version = pkg.version;
export const description = pkg.description;

export function getIdentity() {
  return { name, version, description };
}

const FIELD_NAMES = ["minute", "hour", "day", "month", "dayOfWeek"];
const FIELD_NAMES_WITH_SECONDS = ["second", "minute", "hour", "day", "month", "dayOfWeek"];
const FIELD_RANGES = {
  second: [0, 59],
  minute: [0, 59],
  hour: [0, 23],
  day: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 6],
};

const SHORTCUTS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function expandShortcut(expr) {
  return SHORTCUTS[expr] || expr;
}

function parseField(fieldStr, fieldIndex, hasSeconds) {
  const fieldNames = hasSeconds ? FIELD_NAMES_WITH_SECONDS : FIELD_NAMES;
  const fieldName = fieldNames[fieldIndex];
  const [min, max] = FIELD_RANGES[fieldName];

  if (fieldStr === "*") {
    return { type: "wildcard", range: [min, max] };
  }

  // Handle step values (*/5, 1-10/2, etc.)
  if (fieldStr.includes("/")) {
    const [base, step] = fieldStr.split("/");
    const stepNum = parseInt(step, 10);
    if (isNaN(stepNum) || stepNum <= 0) {
      throw new Error(`Invalid step value "${step}" in field "${fieldName}"`);
    }

    if (base === "*") {
      return { type: "step", base: [min, max], step: stepNum };
    }

    if (base.includes("-")) {
      const [start, end] = base.split("-").map(Number);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error(
          `Invalid range "${base}" in field "${fieldName}" (valid: ${min}-${max})`
        );
      }
      return { type: "step", base: [start, end], step: stepNum };
    }

    throw new Error(`Invalid step expression "${fieldStr}" in field "${fieldName}"`);
  }

  // Handle lists (1,3,5)
  if (fieldStr.includes(",")) {
    const values = fieldStr.split(",").map((v) => {
      const num = parseInt(v.trim(), 10);
      if (isNaN(num) || num < min || num > max) {
        throw new Error(
          `Invalid value "${v}" in field "${fieldName}" (valid: ${min}-${max})`
        );
      }
      return num;
    });
    return { type: "list", values: values.sort((a, b) => a - b) };
  }

  // Handle ranges (1-5)
  if (fieldStr.includes("-")) {
    const [start, end] = fieldStr.split("-").map(Number);
    if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
      throw new Error(
        `Invalid range "${fieldStr}" in field "${fieldName}" (valid: ${min}-${max})`
      );
    }
    return { type: "range", start, end };
  }

  // Handle single values
  const num = parseInt(fieldStr, 10);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(
      `Invalid value "${fieldStr}" in field "${fieldName}" (valid: ${min}-${max})`
    );
  }
  return { type: "value", value: num };
}

export function parseCron(expr) {
  if (typeof expr !== "string") {
    throw new Error("Cron expression must be a string");
  }

  const expanded = expandShortcut(expr.trim());
  const parts = expanded.split(/\s+/).filter((p) => p.length > 0);

  let hasSeconds = false;
  if (parts.length === 6) {
    hasSeconds = true;
  } else if (parts.length !== 5) {
    throw new Error(
      `Cron expression must have 5 fields (or 6 with seconds), got ${parts.length}`
    );
  }

  const fieldNames = hasSeconds ? FIELD_NAMES_WITH_SECONDS : FIELD_NAMES;
  const fields = {};

  for (let i = 0; i < parts.length; i++) {
    fields[fieldNames[i]] = parseField(parts[i], i, hasSeconds);
  }

  return {
    hasSeconds,
    fields,
  };
}

export function cronToString(parsed) {
  if (!parsed || typeof parsed !== "object" || !parsed.fields) {
    throw new Error("Invalid parsed cron object");
  }

  const fieldNames = parsed.hasSeconds ? FIELD_NAMES_WITH_SECONDS : FIELD_NAMES;
  const parts = [];

  for (const fieldName of fieldNames) {
    const field = parsed.fields[fieldName];
    if (!field) {
      throw new Error(`Missing field "${fieldName}" in parsed cron object`);
    }

    let str = "";
    switch (field.type) {
      case "wildcard":
        str = "*";
        break;
      case "value":
        str = String(field.value);
        break;
      case "range":
        str = `${field.start}-${field.end}`;
        break;
      case "list":
        str = field.values.join(",");
        break;
      case "step":
        if (field.base[0] === FIELD_RANGES[fieldName][0] && field.base[1] === FIELD_RANGES[fieldName][1]) {
          str = `*/${field.step}`;
        } else {
          str = `${field.base[0]}-${field.base[1]}/${field.step}`;
        }
        break;
      default:
        throw new Error(`Unknown field type "${field.type}"`);
    }

    parts.push(str);
  }

  return parts.join(" ");
}

export function main(args) {
  if (args?.includes("--version")) {
    console.log(version);
    return;
  }
  if (args?.includes("--identity")) {
    console.log(JSON.stringify(getIdentity(), null, 2));
    return;
  }
  console.log(`${name}@${version}`);
}

if (isNode) {
  const { fileURLToPath } = await import("url");
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    main(args);
  }
}
