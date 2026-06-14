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

const SHORTCUTS = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const MONTHS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DAYS = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(month, year) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function parseField(field, min, max, names = {}) {
  const result = new Set();

  if (field === "*") {
    for (let i = min; i <= max; i++) result.add(i);
    return result;
  }

  const parts = field.split(",");
  for (const part of parts) {
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepVal = parseInt(step, 10);
      if (isNaN(stepVal) || stepVal <= 0) throw new Error(`Invalid step value: ${step}`);

      let start = min;
      let end = max;

      if (range !== "*") {
        if (range.includes("-")) {
          const [s, e] = range.split("-");
          start = resolveValue(s.trim(), names, min, max);
          end = resolveValue(e.trim(), names, min, max);
        } else {
          start = resolveValue(range.trim(), names, min, max);
          end = max;
        }
      }

      for (let i = start; i <= end; i += stepVal) result.add(i);
    } else if (part.includes("-")) {
      const [s, e] = part.split("-");
      const start = resolveValue(s.trim(), names, min, max);
      const end = resolveValue(e.trim(), names, min, max);
      if (start > end) throw new Error(`Invalid range: ${start}-${end}`);
      for (let i = start; i <= end; i++) result.add(i);
    } else {
      const val = resolveValue(part.trim(), names, min, max);
      result.add(val);
    }
  }

  for (const val of result) {
    if (val < min || val > max) throw new Error(`Value ${val} out of range [${min}, ${max}]`);
  }

  return result;
}

function resolveValue(val, names, min, max) {
  const upper = val.toUpperCase();
  if (names[upper] !== undefined) return names[upper];
  const num = parseInt(val, 10);
  if (isNaN(num)) throw new Error(`Invalid field value: ${val}`);
  return num;
}

export function parse(expression) {
  if (!expression || typeof expression !== "string") {
    throw new Error("Cron expression must be a non-empty string");
  }

  let expr = expression.trim();

  if (SHORTCUTS[expr]) {
    expr = SHORTCUTS[expr];
  }

  const fields = expr.split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) {
    throw new Error(`Invalid cron expression: expected 5 or 6 fields, got ${fields.length}`);
  }

  let minute, hour, day, month, dow, second = null;

  if (fields.length === 6) {
    [second, minute, hour, day, month, dow] = fields;
  } else {
    [minute, hour, day, month, dow] = fields;
    second = "0";
  }

  try {
    return {
      second: parseField(second, 0, 59),
      minute: parseField(minute, 0, 59),
      hour: parseField(hour, 0, 23),
      day: parseField(day, 1, 31),
      month: parseField(month, 1, 12, MONTHS),
      dow: parseField(dow, 0, 6, DAYS),
    };
  } catch (err) {
    throw new Error(`Invalid cron expression: ${err.message}`);
  }
}

export function toString(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parsed cron object is required");
  }

  const formatField = (set) => {
    if (!set || !(set instanceof Set)) return "*";
    const arr = Array.from(set).sort((a, b) => a - b);
    if (arr.length === 60) return "*";
    return arr.join(",");
  };

  const minute = formatField(parsed.minute);
  const hour = formatField(parsed.hour);
  const day = formatField(parsed.day);
  const month = formatField(parsed.month);
  const dow = formatField(parsed.dow);
  const second = parsed.second ? formatField(parsed.second) : null;

  if (second && second !== "0") {
    return `${second} ${minute} ${hour} ${day} ${month} ${dow}`;
  }
  return `${minute} ${hour} ${day} ${month} ${dow}`;
}

export function matches(expression, date = new Date()) {
  const parsed = parse(expression);
  const d = new Date(date);

  const s = d.getUTCSeconds();
  const min = d.getUTCMinutes();
  const h = d.getUTCHours();
  const day = d.getUTCDate();
  const m = d.getUTCMonth() + 1;
  const dow = d.getUTCDay();

  const matchesSecond = parsed.second.has(s);
  const matchesMinute = parsed.minute.has(min);
  const matchesHour = parsed.hour.has(h);
  const matchesDay = parsed.day.has(day);
  const matchesMonth = parsed.month.has(m);
  const matchesDow = parsed.dow.has(dow);

  if (!matchesSecond || !matchesMinute || !matchesHour || !matchesMonth) {
    return false;
  }

  if (parsed.day.size === 31 && parsed.dow.size === 7) {
    return true;
  }

  const dayUnrestricted = parsed.day.size === 31;
  const dowUnrestricted = parsed.dow.size === 7;

  if (dayUnrestricted && dowUnrestricted) return true;
  if (dayUnrestricted) return matchesDow;
  if (dowUnrestricted) return matchesDay;

  return matchesDay || matchesDow;
}

export function next(expression, date = new Date(), count = 1) {
  if (count < 1) throw new Error("Count must be at least 1");
  return nextN(expression, date, 1)[0];
}

export function nextN(expression, date = new Date(), count = 1) {
  if (count < 1) throw new Error("Count must be at least 1");

  const parsed = parse(expression);
  const results = [];
  let current = new Date(date);
  current.setUTCMilliseconds(0);

  const maxIterations = 500000;
  let iterations = 0;

  current.setUTCSeconds(current.getUTCSeconds() + 1);

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const year = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    const day = current.getUTCDate();
    const h = current.getUTCHours();
    const min = current.getUTCMinutes();
    const s = current.getUTCSeconds();
    const dow = current.getUTCDay();

    const matchesSecond = parsed.second.has(s);
    const matchesMinute = parsed.minute.has(min);
    const matchesHour = parsed.hour.has(h);
    const matchesMonth = parsed.month.has(m);

    const daysInCurMonth = daysInMonth(m, year);
    const dayExists = day <= daysInCurMonth;
    const matchesDay = dayExists && parsed.day.has(day);
    const matchesDow = parsed.dow.has(dow);

    if (matchesSecond && matchesMinute && matchesHour && matchesMonth) {
      const dayUnrestricted = parsed.day.size === 31;
      const dowUnrestricted = parsed.dow.size === 7;

      let isMatch = false;
      if (dayUnrestricted && dowUnrestricted) {
        isMatch = true;
      } else if (dayUnrestricted) {
        isMatch = matchesDow;
      } else if (dowUnrestricted) {
        isMatch = dayExists && matchesDay;
      } else {
        isMatch = (dayExists && matchesDay) || matchesDow;
      }

      if (isMatch) {
        results.push(new Date(current));
      }
    }

    if (results.length < count) {
      current.setUTCSeconds(current.getUTCSeconds() + 1);
    }
  }

  if (results.length < count) {
    throw new Error("No matching times found within search window");
  }

  return results;
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
