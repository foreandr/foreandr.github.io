export const MEMORY_SIZE = 256;
export const SCREEN_START = 0x80;
export const SCREEN_SIZE = 64;

const REGISTER_NAMES = ["A", "B", "C", "D", "X", "Y"];

function byte(value) {
  return value & 0xff;
}

export class TinyMachine {
  constructor() {
    this.memory = new Uint8Array(MEMORY_SIZE);
    this.trace = [];
    this.microQueue = [];
    this.reset();
  }

  reset() {
    this.memory.fill(0);
    this.registers = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      X: 0,
      Y: 0,
      PC: 0,
      SP: 0xff,
      IR: 0,
      MAR: 0,
      MDR: 0,
    };
    this.flags = { Z: 0, C: 0, N: 0 };
    this.halted = false;
    this.faulted = false;
    this.faultReason = "";
    this.pendingOperands = [];
    this.currentInstruction = null;
    this.instructionsRetired = 0;
    this.cycles = 0;
    this.lastBus = null;
    this.trace = [];
    this.microQueue = [];
  }

  clearProgram() {
    this.reset();
  }

  loadBytes(bytes, start = 0x00) {
    for (let i = 0; i < bytes.length; i += 1) {
      this.memory[byte(start + i)] = byte(bytes[i]);
    }
  }

  peek(address) {
    return this.memory[byte(address)];
  }

  poke(address, value) {
    this.writeByte(address, value, "manual poke");
  }

  getRegister(name) {
    return this.registers[name];
  }

  getRegisterName(code) {
    return REGISTER_NAMES[code] ?? null;
  }

  getRegisterByCode(code) {
    const name = this.getRegisterName(code);
    if (!name) {
      this.tripFault(`Invalid register code 0x${byte(code).toString(16).padStart(2, "0")}`);
      return null;
    }
    return name;
  }

  setRegister(name, value) {
    this.registers[name] = byte(value);
  }

  readByte(address, reason = "read") {
    const safeAddress = byte(address);
    const value = this.memory[safeAddress];
    this.lastBus = { type: "read", address: safeAddress, value, reason };
    this.pushTrace(`${reason}: read [0x${safeAddress.toString(16).padStart(2, "0")}] -> 0x${value.toString(16).padStart(2, "0")}`);
    return value;
  }

  writeByte(address, value, reason = "write") {
    const safeAddress = byte(address);
    const safeValue = byte(value);
    this.memory[safeAddress] = safeValue;
    this.lastBus = { type: "write", address: safeAddress, value: safeValue, reason };
    this.pushTrace(`${reason}: write 0x${safeValue.toString(16).padStart(2, "0")} -> [0x${safeAddress.toString(16).padStart(2, "0")}]`);
  }

  readScreen() {
    return Array.from(this.memory.slice(SCREEN_START, SCREEN_START + SCREEN_SIZE), (value) => value & 0x0f);
  }

  enqueue(description, action) {
    this.microQueue.push({ description, action });
  }

  pushTrace(message) {
    this.trace.push({
      cycle: this.cycles,
      message,
    });
    if (this.trace.length > 512) {
      this.trace.shift();
    }
  }

  tripFault(reason) {
    this.faulted = true;
    this.faultReason = reason;
    this.microQueue.length = 0;
    this.pushTrace(`FAULT: ${reason}`);
  }

  updateFlags(result, carry = this.flags.C) {
    const safe = byte(result);
    this.flags.Z = safe === 0 ? 1 : 0;
    this.flags.N = safe & 0x80 ? 1 : 0;
    this.flags.C = carry ? 1 : 0;
  }

  primeFetch() {
    if (this.halted || this.faulted || this.microQueue.length) {
      return;
    }

    this.pendingOperands = [];
    this.currentInstruction = null;

    this.enqueue("MAR <- PC", () => {
      this.registers.MAR = this.registers.PC;
      this.pushTrace(`fetch address: MAR <- PC (0x${this.registers.PC.toString(16).padStart(2, "0")})`);
    });

    this.enqueue("IR <- RAM[MAR], PC++", () => {
      const opcode = this.readByte(this.registers.MAR, "opcode fetch");
      this.registers.MDR = opcode;
      this.registers.IR = opcode;
      this.registers.PC = byte(this.registers.PC + 1);

      const instruction = INSTRUCTION_SET[opcode];
      if (!instruction) {
        this.tripFault(`Invalid opcode 0x${opcode.toString(16).padStart(2, "0")}`);
        return;
      }

      this.currentInstruction = instruction;
      instruction.operands.forEach((operandName, index) => {
        this.enqueue(`MAR <- PC (${operandName})`, () => {
          this.registers.MAR = this.registers.PC;
          this.pushTrace(`operand address: ${operandName} @ 0x${this.registers.PC.toString(16).padStart(2, "0")}`);
        });

        this.enqueue(`read operand ${operandName}`, () => {
          const value = this.readByte(this.registers.MAR, `operand ${operandName}`);
          this.registers.MDR = value;
          this.pendingOperands[index] = value;
          this.registers.PC = byte(this.registers.PC + 1);
        });
      });

      this.enqueue(`execute ${instruction.mnemonic}`, () => {
        instruction.execute(this, this.pendingOperands.slice());
        if (!this.faulted) {
          this.instructionsRetired += 1;
          this.pushTrace(`retired ${instruction.mnemonic}`);
        }
        this.currentInstruction = null;
        this.pendingOperands = [];
      });
    });
  }

  tickMicro() {
    if (this.halted || this.faulted) {
      return false;
    }

    if (!this.microQueue.length) {
      this.primeFetch();
    }

    const next = this.microQueue.shift();
    if (!next) {
      return false;
    }

    next.action();
    this.cycles += 1;
    return true;
  }

  stepInstruction() {
    const retiredBefore = this.instructionsRetired;
    const cycleLimit = 64;
    let guard = 0;
    while (!this.halted && !this.faulted && this.instructionsRetired === retiredBefore && guard < cycleLimit) {
      if (!this.tickMicro()) {
        break;
      }
      guard += 1;
    }
    if (guard >= cycleLimit && this.instructionsRetired === retiredBefore && !this.halted && !this.faulted) {
      this.tripFault("Instruction step limit exceeded");
    }
  }

  runInstructions(limit = 256) {
    let count = 0;
    while (!this.halted && !this.faulted && count < limit) {
      this.stepInstruction();
      count += 1;
    }
    if (!this.halted && !this.faulted && count >= limit) {
      this.tripFault("Instruction run limit exceeded");
    }
  }
}

