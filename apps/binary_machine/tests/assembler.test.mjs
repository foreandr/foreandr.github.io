import test from "node:test";
import assert from "node:assert/strict";

import { assemble } from "../assembler.js";

test("assembly with labels and constants compiles to existing machine bytes", () => {
  const source = `
    SCREEN = 0x80
    STEP = 0x01

    start:
      LDI X, SCREEN
      LDI A, 0x01
      LDI B, 0x08
      LDI C, STEP
    loop:
      STR A, X
      INC X
      ADD A, C
      DEC B
      JNZ loop
      HLT
  `;

  const result = assemble(source);

  assert.deepEqual(result.bytes, [
    0x10, 0x04, 0x80,
    0x10, 0x00, 0x01,
    0x10, 0x01, 0x08,
    0x10, 0x02, 0x01,
    0x1e, 0x00, 0x04,
    0x17, 0x04,
    0x14, 0x00, 0x02,
    0x18, 0x01,
    0x22, 0x0c,
    0x01,
  ]);
});

test("db directives and comments assemble into literal bytes", () => {
  const source = `
    ; raw data before code
    DB 0xAA, 0b00001111, 7
    LDI A, 0x05 ; inline comment
    HLT
  `;

  const result = assemble(source);

  assert.deepEqual(result.bytes, [0xaa, 0x0f, 0x07, 0x10, 0x00, 0x05, 0x01]);
});

test("unknown mnemonics fail with a useful error", () => {
  assert.throws(
    () => assemble("NOPE A, 0x01"),
    /unknown mnemonic/i,
  );
});
