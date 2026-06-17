// SPDX-License-Identifier: MIT
// Copyright (C) 2025-2026 Polycode Limited
import { describe, test, expect } from "vitest";
import { main, getIdentity, name, version, description, encode, decode, listEncodings } from "../../src/lib/main.js";

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

describe("encode/decode base62", () => {
  test("empty array round-trips", () => {
    const input = new Uint8Array([]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("single zero byte round-trips", () => {
    const input = new Uint8Array([0]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("single non-zero byte round-trips", () => {
    const input = new Uint8Array([255]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("all-zero bytes round-trip", () => {
    const input = new Uint8Array([0, 0, 0, 0]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("all-0xFF bytes round-trip", () => {
    const input = new Uint8Array([255, 255, 255, 255]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("random 16-byte array round-trips", () => {
    const input = new Uint8Array([1, 35, 69, 103, 137, 171, 205, 239, 18, 52, 86, 120, 154, 188, 222, 255]);
    const encoded = encode(input, "base62");
    const decoded = decode(encoded, "base62");
    expect(decoded).toEqual(input);
  });

  test("encoded output uses only base62 charset", () => {
    const input = new Uint8Array([42, 123, 200]);
    const encoded = encode(input, "base62");
    const validChars = /^[0-9A-Za-z]*$/;
    expect(encoded).toMatch(validChars);
  });
});

describe("encode/decode base85", () => {
  test("empty array round-trips", () => {
    const input = new Uint8Array([]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("single zero byte round-trips", () => {
    const input = new Uint8Array([0]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("single non-zero byte round-trips", () => {
    const input = new Uint8Array([255]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("all-zero bytes round-trip", () => {
    const input = new Uint8Array([0, 0, 0, 0]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("all-0xFF bytes round-trip", () => {
    const input = new Uint8Array([255, 255, 255, 255]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("random 16-byte array round-trips", () => {
    const input = new Uint8Array([1, 35, 69, 103, 137, 171, 205, 239, 18, 52, 86, 120, 154, 188, 222, 255]);
    const encoded = encode(input, "base85");
    const decoded = decode(encoded, "base85");
    expect(decoded).toEqual(input);
  });

  test("encoded output uses only base85 charset", () => {
    const input = new Uint8Array([42, 123, 200]);
    const encoded = encode(input, "base85");
    const charset = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~";
    for (const char of encoded) {
      expect(charset).toContain(char);
    }
  });
});

describe("encode/decode error cases", () => {
  test("encode throws for non-Uint8Array", () => {
    expect(() => encode([1, 2, 3], "base62")).toThrow(TypeError);
    expect(() => encode("bytes", "base62")).toThrow(TypeError);
  });

  test("decode throws for unknown encoding", () => {
    expect(() => decode("abc", "unknown")).toThrow(Error);
  });

  test("encode throws for unknown encoding", () => {
    expect(() => encode(new Uint8Array([1, 2]), "unknown")).toThrow(Error);
  });

  test("decode throws for invalid character", () => {
    expect(() => decode("@@@", "base62")).toThrow(Error);
  });
});
