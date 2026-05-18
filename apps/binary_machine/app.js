import { assemble } from "./assembler.js";
import { compileCLike } from "./c-compiler.js";
import { ISA, MEMORY_SIZE, SCREEN_SIZE, SCREEN_START, TinyMachine } from "./machine-core.js";
import { transpilePyLite } from "./py-lite.js";
import { samplePrograms } from "./sample-library.js";

const machine = new TinyMachine();

const registerNames = ["A", "B", "C", "D", "X", "Y", "PC", "SP", "IR", "MAR", "MDR"];
const flagNames = ["Z", "C", "N", "HALT", "FAULT"];
const palette = [
  "#05070b", "#f8fafc", "#f97316", "#22c55e",
  "#38bdf8", "#8b5cf6", "#eab308", "#ef4444",
  "#14b8a6", "#84cc16", "#fb7185", "#f59e0b",
  "#0ea5e9", "#c084fc", "#facc15", "#d4d4d8",
];

const instructionHelp = {
  NOP: "Do nothing for one instruction.",
  HLT: "Stop the clock until reset or manual edits.",
  LDI: "Load an immediate literal byte into a register.",
  LDM: "Load a byte from absolute RAM into a register.",
  STM: "Store a register byte into absolute RAM.",
  MOV: "Copy one register into another.",
  ADD: "Add source register into destination register.",
  ADDI: "Add an immediate byte into a register.",
  SUB: "Subtract source register from destination register.",
  INC: "Increment a register by 1.",
  DEC: "Decrement a register by 1.",
  CMP: "Subtract for flags only without storing the result.",
  AND: "Bitwise AND into destination register.",
  OR: "Bitwise OR into destination register.",
  XOR: "Bitwise XOR into destination register.",
  LDR: "Load from the RAM address stored inside another register.",
  STR: "Store into the RAM address stored inside another register.",
  SHL: "Shift a register left by one bit.",
  SHR: "Shift a register right by one bit.",
  JMP: "Jump to an absolute byte address.",
  JZ: "Jump if zero flag is set.",
  JNZ: "Jump if zero flag is clear.",
  JC: "Jump if carry flag is set.",
  JNC: "Jump if carry flag is clear.",
  JN: "Jump if negative flag is set.",
  JNN: "Jump if negative flag is clear.",
};

