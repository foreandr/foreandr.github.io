import test from "node:test";
import assert from "node:assert/strict";

import { samplePrograms } from "../sample-library.js";
import { transpilePyLite } from "../py-lite.js";
import { compileCLike } from "../c-compiler.js";
import { assemble } from "../assembler.js";
import { TinyMachine } from "../machine-core.js";

test("every built-in sample assembles into machine bytes", () => {
  assert.ok(samplePrograms.length >= 10, "expected at least 10 built-in samples");
  for (const sample of samplePrograms) {
    const asm = sample.assemblySource
      ? assemble(sample.assemblySource)
      : assemble(compileCLike(transpilePyLite(sample.pySource).cSource).assembly);
    assert.ok(asm.bytes.length > 0, `no bytes generated for ${sample.key}`);
  }
});

test("built-in samples do not fault during an initial run window", () => {
  for (const sample of samplePrograms) {
    const asm = sample.assemblySource
      ? assemble(sample.assemblySource)
      : assemble(compileCLike(transpilePyLite(sample.pySource).cSource).assembly);

    const machine = new TinyMachine();
    machine.loadBytes(asm.bytes, 0x00);

    for (let step = 0; step < 1200 && !machine.halted && !machine.faulted; step += 1) {
      machine.tickMicro();
    }

    assert.equal(machine.faulted, false, `${sample.key} faulted: ${machine.faultReason}`);
  }
});