function readReg(machine, code) {
  const name = machine.getRegisterByCode(code);
  if (!name || machine.faulted) {
    return 0;
  }
  return machine.getRegister(name);
}

function writeReg(machine, code, value) {
  const name = machine.getRegisterByCode(code);
  if (!name || machine.faulted) {
    return;
  }
  machine.setRegister(name, value);
}

const INSTRUCTION_SET = {
  0x00: {
    mnemonic: "NOP",
    operands: [],
    execute(machine) {
      machine.pushTrace("NOP");
    },
  },
  0x01: {
    mnemonic: "HLT",
    operands: [],
    execute(machine) {
      machine.halted = true;
      machine.pushTrace("HLT");
    },
  },
  0x10: {
    mnemonic: "LDI",
    operands: ["reg", "imm"],
    execute(machine, [regCode, immediate]) {
      writeReg(machine, regCode, immediate);
      machine.updateFlags(immediate, 0);
      machine.pushTrace(`LDI ${machine.getRegisterName(regCode)}, 0x${byte(immediate).toString(16).padStart(2, "0")}`);
    },
  },
  0x11: {
    mnemonic: "LDM",
    operands: ["reg", "addr"],
    execute(machine, [regCode, address]) {
      const value = machine.readByte(address, "LDM");
      writeReg(machine, regCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`LDM ${machine.getRegisterName(regCode)}, [0x${byte(address).toString(16).padStart(2, "0")}]`);
    },
  },
  0x12: {
    mnemonic: "STM",
    operands: ["reg", "addr"],
    execute(machine, [regCode, address]) {
      const value = readReg(machine, regCode);
      machine.writeByte(address, value, "STM");
      machine.updateFlags(value, 0);
      machine.pushTrace(`STM ${machine.getRegisterName(regCode)}, [0x${byte(address).toString(16).padStart(2, "0")}]`);
    },
  },
  0x13: {
    mnemonic: "MOV",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const value = readReg(machine, srcCode);
      writeReg(machine, dstCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`MOV ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x14: {
    mnemonic: "ADD",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const left = readReg(machine, dstCode);
      const right = readReg(machine, srcCode);
      const sum = left + right;
      writeReg(machine, dstCode, sum);
      machine.updateFlags(sum, sum > 0xff);
      machine.pushTrace(`ADD ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x15: {
    mnemonic: "ADDI",
    operands: ["reg", "imm"],
    execute(machine, [regCode, immediate]) {
      const left = readReg(machine, regCode);
      const sum = left + immediate;
      writeReg(machine, regCode, sum);
      machine.updateFlags(sum, sum > 0xff);
      machine.pushTrace(`ADDI ${machine.getRegisterName(regCode)}, 0x${byte(immediate).toString(16).padStart(2, "0")}`);
    },
  },
  0x16: {
    mnemonic: "SUB",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const left = readReg(machine, dstCode);
      const right = readReg(machine, srcCode);
      const result = left - right;
      writeReg(machine, dstCode, result);
      machine.updateFlags(result, left >= right ? 1 : 0);
      machine.pushTrace(`SUB ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x17: {
    mnemonic: "INC",
    operands: ["reg"],
    execute(machine, [regCode]) {
      const value = readReg(machine, regCode) + 1;
      writeReg(machine, regCode, value);
      machine.updateFlags(value, value > 0xff);
      machine.pushTrace(`INC ${machine.getRegisterName(regCode)}`);
    },
  },
  0x18: {
    mnemonic: "DEC",
    operands: ["reg"],
    execute(machine, [regCode]) {
      const current = readReg(machine, regCode);
      const value = current - 1;
      writeReg(machine, regCode, value);
      machine.updateFlags(value, current !== 0 ? 1 : 0);
      machine.pushTrace(`DEC ${machine.getRegisterName(regCode)}`);
    },
  },
  0x19: {
    mnemonic: "CMP",
    operands: ["left", "right"],
    execute(machine, [leftCode, rightCode]) {
      const left = readReg(machine, leftCode);
      const right = readReg(machine, rightCode);
      const result = left - right;
      machine.updateFlags(result, left >= right ? 1 : 0);
      machine.pushTrace(`CMP ${machine.getRegisterName(leftCode)}, ${machine.getRegisterName(rightCode)}`);
    },
  },
  0x1a: {
    mnemonic: "AND",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const value = readReg(machine, dstCode) & readReg(machine, srcCode);
      writeReg(machine, dstCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`AND ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x1b: {
    mnemonic: "OR",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const value = readReg(machine, dstCode) | readReg(machine, srcCode);
      writeReg(machine, dstCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`OR ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x1c: {
    mnemonic: "XOR",
    operands: ["dst", "src"],
    execute(machine, [dstCode, srcCode]) {
      const value = readReg(machine, dstCode) ^ readReg(machine, srcCode);
      writeReg(machine, dstCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`XOR ${machine.getRegisterName(dstCode)}, ${machine.getRegisterName(srcCode)}`);
    },
  },
  0x1d: {
    mnemonic: "LDR",
    operands: ["dst", "addrReg"],
    execute(machine, [dstCode, addrRegCode]) {
      const address = readReg(machine, addrRegCode);
      const value = machine.readByte(address, "LDR");
      writeReg(machine, dstCode, value);
      machine.updateFlags(value, 0);
      machine.pushTrace(`LDR ${machine.getRegisterName(dstCode)}, [${machine.getRegisterName(addrRegCode)}]`);
    },
  },
  0x1e: {
    mnemonic: "STR",
    operands: ["src", "addrReg"],
    execute(machine, [srcCode, addrRegCode]) {
      const address = readReg(machine, addrRegCode);
      const value = readReg(machine, srcCode);
      machine.writeByte(address, value, "STR");
      machine.updateFlags(value, 0);
      machine.pushTrace(`STR ${machine.getRegisterName(srcCode)}, [${machine.getRegisterName(addrRegCode)}]`);
    },
  },
  0x1f: {
    mnemonic: "SHL",
    operands: ["reg"],
    execute(machine, [regCode]) {
      const value = readReg(machine, regCode);
      const result = byte(value << 1);
      writeReg(machine, regCode, result);
      machine.updateFlags(result, value & 0x80 ? 1 : 0);
      machine.pushTrace(`SHL ${machine.getRegisterName(regCode)}`);
    },
  },
  0x20: {
    mnemonic: "JMP",
    operands: ["addr"],
    execute(machine, [address]) {
      machine.setRegister("PC", address);
      machine.pushTrace(`JMP 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x21: {
    mnemonic: "JZ",
    operands: ["addr"],
    execute(machine, [address]) {
      if (machine.flags.Z) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JZ 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x22: {
    mnemonic: "JNZ",
    operands: ["addr"],
    execute(machine, [address]) {
      if (!machine.flags.Z) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JNZ 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x23: {
    mnemonic: "JC",
    operands: ["addr"],
    execute(machine, [address]) {
      if (machine.flags.C) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JC 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x24: {
    mnemonic: "JNC",
    operands: ["addr"],
    execute(machine, [address]) {
      if (!machine.flags.C) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JNC 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x25: {
    mnemonic: "JN",
    operands: ["addr"],
    execute(machine, [address]) {
      if (machine.flags.N) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JN 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x26: {
    mnemonic: "JNN",
    operands: ["addr"],
    execute(machine, [address]) {
      if (!machine.flags.N) {
        machine.setRegister("PC", address);
      }
      machine.pushTrace(`JNN 0x${byte(address).toString(16).padStart(2, "0")}`);
    },
  },
  0x27: {
    mnemonic: "SHR",
    operands: ["reg"],
    execute(machine, [regCode]) {
      const value = readReg(machine, regCode);
      const result = value >> 1;
      writeReg(machine, regCode, result);
      machine.updateFlags(result, value & 0x01 ? 1 : 0);
      machine.pushTrace(`SHR ${machine.getRegisterName(regCode)}`);
    },
  },
};

export const ISA = Object.entries(INSTRUCTION_SET).map(([opcode, spec]) => ({
  opcode: Number(opcode),
  mnemonic: spec.mnemonic,
  operands: spec.operands.slice(),
}));