const elements = {
  statusText: document.getElementById("statusText"),
  faultText: document.getElementById("faultText"),
  busText: document.getElementById("busText"),
  cycleText: document.getElementById("cycleText"),
  assemblyStatusHeadline: document.getElementById("assemblyStatusHeadline"),
  assemblyStatusText: document.getElementById("assemblyStatusText"),
  assemblyStatusPill: document.getElementById("assemblyStatusPill"),
  pyInput: document.getElementById("pyInput"),
  pythonSamplePicker: document.getElementById("pythonSamplePicker"),
  pythonSampleDescription: document.getElementById("pythonSampleDescription"),
  cInput: document.getElementById("cInput"),
  assemblyInput: document.getElementById("assemblyInput"),
  assemblyBytes: document.getElementById("assemblyBytes"),
  assemblyMeta: document.getElementById("assemblyMeta"),
  symbolSummary: document.getElementById("symbolSummary"),
  assemblyListing: document.getElementById("assemblyListing"),
  speedRange: document.getElementById("speedRange"),
  speedLabel: document.getElementById("speedLabel"),
  runMode: document.getElementById("runMode"),
  registerGrid: document.getElementById("registerGrid"),
  flagGrid: document.getElementById("flagGrid"),
  irDecode: document.getElementById("irDecode"),
  operandState: document.getElementById("operandState"),
  queueDepth: document.getElementById("queueDepth"),
  selectedCellInfo: document.getElementById("selectedCellInfo"),
  screenGrid: document.getElementById("screenGrid"),
  paletteLegend: document.getElementById("paletteLegend"),
  traceLog: document.getElementById("traceLog"),
  memoryGrid: document.getElementById("memoryGrid"),
  hexInput: document.getElementById("hexInput"),
  decInput: document.getElementById("decInput"),
  binInput: document.getElementById("binInput"),
  bitStrip: document.getElementById("bitStrip"),
  byteStreamInput: document.getElementById("byteStreamInput"),
  opcodeSelect: document.getElementById("opcodeSelect"),
  operandFields: document.getElementById("operandFields"),
  emitBytes: document.getElementById("emitBytes"),
  emitHelp: document.getElementById("emitHelp"),
  isaBody: document.getElementById("isaBody"),
  tabButtons: [...document.querySelectorAll(".tab-btn")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
};

let selectedAddress = 0x00;
let runTimer = null;
let lastAssembleResult = null;
let lastCResult = null;
let lastPyResult = null;
let activeSampleKey = samplePrograms[0]?.key ?? null;
const assemblySamplePlaceholder = "# This sample is hand-written assembly.\n# Open the Assembly panel below to inspect or edit it.";

function setCodePanelState(kind) {
  const panels = {
    python: document.querySelector('.code-panel summary + .code-panel-body #pyInput')?.closest(".code-panel"),
    c: document.querySelector('.code-panel summary + .code-panel-body #cInput')?.closest(".code-panel"),
    assembly: document.querySelector('.code-panel summary + .code-panel-body #assemblyInput')?.closest(".code-panel"),
    bytes: document.querySelector('.code-panel summary + .code-panel-body #assemblyBytes')?.closest(".code-panel"),
  };
  if (kind === "assembly") {
    if (panels.python) panels.python.open = true;
    if (panels.assembly) panels.assembly.open = true;
    if (panels.bytes) panels.bytes.open = true;
    return;
  }
  if (panels.python) panels.python.open = true;
}

function getActiveSample() {
  return samplePrograms.find((sample) => sample.key === activeSampleKey) ?? null;
}

function getRunProfile() {
  const seconds = Number(elements.speedRange.value);
  const ms = Math.max(1, Math.round(seconds * 1000));
  if (seconds <= 0.001) return { delayMs: 8, burst: 32, label: "0.001 s / x32 burst" };
  if (seconds <= 0.005) return { delayMs: 8, burst: 16, label: `${seconds.toFixed(3)} s / x16 burst` };
  if (seconds <= 0.010) return { delayMs: 10, burst: 8, label: `${seconds.toFixed(3)} s / x8 burst` };
  if (seconds <= 0.020) return { delayMs: 20, burst: 4, label: `${seconds.toFixed(3)} s / x4 burst` };
  if (seconds <= 0.040) return { delayMs: 40, burst: 2, label: `${seconds.toFixed(3)} s / x2 burst` };
  return { delayMs: ms, burst: 1, label: `${seconds.toFixed(3)} s` };
}

function hex(value) {
  return `0x${(value & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
}

function word(value) {
  return (value & 0xff).toString(2).padStart(8, "0");
}

function normalizeByte(value) {
  return value & 0xff;
}

function parseByte(text) {
  const raw = String(text ?? "").trim();
  if (!raw) throw new Error("Missing byte value");
  if (/^0x[0-9a-f]+$/i.test(raw)) return Number.parseInt(raw.slice(2), 16) & 0xff;
  if (/^[0-9a-f]{2}$/i.test(raw)) return Number.parseInt(raw, 16) & 0xff;
  if (/^0b[01]+$/i.test(raw)) return Number.parseInt(raw.slice(2), 2) & 0xff;
  if (/^[01]{8}$/.test(raw)) return Number.parseInt(raw, 2) & 0xff;
  if (/^-?\d+$/.test(raw)) {
    const value = Number.parseInt(raw, 10);
    if (value < 0 || value > 255) throw new Error(`Byte out of range: ${raw}`);
    return value & 0xff;
  }
  throw new Error(`Bad byte literal: ${raw}`);
}

function parseByteStream(text) {
  return text.split(/[\s,]+/).filter(Boolean).map(parseByte);
}

function stopRun() {
  if (runTimer) {
    window.clearInterval(runTimer);
    runTimer = null;
  }
}

function startRunLoop() {
  stopRun();
  const profile = getRunProfile();
  runTimer = window.setInterval(tickOnce, profile.delayMs);
}

function setCompileStatus(kind, headline, detail) {
  elements.assemblyStatusHeadline.textContent = headline;
  elements.assemblyStatusText.textContent = detail;
  elements.assemblyStatusPill.textContent = headline;
  elements.assemblyStatusPill.className = "pill";
  if (kind === "good") elements.assemblyStatusPill.classList.add("good");
  if (kind === "bad") elements.assemblyStatusPill.classList.add("bad");
}

function refreshStatus() {
  if (machine.faulted) {
    elements.statusText.textContent = "Faulted";
    elements.faultText.textContent = machine.faultReason;
  } else if (machine.halted) {
    elements.statusText.textContent = "Halted";
    elements.faultText.textContent = "HLT executed";
  } else if (runTimer) {
    elements.statusText.textContent = "Running";
    elements.faultText.textContent = "Clock is advancing";
  } else {
    elements.statusText.textContent = "Ready";
    elements.faultText.textContent = "No fault";
  }

  if (machine.lastBus) {
    const { type, address, value, reason } = machine.lastBus;
    elements.busText.textContent = `${type.toUpperCase()} ${hex(address)} = ${hex(value)}`;
    elements.cycleText.textContent = `${machine.cycles} cycles, ${machine.instructionsRetired} retired, ${reason}`;
  } else {
    elements.busText.textContent = "None";
    elements.cycleText.textContent = `${machine.cycles} cycles, ${machine.instructionsRetired} retired`;
  }
}

function renderRegisters() {
  elements.registerGrid.innerHTML = registerNames.map((name) => `
    <div class="register-card">
      <label>${name}</label>
      <strong>${hex(machine.getRegister(name))}</strong>
      <span>${word(machine.getRegister(name))}</span>
    </div>
  `).join("");

  const flagValues = {
    Z: machine.flags.Z,
    C: machine.flags.C,
    N: machine.flags.N,
    HALT: machine.halted ? 1 : 0,
    FAULT: machine.faulted ? 1 : 0,
  };

  elements.flagGrid.innerHTML = flagNames.map((name) => `
    <div class="flag-card">
      <label>${name}</label>
      <strong>${flagValues[name]}</strong>
      <span>${flagValues[name] ? "set" : "clear"}</span>
    </div>
  `).join("");

  const ir = machine.getRegister("IR");
  const spec = ISA.find((entry) => entry.opcode === ir);
  elements.irDecode.textContent = spec ? `IR: ${hex(ir)} ${spec.mnemonic}` : `IR: ${hex(ir)} unknown`;
  elements.operandState.textContent = JSON.stringify(machine.pendingOperands.map((value) => hex(value)));
  elements.queueDepth.textContent = String(machine.microQueue.length);
  elements.selectedCellInfo.textContent = `${hex(selectedAddress)} = ${hex(machine.peek(selectedAddress))}`;
}

function renderScreen() {
  const pixels = machine.readScreen();
  elements.screenGrid.innerHTML = pixels.map((value, index) => {
    const color = palette[value & 0x0f];
    return `<div class="pixel" title="${hex(SCREEN_START + index)} = ${hex(value)}" style="background:${color};"></div>`;
  }).join("");
}

function renderPalette() {
  elements.paletteLegend.innerHTML = palette.map((color, index) => `
    <div class="palette-row">
      <div class="palette-chip" style="background:${color};"></div>
      <span>${hex(index)}</span>
      <span>${color}</span>
    </div>
  `).join("");
}

function renderTrace() {
  const rows = machine.trace.slice(-80).reverse();
  elements.traceLog.innerHTML = rows.map((entry) => `
    <div class="trace-row"><span class="trace-cycle">#${entry.cycle}</span>${entry.message}</div>
  `).join("");
}

function makeMemoryCell(address) {
  const button = document.createElement("button");
  button.className = "memory-cell";
  button.dataset.address = String(address);
  button.addEventListener("click", () => {
    selectedAddress = address;
    syncByteInputsFromSelection();
    renderMemory();
    renderRegisters();
  });
  return button;
}

function renderMemory() {
  if (!elements.memoryGrid.childElementCount) {
    for (let address = 0; address < MEMORY_SIZE; address += 1) {
      elements.memoryGrid.appendChild(makeMemoryCell(address));
    }
  }

  for (const child of elements.memoryGrid.children) {
    const address = Number(child.dataset.address);
    const value = machine.peek(address);
    child.className = "memory-cell";
    if (address === selectedAddress) child.classList.add("selected");
    if (address === machine.getRegister("PC")) child.classList.add("pc");
    if (address === machine.getRegister("MAR")) child.classList.add("mar");
    if (address >= SCREEN_START && address < SCREEN_START + SCREEN_SIZE) child.classList.add("screen");
    if (machine.lastBus && address === machine.lastBus.address) child.classList.add(machine.lastBus.type);
    child.innerHTML = `
      <span class="cell-addr">${hex(address)}</span>
      <span class="cell-hex">${hex(value)}</span>
      <span class="cell-bin">${word(value)}</span>
    `;
  }
}

function syncByteInputsFromSelection() {
  const value = machine.peek(selectedAddress);
  elements.hexInput.value = value.toString(16).padStart(2, "0").toUpperCase();
  elements.decInput.value = String(value);
  elements.binInput.value = word(value);

  if (!elements.bitStrip.childElementCount) {
    for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
      const bitButton = document.createElement("button");
      bitButton.className = "bit-btn";
      bitButton.dataset.bit = String(bitIndex);
      bitButton.addEventListener("click", () => {
        const mask = 1 << Number(bitButton.dataset.bit);
        applySelectedByte(machine.peek(selectedAddress) ^ mask);
      });
      elements.bitStrip.appendChild(bitButton);
    }
  }

  [...elements.bitStrip.children].forEach((button) => {
    const bitIndex = Number(button.dataset.bit);
    const on = (value >> bitIndex) & 1;
    button.textContent = String(on);
    button.classList.toggle("on", Boolean(on));
  });
}

function applySelectedByte(value) {
  machine.poke(selectedAddress, value);
  syncByteInputsFromSelection();
  renderAll();
}

function renderBuilderFields() {
  const spec = ISA.find((entry) => entry.opcode === Number(elements.opcodeSelect.value));
  if (!spec) {
    elements.operandFields.innerHTML = "";
    return;
  }

  elements.operandFields.innerHTML = spec.operands.map((operand, index) => {
    const registerOperand = operand.toLowerCase().includes("reg") || ["dst", "src", "left", "right"].includes(operand);
    if (registerOperand) {
      return `
        <div class="field">
          <label>${operand}</label>
          <select data-operand-index="${index}" data-operand-kind="register">
            ${registerNames.slice(0, 6).map((name, code) => `<option value="${code}">${code} = ${name}</option>`).join("")}
          </select>
        </div>
      `;
    }

    const defaultValue = operand === "addr" ? "0x80" : "0x00";
    return `
      <div class="field">
        <label>${operand}</label>
        <input data-operand-index="${index}" data-operand-kind="byte" value="${defaultValue}">
      </div>
    `;
  }).join("");

  [...elements.operandFields.querySelectorAll("select, input")].forEach((field) => {
    field.addEventListener("input", updateEmitPreview);
  });
}

function buildInstructionBytes() {
  const opcode = Number(elements.opcodeSelect.value);
  const spec = ISA.find((entry) => entry.opcode === opcode);
  const bytes = [opcode];
  if (!spec) return bytes;

  const fields = [...elements.operandFields.querySelectorAll("[data-operand-index]")].sort((a, b) =>
    Number(a.dataset.operandIndex) - Number(b.dataset.operandIndex)
  );

  for (const field of fields) {
    if (field.dataset.operandKind === "register") {
      bytes.push(Number(field.value));
    } else {
      bytes.push(parseByte(field.value));
    }
  }
  return bytes;
}

function updateEmitPreview() {
  try {
    const bytes = buildInstructionBytes();
    const spec = ISA.find((entry) => entry.opcode === Number(elements.opcodeSelect.value));
    elements.emitBytes.textContent = bytes.map(hex).join(" ");
    elements.emitHelp.textContent = spec
      ? `${spec.mnemonic} writes ${bytes.length} byte${bytes.length === 1 ? "" : "s"} into RAM starting at ${hex(selectedAddress)}.`
      : "Select an opcode.";
  } catch (error) {
    elements.emitBytes.textContent = "INVALID";
    elements.emitHelp.textContent = error.message;
  }
}

function writeBytesAt(bytes, startAddress) {
  machine.loadBytes(bytes, startAddress);
  selectedAddress = normalizeByte(startAddress + Math.max(bytes.length - 1, 0));
  syncByteInputsFromSelection();
  renderAll();
}

function loadSample(sample, autoCompile = true) {
  activeSampleKey = sample.key;
  elements.pythonSamplePicker.value = sample.key;
  elements.pythonSampleDescription.textContent = `${sample.category}: ${sample.description}`;
  if (sample.assemblySource) {
    setCodePanelState("assembly");
    elements.pyInput.value = assemblySamplePlaceholder;
    elements.cInput.value = "// This sample bypasses the C-like layer and loads assembly directly.";
    elements.assemblyInput.value = sample.assemblySource;
    if (sample.rawBytes) {
      elements.byteStreamInput.value = sample.rawBytes;
    }
    if (autoCompile) {
      compileAssembly(false, "Assembly sample");
    }
  } else {
    setCodePanelState("python");
    elements.pyInput.value = sample.pySource ?? "";
    if (sample.rawBytes) {
      elements.byteStreamInput.value = sample.rawBytes;
    }
    if (autoCompile) {
      compilePy(false);
    }
  }
}

function renderSamples() {
  if (!elements.pythonSamplePicker.childElementCount) {
    samplePrograms.forEach((sample) => {
      const option = document.createElement("option");
      option.value = sample.key;
      option.textContent = `${sample.category} - ${sample.title}`;
      elements.pythonSamplePicker.appendChild(option);
    });
  }

  const active = samplePrograms.find((sample) => sample.key === activeSampleKey) ?? samplePrograms[0];
  if (active) {
    elements.pythonSamplePicker.value = active.key;
    elements.pythonSampleDescription.textContent = `${active.category}: ${active.description}`;
  }
}

function renderIsa() {
  elements.isaBody.innerHTML = ISA.map((entry) => {
    const format = [hex(entry.opcode)].concat(entry.operands).join(" ");
    return `
      <tr>
        <td><code>${hex(entry.opcode)}</code></td>
        <td><strong>${entry.mnemonic}</strong></td>
        <td><code>${format}</code></td>
        <td>${instructionHelp[entry.mnemonic] ?? "Defined instruction."}</td>
      </tr>
    `;
  }).join("");
}

function renderAssemblyResult(result) {
  if (!result) {
    elements.assemblyBytes.textContent = "--";
    elements.assemblyMeta.textContent = "The assembler output will appear here.";
    elements.symbolSummary.textContent = "--";
    elements.assemblyListing.innerHTML = "";
    return;
  }

  elements.byteStreamInput.value = result.bytes.map(hex).join(" ");
  elements.assemblyBytes.textContent = result.bytes.map(hex).join(" ");
  elements.assemblyMeta.textContent = `${result.bytes.length} bytes generated. Load them into RAM as-is or keep editing bytes manually.`;
  const symbolEntries = Object.entries(result.symbols);
  elements.symbolSummary.textContent = symbolEntries.length
    ? symbolEntries.map(([name, value]) => `${name}=${hex(value)}`).join(" ")
    : "No symbols";
  elements.assemblyListing.innerHTML = result.listing.map((row) => `
    <div class="listing-row">
      <span class="listing-address">${hex(row.address)}</span>
      <span>${row.bytes.map(hex).join(" ")}</span>
      <span style="color:#95a8bf;">  ${row.text}</span>
    </div>
  `).join("");
}

function renderAll() {
  refreshStatus();
  renderRegisters();
  renderScreen();
  renderTrace();
  renderMemory();
  syncByteInputsFromSelection();
}

function tickOnce() {
  const { burst } = getRunProfile();
  for (let i = 0; i < burst; i += 1) {
    if (machine.halted || machine.faulted) {
      break;
    }
    if (elements.runMode.value === "micro") {
      machine.tickMicro();
    } else {
      machine.stepInstruction();
    }
  }

  if (machine.halted || machine.faulted) {
    stopRun();
  }
  renderAll();
}

function activateTab(panelId) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === panelId);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function loadCompiledProgram(result, shouldReset = true) {
  stopRun();
  if (shouldReset) machine.reset();
  machine.loadBytes(result.bytes, 0x00);
  selectedAddress = 0x00;
  renderAll();
}

function compileAssembly(loadMode, sourceKind = "Assembly") {
  try {
    const result = assemble(elements.assemblyInput.value);
    lastAssembleResult = result;
    renderAssemblyResult(result);
    setCompileStatus("good", `${sourceKind} compiled`, `${result.bytes.length} bytes generated with ${Object.keys(result.symbols).length} symbol(s).`);
    if (loadMode === "load" || loadMode === "run") {
      loadCompiledProgram(result, true);
      activateTab("memoryPanel");
    }
    if (loadMode === "run") {
      startRunLoop();
    }
    renderAll();
  } catch (error) {
    lastAssembleResult = null;
    renderAssemblyResult(null);
    setCompileStatus("bad", `${sourceKind} error`, error.message);
  }
}

function compileC(loadMode) {
  try {
    const result = compileCLike(elements.cInput.value);
    lastCResult = result;
    elements.assemblyInput.value = result.assembly;
    compileAssembly(loadMode, "C-like");
  } catch (error) {
    lastCResult = null;
    setCompileStatus("bad", "C-like error", error.message);
  }
}

function compilePy(loadMode) {
  try {
    const activeSample = getActiveSample();
    if (activeSample?.assemblySource && elements.pyInput.value.trim() === assemblySamplePlaceholder.trim()) {
      elements.cInput.value = "// This sample bypasses the C-like layer and loads assembly directly.";
      elements.assemblyInput.value = activeSample.assemblySource;
      compileAssembly(loadMode, "Assembly sample");
      return;
    }
    const result = transpilePyLite(elements.pyInput.value);
    lastPyResult = result;
    elements.cInput.value = result.cSource;
    compileC(loadMode);
  } catch (error) {
    lastPyResult = null;
    setCompileStatus("bad", "Python-like error", error.message);
  }
}

function bootUi() {
  renderPalette();
  renderSamples();
  renderIsa();

  ISA.forEach((entry) => {
    const option = document.createElement("option");
    option.value = String(entry.opcode);
    option.textContent = `${hex(entry.opcode)} ${entry.mnemonic}`;
    elements.opcodeSelect.appendChild(option);
  });
  elements.opcodeSelect.value = String(0x10);
  renderBuilderFields();
  updateEmitPreview();

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });

  elements.pythonSamplePicker.addEventListener("change", () => {
    const nextSample = samplePrograms.find((sample) => sample.key === elements.pythonSamplePicker.value);
    if (nextSample) {
      loadSample(nextSample, true);
    }
  });

  document.getElementById("compilePyBtn").addEventListener("click", () => compilePy(false));
  document.getElementById("compilePyLoadBtn").addEventListener("click", () => compilePy("load"));
  document.getElementById("compilePyRunBtn").addEventListener("click", () => compilePy("run"));
  document.getElementById("compileCBtn").addEventListener("click", () => compileC(false));
  document.getElementById("compileCLoadBtn").addEventListener("click", () => compileC("load"));
  document.getElementById("compileCRunBtn").addEventListener("click", () => compileC("run"));
  document.getElementById("assembleBtn").addEventListener("click", () => compileAssembly(false));
  document.getElementById("assembleLoadBtn").addEventListener("click", () => compileAssembly("load"));
  document.getElementById("assembleRunBtn").addEventListener("click", () => compileAssembly("run"));

  document.getElementById("microStepBtn").addEventListener("click", () => {
    stopRun();
    machine.tickMicro();
    renderAll();
  });

  document.getElementById("instructionStepBtn").addEventListener("click", () => {
    stopRun();
    machine.stepInstruction();
    renderAll();
  });

  document.getElementById("runBtn").addEventListener("click", () => {
    startRunLoop();
    renderAll();
  });

  document.getElementById("stopBtn").addEventListener("click", () => {
    stopRun();
    renderAll();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    stopRun();
    machine.reset();
    selectedAddress = 0x00;
    renderAll();
  });

  document.getElementById("clearScreenBtn").addEventListener("click", () => {
    for (let offset = 0; offset < SCREEN_SIZE; offset += 1) {
      machine.poke(SCREEN_START + offset, 0);
    }
    renderAll();
  });

  document.getElementById("applyByteBtn").addEventListener("click", () => {
    try {
      applySelectedByte(parseByte(elements.hexInput.value));
    } catch (error) {
      setCompileStatus("bad", "Byte error", error.message);
    }
  });

  document.getElementById("zeroByteBtn").addEventListener("click", () => applySelectedByte(0));

  document.getElementById("fillScreenBtn").addEventListener("click", () => {
    const fillValue = machine.peek(selectedAddress);
    for (let offset = 0; offset < SCREEN_SIZE; offset += 1) {
      machine.poke(SCREEN_START + offset, fillValue);
    }
    renderAll();
  });

  document.getElementById("loadBytesBtn").addEventListener("click", () => {
    try {
      writeBytesAt(parseByteStream(elements.byteStreamInput.value), selectedAddress);
      activateTab("memoryPanel");
    } catch (error) {
      setCompileStatus("bad", "Byte error", error.message);
    }
  });

  document.getElementById("replaceProgramBtn").addEventListener("click", () => {
    try {
      stopRun();
      machine.reset();
      machine.loadBytes(parseByteStream(elements.byteStreamInput.value), 0x00);
      selectedAddress = 0x00;
      renderAll();
      activateTab("memoryPanel");
    } catch (error) {
      setCompileStatus("bad", "Byte error", error.message);
    }
  });

  document.getElementById("wipeRamBtn").addEventListener("click", () => {
    stopRun();
    machine.reset();
    renderAll();
  });

  document.getElementById("writeInstructionBtn").addEventListener("click", () => {
    try {
      writeBytesAt(buildInstructionBytes(), selectedAddress);
      activateTab("memoryPanel");
    } catch (error) {
      setCompileStatus("bad", "Builder error", error.message);
    }
  });

  document.getElementById("appendInstructionBtn").addEventListener("click", () => {
    try {
      writeBytesAt(buildInstructionBytes(), normalizeByte(selectedAddress + 1));
      activateTab("memoryPanel");
    } catch (error) {
      setCompileStatus("bad", "Builder error", error.message);
    }
  });

  document.getElementById("copyEmitBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(buildInstructionBytes().map(hex).join(" "));
      elements.emitHelp.textContent = "Copied emitted bytes to clipboard.";
    } catch {
      elements.emitHelp.textContent = "Clipboard copy failed in this browser context.";
    }
  });

  elements.speedRange.addEventListener("input", () => {
    elements.speedLabel.value = getRunProfile().label;
    if (runTimer) {
      startRunLoop();
    }
  });

  elements.opcodeSelect.addEventListener("change", () => {
    renderBuilderFields();
    updateEmitPreview();
  });

  elements.hexInput.addEventListener("input", () => {
    try {
      const value = parseByte(elements.hexInput.value);
      elements.decInput.value = String(value);
      elements.binInput.value = word(value);
    } catch {}
  });

  elements.decInput.addEventListener("input", () => {
    const value = Number(elements.decInput.value);
    if (Number.isFinite(value) && value >= 0 && value <= 255) {
      elements.hexInput.value = value.toString(16).padStart(2, "0").toUpperCase();
      elements.binInput.value = word(value);
    }
  });

  elements.binInput.addEventListener("input", () => {
    try {
      const value = parseByte(elements.binInput.value);
      elements.hexInput.value = value.toString(16).padStart(2, "0").toUpperCase();
      elements.decInput.value = String(value);
    } catch {}
  });

  elements.assemblyInput.addEventListener("input", () => {
    setCompileStatus("good", "Editing assembly", "Assembly changed. Assemble again to refresh the binary bytes.");
  });

  elements.pyInput.addEventListener("input", () => {
    setCompileStatus("good", "Editing Python-like", "Python-like source changed. Compile again to refresh the C-like, assembly, and binary layers.");
  });

  elements.cInput.addEventListener("input", () => {
    setCompileStatus("good", "Editing C-like", "C-like source changed. Compile again to refresh the assembly and binary.");
  });

  elements.speedLabel.value = getRunProfile().label;
  setCompileStatus("good", "Idle", "Write assembly, then compile or compile-and-load.");
  renderAssemblyResult(null);
  syncByteInputsFromSelection();
  renderAll();
  loadSample(samplePrograms[0], false);
  compilePy("load");
}

bootUi();
