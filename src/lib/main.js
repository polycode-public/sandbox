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

const CHARSETS = {
  base62: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  base85: "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~",
};

export function encode(bytes, name) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  if (!CHARSETS[name]) {
    throw new Error(`Unknown encoding: ${name}`);
  }

  const charset = CHARSETS[name];
  const base = BigInt(charset.length);

  if (bytes.length === 0) {
    return "";
  }

  let leadingZeros = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      leadingZeros++;
    } else {
      break;
    }
  }

  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = (num << 8n) | BigInt(bytes[i]);
  }

  if (num === 0n) {
    return charset[0].repeat(bytes.length);
  }

  let encoded = "";
  while (num > 0n) {
    encoded = charset[Number(num % base)] + encoded;
    num = num / base;
  }

  const zeroChar = charset[0];
  encoded = zeroChar.repeat(leadingZeros) + encoded;

  return encoded;
}

export function decode(str, name) {
  if (typeof str !== "string") {
    throw new TypeError("str must be a string");
  }
  if (!CHARSETS[name]) {
    throw new Error(`Unknown encoding: ${name}`);
  }

  const charset = CHARSETS[name];
  const base = BigInt(charset.length);
  const zeroChar = charset[0];

  if (str.length === 0) {
    return new Uint8Array([]);
  }

  let leadingZeros = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === zeroChar) {
      leadingZeros++;
    } else {
      break;
    }
  }

  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const idx = charset.indexOf(str[i]);
    if (idx === -1) {
      throw new Error(`Invalid character for ${name}: ${str[i]}`);
    }
    num = num * base + BigInt(idx);
  }

  if (num === 0n && leadingZeros > 0) {
    return new Uint8Array(leadingZeros);
  }

  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num = num >> 8n;
  }

  const result = new Uint8Array(leadingZeros + bytes.length);
  result.set(bytes, leadingZeros);

  return result;
}

export function demo() {
  const examples = [];

  const testData = new Uint8Array([42, 123, 200, 5]);
  const base62Encoded = encode(testData, "base62");
  examples.push(`base62 encode: [42,123,200,5] → "${base62Encoded}"`);
  examples.push(`base62 decode: "${base62Encoded}" → [${Array.from(decode(base62Encoded, "base62")).join(",")}]`);

  const base85Encoded = encode(testData, "base85");
  examples.push(`base85 encode: [42,123,200,5] → "${base85Encoded}"`);
  examples.push(`base85 decode: "${base85Encoded}" → [${Array.from(decode(base85Encoded, "base85")).join(",")}]`);

  const leadingZeros = new Uint8Array([0, 0, 5]);
  const leadingZerosEncoded = encode(leadingZeros, "base62");
  examples.push(`Leading zeros preserved: [0,0,5] → "${leadingZerosEncoded}" → [${Array.from(decode(leadingZerosEncoded, "base62")).join(",")}]`);

  return examples.join("\n");
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
