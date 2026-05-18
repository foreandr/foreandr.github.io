import test from "node:test";
import assert from "node:assert/strict";

import { compileCLike } from "../c-compiler.js";
import { assemble } from "../assembler.js";

test("c-like loop and screen writes compile into assembly and bytecode", () => {
  const source = `
    uint8 i = 0;
    uint8 color = 1;

    while (i != 8) {
      screen[i] = color;
      color = color + 1;
      i = i + 1;
    }
  `;

  const compiled = compileCLike(source);
  const assembled = assemble(compiled.assembly);

  assert.match(compiled.assembly, /while_start_/i);
  assert.match(compiled.assembly, /STR A, X/i);
  assert.ok(assembled.bytes.length > 0);
});

test("if statements compile with conditional jumps", () => {
  const source = `
    uint8 x = 5;
    if (x != 0) {
      screen[0] = x;
    }
  `;

  const compiled = compileCLike(source);

  assert.match(compiled.assembly, /JZ|JNZ/);
  assert.match(compiled.assembly, /__tmp_index/i);
});

test("unsupported syntax fails loudly", () => {
  assert.throws(
    () => compileCLike("for (i = 0; i < 8; i = i + 1) { }"),
    /unsupported|unexpected/i,
  );
});

test("input identifiers compile to memory reads", () => {
  const compiled = compileCLike(`
    uint8 x = 0;
    x = key_up;
  `);

  assert.match(compiled.assembly, /LDM A, INPUT_UP/i);
});

test("compiler variables do not overlap with longer program code", () => {
  const compiled = compileCLike(`
    uint8 i = 0;
    while (i != 64) {
      if ((i & 1) != 0) {
        screen[i] = 2;
      }
      if ((i & 1) == 0) {
        screen[i] = 12;
      }
      i = i + 1;
    }
  `);

  assert.match(compiled.assembly, /__tmp_index = 0xD0/i);
  assert.match(compiled.assembly, /__tmp_value = 0xD1/i);
  assert.match(compiled.assembly, /\bi = 0xD2\b/i);
});
