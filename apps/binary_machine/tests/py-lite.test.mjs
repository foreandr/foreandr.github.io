import test from "node:test";
import assert from "node:assert/strict";

import { transpilePyLite } from "../py-lite.js";
import { compileCLike } from "../c-compiler.js";
import { assemble } from "../assembler.js";

test("python-like loop transpiles to c-like and machine code", () => {
  const source = `
i = 0
color = 1

while i != 8:
    screen[i] = color
    color = color + 1
    i = i + 1
  `;

  const py = transpilePyLite(source);
  const c = compileCLike(py.cSource);
  const asm = assemble(c.assembly);

  assert.match(py.cSource, /uint8 i = 0;/i);
  assert.match(py.cSource, /while \(i != 8\)/i);
  assert.ok(asm.bytes.length > 0);
});

test("python-like if blocks transpile correctly", () => {
  const source = `
x = 5
if x != 0:
    screen[0] = x
  `;

  const py = transpilePyLite(source);

  assert.match(py.cSource, /if \(x != 0\)/i);
  assert.match(py.cSource, /screen\[0\] = x;/i);
});

test("bad indentation fails loudly", () => {
  assert.throws(
    () => transpilePyLite("x = 1\n  y = 2\n z = 3"),
    /indent/i,
  );
});
