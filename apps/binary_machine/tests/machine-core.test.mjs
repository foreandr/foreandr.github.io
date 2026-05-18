import test from "node:test";
import assert from "node:assert/strict";

import { TinyMachine, SCREEN_START, SCREEN_SIZE } from "../machine-core.js";

test("loads immediates, adds, stores, and halts", () => {
  const machine = new TinyMachine();
  machine.loadBytes([
    0x10, 0x00, 0x05,
    0x10, 0x01, 0x07,
    0x14, 0x00, 0x01,
    0x12, 0x00, 0x20,
    0x01,
  ]);

  machine.runInstructions(16);

  assert.equal(machine.halted, true);
  assert.equal(machine.getRegister("A"), 12);
  assert.equal(machine.peek(0x20), 12);
  assert.equal(machine.flags.Z, 0);
});

test("writes to the screen through an indirect register address", () => {
  const machine = new TinyMachine();
  machine.loadBytes([
    0x10, 0x04, SCREEN_START,
    0x10, 0x00, 0x0c,
    0x1e, 0x00, 0x04,
    0x01,
  ]);

  machine.runInstructions(12);

  assert.equal(machine.halted, true);
  assert.equal(machine.peek(SCREEN_START), 0x0c);
  assert.equal(machine.readScreen()[0], 0x0c);
  assert.equal(machine.readScreen().length, SCREEN_SIZE);
});

test("invalid opcodes fault the machine instead of silently running", () => {
  const machine = new TinyMachine();
  machine.loadBytes([0xff]);

  machine.tickMicro();
  machine.tickMicro();

  assert.equal(machine.faulted, true);
  assert.match(machine.faultReason, /invalid opcode/i);
  assert.equal(machine.halted, false);
});

test("looping sample code can fill the first screen row through indirect writes", () => {
  const machine = new TinyMachine();
  machine.loadBytes([
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

  machine.runInstructions(64);

  assert.equal(machine.halted, true);
  assert.deepEqual(machine.readScreen().slice(0, 8), [1, 2, 3, 4, 5, 6, 7, 8]);
});
